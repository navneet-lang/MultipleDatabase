"""
aapps/products/serializers.py

Plain DRF Serializer - koi Django Model nahi hai (Mongo mein data hai),
isliye ModelSerializer use nahi kar rahe , sife validation ke liye.

"""

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
    description = serializers.CharField(required=False, allow_blank= True)
    price= serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    categrory= serializers.CharField(max_length=100, required=False)
    stock = serializers.IntegerField(min_value=0, required= False)
    extra_fields = serializers.DictField(required= False) 


