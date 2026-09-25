from rest_framework import serializers
from apps.orders.models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product_id", "shop_id", "name", "price", "quantity", "line_total"]

    # ISKO EK LEVEL PICHHE (LEFT) KARNA HAI, Meta ke barabar
    def get_line_total(self, obj):
        return obj.price * obj.quantity

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "username", "status", "total_amount", "items", "created_at"]


                   