"""
apps/products/serializers.py

Plain DRF Serializer — koi Django Model nahi hai (Mongo mein data hai),
isliye ModelSerializer use nahi kar rahe, sirf validation ke liye.
"""
from decimal import Decimal
from rest_framework import serializers


class ProductSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    category = serializers.CharField(max_length=100)
    stock = serializers.IntegerField(min_value=0, default=0)
    shop_id = serializers.IntegerField()

    # Category ke hisaab se extra fields flexible rakhne ke liye
    # (jaise size/color kapdo mein, warranty electronics mein)
    extra_fields = serializers.DictField(required=False, default=dict)


class ProductUpdateSerializer(serializers.Serializer):
    """
    Update ke liye — sab fields optional hain (partial update allow karta hai).
    """

    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False)
    category = serializers.CharField(max_length=100, required=False)
    stock = serializers.IntegerField(min_value=0, required=False)
    extra_fields = serializers.DictField(required=False)


class ReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")



class ProductListQuerySerializer(serializers.Serializer):
    """GET /api/products/ ke query params ki validation."""

    q = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False)
    shop_id = serializers.IntegerField(required=False)
    price_min = serializers.FloatField(required=False, min_value=0)
    price_max = serializers.FloatField(required=False, min_value=0)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50, default=10)

    def validate(self, attrs):
        price_min = attrs.get("price_min")
        price_max = attrs.get("price_max")
        if price_min is not None and price_max is not None and price_min > price_max:
            raise serializers.ValidationError("price_min, price_max se bada nahi ho sakta.")
        return attrs

