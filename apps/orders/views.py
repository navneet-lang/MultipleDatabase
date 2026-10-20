"""
apps/orders/views.py

Checkout, order history, admin status update, aur seller order management.
"""

import logging

from bson import ObjectId
from bson.decimal128 import Decimal128
from django.db import transaction
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from pymongo.errors import PyMongoError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import CartItem
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import OrderSerializer, SellerOrderItemSerializer
from apps.orders.tasks import (
    send_order_confirmation_email,
    send_order_item_status_email,
    send_order_status_update_email,
)
from apps.products.cache import invalidate_product
from apps.shops.models import Shop
from core.mongo import get_mongo_db
from core.permissions import HasRole

logger = logging.getLogger(__name__)

FINAL_ITEM_STATUSES = {"delivered", "cancelled"}
SELLER_ALLOWED_STATUSES = ["confirmed", "shipped", "delivered", "cancelled"]
RESTOCKED_ITEM_IDS_FIELD = "_restocked_order_item_ids"


class InventoryRestockError(Exception):
    pass


def restock_cancelled_item(db, item):
    """Restore stock once per order item, including when cancellation is retried."""
    if not ObjectId.is_valid(item.product_id):
        raise InventoryRestockError(
            f"Cannot restore stock for invalid product ID on order item {item.id}."
        )

    product_id = ObjectId(item.product_id)
    restock_key = str(item.id)
    result = db.products.update_one(
        {
            "_id": product_id,
            RESTOCKED_ITEM_IDS_FIELD: {"$ne": restock_key},
        },
        {
            "$inc": {"stock": item.quantity},
            "$addToSet": {RESTOCKED_ITEM_IDS_FIELD: restock_key},
        },
    )
    if result.modified_count:
        return

    product = db.products.find_one(
        {"_id": product_id},
        {RESTOCKED_ITEM_IDS_FIELD: 1},
    )
    if product is None:
        raise InventoryRestockError(
            f"Product for order item {item.id} no longer exists; stock was not restored."
        )
    if restock_key not in product.get(RESTOCKED_ITEM_IDS_FIELD, []):
        raise InventoryRestockError(
            f"Stock could not be restored for order item {item.id}."
        )


def clear_restock_markers(db, items):
    for item in items:
        try:
            db.products.update_one(
                {"_id": ObjectId(item.product_id)},
                {"$pull": {RESTOCKED_ITEM_IDS_FIELD: str(item.id)}},
            )
        except PyMongoError:
            logger.exception(
                "Could not clear inventory restock marker for order item %s",
                item.id,
            )


def paginate_queryset(request, qs, serializer_cls, max_limit=50):
    """?page=1&limit=10 -> {count, page, limit, total_pages, results}"""
    try:
        page = max(int(request.query_params.get("page", 1)), 1)
        limit = min(max(int(request.query_params.get("limit", 10)), 1), max_limit)
    except ValueError:
        page, limit = 1, 10

    total = qs.count()
    start = (page - 1) * limit
    rows = qs[start:start + limit]
    return {
        "count": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total else 0,
        "results": serializer_cls(rows, many=True).data,
    }


