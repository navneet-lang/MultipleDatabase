"""
apps/shops/serializers.py
"""

from rest_framework import serializers

from apps.shops.models import Shop


class ShopSerializer(serializers.ModelSerializer):
    """Normal users ke liye — basic shop info."""

    owner_username = serializers.CharField(source="owner.username", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True, write_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            "id",
            "name",
            "description",
            "address",
            "latitude",
            "longitude",
            "image",
            "image_url",
            "gst_number",
            "is_active",
            "owner_username",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "owner_username", "created_at"]


    def validate_latitude(self, value):
        if value is not None and not -90 <= value <= 90:
            raise serializers.ValidationError(
                "Latitude -90 se 90 ke beech hona chahiye."
            )
        return value

    def validate_longitude(self, value):
        if value is not None and not -180 <= value <= 180:
            raise serializers.ValidationError(
                "Longitude -180 se 180 ke beech hona chahiye."
            )
        return value

    def validate_image(self, value):
        if value is None:
            return value
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Shop image 2 MB se chhoti honi chahiye.")
        if getattr(value.image, "format", None) not in {"JPEG", "PNG", "WEBP"}:
            raise serializers.ValidationError("Sirf JPG, PNG ya WEBP image allowed hai.")
        return value

    def get_image_url(self, shop):
        if not shop.image:
            return None
        image_url = shop.image.url
        request = self.context.get("request")
        return request.build_absolute_uri(image_url) if request else image_url


class AdminShopSerializer(ShopSerializer):
    """Admin ke liye — owner ka email/role bhi dikhega."""

    owner_email = serializers.CharField(source="owner.email", read_only=True)
    owner_role = serializers.CharField(source="owner.role", read_only=True)

    class Meta(ShopSerializer.Meta):
        fields = ShopSerializer.Meta.fields + ["owner_email", "owner_role"]