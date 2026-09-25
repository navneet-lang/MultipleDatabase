"""
apps/orders/views.py

Checkout: Cart (Postgres) + live product data (Mongo) padh ke Order
banata hai, Mongo mein stock kam karta hai, cart clear karta hai.
Poora Postgres wala hissa ek transaction mein hota hai — beech mein
kuch fail ho to sab rollback ho jaayega.
"""

from bson import ObjectId
from bson.decimal128 import Decimal128
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import CartItem
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import OrderSerializer
from apps.orders.tasks import send_order_confirmation_email, send_order_status_update_email
from core.mongo import get_mongo_db


class CheckoutView(APIView):
    """
    POST /api/orders/checkout/
    Cart ki saari items se ek Order banata hai.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart_items = CartItem.objects.filter(user=request.user)
        if not cart_items.exists():
            return Response({"detail": "Cart is empty."}, status=400)

        db = get_mongo_db()

        # Step 1: Saare products fetch karo aur stock verify karo
        line_items = []
        for cart_item in cart_items:
            try:
                object_id = ObjectId(cart_item.product_id)
            except Exception:
                return Response(
                    {"detail": f"Invalid product in cart: {cart_item.product_id}"}, status=400
                )

            product = db.products.find_one({"_id": object_id})
            if product is None:
                return Response(
                    {"detail": f"Product no longer available: {cart_item.product_id}"}, status=400
                )

            if product.get("stock", 0) < cart_item.quantity:
                return Response(
                    {
                        "detail": f"Insufficient stock for '{product.get('name')}'. "
                        f"Available: {product.get('stock', 0)}, requested: {cart_item.quantity}."
                    },
                    status=400,
                )

            price = product.get("price")
            if isinstance(price, Decimal128):
                price = float(price.to_decimal())

            line_items.append(
                {
                    "product_id": cart_item.product_id,
                    "shop_id": product.get("shop_id"),
                    "name": product.get("name"),
                    "price": price,
                    "quantity": cart_item.quantity,
                    "object_id": object_id,
                }
            )

        # Step 2: Order + OrderItems create karo (atomic transaction)
        total_amount = sum(item["price"] * item["quantity"] for item in line_items)

        with transaction.atomic():
            order = Order.objects.create(user=request.user, total_amount=total_amount)
            for item in line_items:
                OrderItem.objects.create(
                    order=order,
                    product_id=item["product_id"],
                    shop_id=item["shop_id"],
                    name=item["name"],
                    price=item["price"],
                    quantity=item["quantity"],
                )
            cart_items.delete()

        # Step 3: Mongo mein stock update karo
        for item in line_items:
            db.products.update_one(
                {"_id": item["object_id"]},
                {"$inc": {"stock": -item["quantity"]}},
            )

        # Step 4: Celery background email trigger
        send_order_confirmation_email.delay(
            order.id, request.user.email, request.user.username, str(order.total_amount)
        )

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=201)


class OrderListView(APIView):
    """
    GET /api/orders/   -> User order history
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).order_by("-created_at")
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)


class OrderDetailView(APIView):
    """
    GET   /api/orders/<id>/   -> Single order detail
    PATCH /api/orders/<id>/   -> Update order status (Admin only)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=404)

        is_admin = getattr(request.user, "role", None) == "admin" or request.user.is_staff
        if order.user_id != request.user.id and not is_admin:
            return Response(
                {"detail": "You do not have permission to view this order."}, status=403
            )

        serializer = OrderSerializer(order)
        return Response(serializer.data)

    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=404)

        is_admin = getattr(request.user, "role", None) == "admin" or request.user.is_staff
        if not is_admin:
            return Response({"detail": "Only admins can update the order status."}, status=403)

        new_status = request.data.get("status")
        if not new_status:
            return Response({"detail": "Status field is required."}, status=400)

        valid_statuses = [choice[0] for choice in Order.Status.choices]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Choose from: {valid_statuses}"}, status=400
            )

        order.status = new_status
        order.save()

        send_order_status_update_email.delay(
            order.id, order.user.email, order.user.username, new_status
        )

        serializer = OrderSerializer(order)
        return Response(serializer.data)