class BuyerOrderCancelView(APIView):
    """
    PATCH /api/orders/<id>/cancel/
    Buyer apne order ke sirf 'pending' items cancel kar sakta hai.
    Cancel hone par stock wapas Mongo mein jata hai.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=404)

        try:
            with transaction.atomic():
                items = list(order.items.select_for_update().filter(status="pending"))
                if not items:
                    return Response(
                        {"detail": "No pending items available to cancel."},
                        status=400,
                    )

                db = get_mongo_db()
                for item in items:
                    restock_cancelled_item(db, item)

                for item in items:
                    item.status = "cancelled"
                    item.save(update_fields=["status"])
                order.recompute_status()
        except InventoryRestockError as exc:
            return Response({"detail": str(exc)}, status=409)
        except PyMongoError:
            logger.exception("Inventory restock failed for order %s", order.id)
            return Response(
                {"detail": "Inventory service is unavailable. Please retry cancellation."},
                status=503,
            )

        for item in items:
            invalidate_product(item.product_id)
        clear_restock_markers(db, items)

        try:
            send_order_status_update_email.delay(
                order.id, order.user.email, order.user.username, order.status
            )
        except Exception:
            logger.exception("Cancel email queue nahi ho paya (order %s)", order.id)

        return Response(OrderSerializer(order).data)


class SellerSummaryView(APIView):
    """
    GET /api/orders/seller/summary/
    Cancelled items sales mein count nahi hote.
    """

    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["seller", "admin"]

    def get(self, request):
        shops = Shop.objects.filter(is_active=True)
        if getattr(request.user, "role", None) != "admin":
            shops = shops.filter(owner=request.user)

        shop_names = dict(shops.values_list("id", "name"))
        items = OrderItem.objects.filter(shop_id__in=list(shop_names.keys()))

        line_total = ExpressionWrapper(
            F("price") * F("quantity"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        valid = items.exclude(status="cancelled")

        per_shop = (
            valid.values("shop_id")
            .annotate(revenue=Sum(line_total), items_sold=Sum("quantity"))
            .order_by("-revenue")
        )
        total_sales = valid.aggregate(t=Sum(line_total))["t"] or 0
        delivered_sales = (
            items.filter(status="delivered").aggregate(t=Sum(line_total))["t"] or 0
        )

        return Response(
            {
                "pending_items": items.filter(status="pending").count(),
                "total_orders": items.values("order_id").distinct().count(),
                "total_sales": float(total_sales),
                "delivered_sales": float(delivered_sales),
                "shops": [
                    {
                        "shop_id": r["shop_id"],
                        "shop_name": shop_names.get(r["shop_id"], ""),
                        "revenue": float(r["revenue"] or 0),
                        "items_sold": r["items_sold"] or 0,
                    }
                    for r in per_shop
                ],
            }
        )


class CheckoutView(APIView):
    """
    POST /api/orders/checkout/
    Body: {"address": "..."}
    Cart ki saari items se ek Order banata hai.
    Stock atomic tareeke se reserve hota hai (race condition safe).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart_items = CartItem.objects.filter(user=request.user)
        if not cart_items.exists():
            return Response({"detail": "Cart is empty."}, status=400)

        address = (request.data.get("address") or "").strip()
        if not address:
            return Response({"detail": "Delivery address is required."}, status=400)

        db = get_mongo_db()
        active_shop_ids = set(
            Shop.objects.filter(is_active=True).values_list("id", flat=True)
        )

        # Step 1: products fetch + quick stock verify (hamesha Mongo se, cache se nahi)
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

            if product.get("shop_id") not in active_shop_ids:
                return Response(
                    {
                        "detail": f"'{product.get('name')}' ki shop ab available nahi hai. "
                        "Cart se hata do."
                    },
                    status=400,
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

        # Step 2: stock reserve karo (atomic: stock >= qty ho tabhi ghatega)
        reserved = []

        def rollback():
            for r in reserved:
                db.products.update_one(
                    {"_id": r["object_id"]}, {"$inc": {"stock": r["quantity"]}}
                )
                invalidate_product(r["product_id"])

        for item in line_items:
            res = db.products.update_one(
                {"_id": item["object_id"], "stock": {"$gte": item["quantity"]}},
                {"$inc": {"stock": -item["quantity"]}},
            )
            if res.modified_count == 0:
                rollback()
                return Response(
                    {"detail": f"'{item['name']}' ka stock ab kam hai, cart check karo."},
                    status=400,
                )
            reserved.append(item)

        # Step 3: Order + OrderItems (atomic transaction)
        total_amount = sum(i["price"] * i["quantity"] for i in line_items)
        try:
            with transaction.atomic():
                order = Order.objects.create(
                    user=request.user,
                    total_amount=total_amount,
                    address=address,
                )
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
        except Exception:
            rollback()
            raise

        # Step 4: cache invalidate (stock badla hai)
        for item in line_items:
            invalidate_product(item["product_id"])

        # Step 5: confirmation email (Celery background)
        try:
            send_order_confirmation_email.delay(
                order.id, request.user.email, request.user.username, str(order.total_amount)
            )
        except Exception:
            logger.exception("Order confirmation email queue nahi ho paya (order %s)", order.id)

        return Response(OrderSerializer(order).data, status=201)


class OrderListView(APIView):
    """
    GET /api/orders/?page=1&limit=10   -> user ki order history (paginated)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = (
            Order.objects.filter(user=request.user)
            .prefetch_related("items")
            .order_by("-created_at")
        )
        return Response(paginate_queryset(request, orders, OrderSerializer))


class OrderDetailView(APIView):
    """
    GET   /api/orders/<id>/   -> order detail (khud ka ya admin)
    PATCH /api/orders/<id>/   -> admin: order ke non-final items ka status badlo
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

        return Response(OrderSerializer(order).data)

    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=404)

        is_admin = getattr(request.user, "role", None) == "admin" or request.user.is_staff
        if not is_admin:
            return Response({"detail": "Only admins can update the order status."}, status=403)

        new_status = request.data.get("status")
        valid_statuses = [choice[0] for choice in Order.Status.choices]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Choose from: {valid_statuses}"}, status=400
            )

        if new_status == "cancelled":
            return Response(
                {"detail": "Cancel item-level route se karo (stock restock ke liye): "
                           "PATCH /api/orders/seller/items/<item_id>/status/"},
                status=400,
            )

        with transaction.atomic():
            order.items.exclude(status__in=FINAL_ITEM_STATUSES).update(status=new_status)
            order.recompute_status()

        try:
            send_order_status_update_email.delay(
                order.id, order.user.email, order.user.username, order.status
            )
        except Exception:
            logger.exception("Status email queue nahi ho paya (order %s)", order.id)

        return Response(OrderSerializer(order).data)


