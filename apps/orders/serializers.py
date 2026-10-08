from rest_framework import serializers

from apps.orders.models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product_id", "shop_id", "name",
            "price", "quantity", "line_total", "status",
        ]

    def get_line_total(self, obj):
        return float(obj.price * obj.quantity)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "username",
            "status",
            "total_amount",
            "address",
            "items",
            "created_at",
        ]


class SellerOrderItemSerializer(serializers.ModelSerializer):
    """Seller ko dikhne wala item: buyer ka username aur delivery address, email nahi (privacy)."""

    order_id = serializers.IntegerField(source="order.id", read_only=True)
    buyer_username = serializers.CharField(source="order.user.username", read_only=True)
    address = serializers.CharField(source="order.address", read_only=True)
    order_created_at = serializers.DateTimeField(source="order.created_at", read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order_id",
            "buyer_username",
            "address",
            "product_id",
            "shop_id",
            "name",
            "price",
            "quantity",
            "line_total",
            "status",
            "order_created_at",
        ]

    def get_line_total(self, obj):
        return float(obj.price * obj.quantity)