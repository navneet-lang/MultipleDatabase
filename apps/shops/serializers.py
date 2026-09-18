"""
apps/shops/serializers.py
"""

from rest_framework import serializers

from apps.shops.models import Shop


class ShopSerializer(serializers.ModelSerializer):
    """Normal users ke liye — basic shop info."""

    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Shop
        fields = [
            "id",
            "name",
            "description",
            "address",
            "gst_number",
            "is_active",
            "owner_username",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "owner_username", "created_at"]


class AdminShopSerializer(ShopSerializer):
    """Admin ke liye — owner ka email/role bhi dikhega."""

    owner_email = serializers.CharField(source="owner.email", read_only=True)
    owner_role = serializers.CharField(source="owner.role", read_only=True)

    class Meta(ShopSerializer.Meta):
        fields = ShopSerializer.Meta.fields + ["owner_email", "owner_role"]