class SellerOrderItemListView(APIView):
    """
    GET /api/orders/seller/items/?status=pending&page=1&limit=10
    Admin ko saare items dikhte hain.
    """

    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["seller", "admin"]

    def get(self, request):
        items = OrderItem.objects.select_related("order", "order__user")

        if getattr(request.user, "role", None) != "admin":
            shop_ids = Shop.objects.filter(owner=request.user).values_list("id", flat=True)
            items = items.filter(shop_id__in=list(shop_ids))

        status_filter = request.query_params.get("status")
        if status_filter:
            items = items.filter(status=status_filter)

        items = items.order_by("-order__created_at")
        return Response(paginate_queryset(request, items, SellerOrderItemSerializer))


class SellerOrderItemStatusView(APIView):
    """
    PATCH /api/orders/seller/items/<item_id>/status/
    Body: {"status": "shipped"}
    Sirf us item ki shop ka owner (ya admin) status badal sakta hai.
    """

    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["seller", "admin"]

    def patch(self, request, item_id):
        db = None
        try:
            with transaction.atomic():
                item = (
                    OrderItem.objects.select_for_update()
                    .select_related("order", "order__user")
                    .get(pk=item_id)
                )
                is_admin = getattr(request.user, "role", None) == "admin"
                owns_shop = Shop.objects.filter(
                    id=item.shop_id, owner=request.user
                ).exists()
                if not (is_admin or owns_shop):
                    return Response(
                        {"detail": "You can only update items from your own shop."},
                        status=403,
                    )

                new_status = request.data.get("status")
                if new_status not in SELLER_ALLOWED_STATUSES:
                    return Response(
                        {"detail": f"Invalid status. Choose from: {SELLER_ALLOWED_STATUSES}"},
                        status=400,
                    )

                if item.status in FINAL_ITEM_STATUSES:
                    return Response(
                        {"detail": f"Item already '{item.status}', it cannot be changed."},
                        status=400,
                    )

                if new_status == "cancelled":
                    if item.status not in {"pending", "confirmed"}:
                        return Response(
                            {"detail": "A shipped order item cannot be cancelled."},
                            status=400,
                        )
                    db = get_mongo_db()
                    restock_cancelled_item(db, item)

                item.status = new_status
                item.save(update_fields=["status"])
                item.order.recompute_status()
        except OrderItem.DoesNotExist:
            return Response({"detail": "Order item not found."}, status=404)
        except InventoryRestockError as exc:
            return Response({"detail": str(exc)}, status=409)
        except PyMongoError:
            logger.exception("Inventory restock failed for order item %s", item_id)
            return Response(
                {"detail": "Inventory service is unavailable. Please retry cancellation."},
                status=503,
            )

        if new_status == "cancelled":
            invalidate_product(item.product_id)
            clear_restock_markers(db, [item])

        try:
            send_order_item_status_email.delay(
                item.order_id,
                item.order.user.email,
                item.order.user.username,            
                item.name,
                new_status,
            )
        except Exception:
            logger.exception("Item status email queue nahi ho paya (item %s)", item.id)

        return Response(SellerOrderItemSerializer(item).data) 


 



   

      