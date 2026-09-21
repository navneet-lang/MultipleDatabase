from rest_framework import serializers

class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.CharField(max_length=24)
    quantity = serializers.IntegerField(min_value =1, default=1)

class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)