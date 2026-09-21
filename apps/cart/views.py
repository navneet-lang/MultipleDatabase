"""
apps/cart/views.py

Cart PostgreSQL mein (CartItem model), lekin product ki detail (name,
price, stock) live MongoDB se fetch hoti hai — display ke waqt.
"""

from bson import ObjectId
from bson.errors import InvalidId
from bson.decimal128 import Decimal128
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import CartItem
from apps.cart.serializers import AddToCartSerializer, UpdateCartItemSerializer
from core.mongo import get_mongo_db


def get_product_snapshot(db, product_id):
    """Mongo se product ki current detail fetch karta hai (price live rahe)."""
    try:
        object_id = ObjectId(product_id)
    except InvalidId:
        return None

    product = db.products.find_one({"_id": object_id})
    if product is None:
        return None

    price = product.get("price")
    if isinstance(price, Decimal128):
        price = float(price.to_decimal())

    return {
        "product_id": str(product["_id"]),
        "name": product.get("name"),
        "price": price,
        "stock": product.get("stock", 0),
        "shop_id": product.get("shop_id"),
    }


class CartView(APIView):
    """
    GET  /api/cart/   -> apni cart ki saari items (live product info ke saath)
    POST /api/cart/   -> item add karo {product_id, quantity}
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        db = get_mongo_db()
        items = CartItem.objects.filter(user=request.user)

        cart_data = []
        total = 0.0
        for item in items:
            snapshot = get_product_snapshot(db, item.product_id)
            if snapshot is None:
                # Product delete ho chuka hai — cart se bhi hata do
                item.delete()
                continue

            line_total = snapshot["price"] * item.quantity
            total += line_total

            cart_data.append(
                {
                    "cart_item_id": item.id,
                    "product_id": snapshot["product_id"],
                    "name": snapshot["name"],
                    "price": snapshot["price"],
                    "quantity": item.quantity,
                    "line_total": line_total,
                    "shop_id": snapshot["shop_id"],
                }
            )

        return Response({"items": cart_data, "total": total})

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        db = get_mongo_db()
        snapshot = get_product_snapshot(db, data["product_id"])
        if snapshot is None:
            return Response({"detail": "Product not found."}, status=404)

        if snapshot["stock"] < data["quantity"]:
            return Response(
                {"detail": f"Only {snapshot['stock']} units available in stock."},
                status=400,
            )

        item, created = CartItem.objects.get_or_create(
            user=request.user,
            product_id=data["product_id"],
            defaults={"quantity": data["quantity"]},
        )
        if not created:
            item.quantity += data["quantity"]
            item.save()

        return Response(
            {"detail": "Added to cart.", "product_id": item.product_id, "quantity": item.quantity},
            status=201,
        )


class CartItemDetailView(APIView):
    """
    PATCH  /api/cart/<item_id>/   -> quantity update karo
    DELETE /api/cart/<item_id>/   -> item cart se hatao
    """

    permission_classes = [IsAuthenticated]

    def _get_item_or_404(self, request, item_id):
        try:
            return CartItem.objects.get(id=item_id, user=request.user)
        except CartItem.DoesNotExist:
            return None

    def patch(self, request, item_id):
        item = self._get_item_or_404(request, item_id)
        if item is None:
            return Response({"detail": "Cart item not found."}, status=404)

        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item.quantity = serializer.validated_data["quantity"]
        item.save()

        return Response({"detail": "Cart updated.", "quantity": item.quantity})

    def delete(self, request, item_id):
        item = self._get_item_or_404(request, item_id)
        if item is None:
            return Response({"detail": "Cart item not found."}, status=404)

        item.delete()
        return Response({"detail": "Item removed from cart."})


class ClearCartView(APIView):
    """
    DELETE /api/cart/clear/   -> poori cart khaali karo
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        CartItem.objects.filter(user=request.user).delete()
        return Response({"detail": "Cart cleared."})