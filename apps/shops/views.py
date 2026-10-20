import math

from django.db import IntegrityError
from django.db.models import Count
from django.core.files.storage import default_storage
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.shops.models import Shop
from apps.shops.serializers import AdminShopSerializer, ShopSerializer
from core.permissions import HasRole

EDITABLE_SHOP_FIELDS = {
    "name", "description", "address", "gst_number", "latitude", "longitude", "image",
}


def delete_shop_image(image_name):
    if image_name:
        default_storage.delete(image_name)


class ShopListCreateView(APIView):
    """
    GET  /api/shops/   -> seller: apni active shops, user/admin: saari active shops
    POST /api/shops/   -> nayi shop banao (sirf seller/admin)
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), HasRole()]
        return [IsAuthenticated()]

    allowed_roles = ["seller", "admin"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        role = getattr(request.user, "role", None)

        if role == "seller":
            shops = Shop.objects.filter(owner=request.user, is_active=True)
            return Response(
                ShopSerializer(shops, many=True, context={"request": request}).data
            )

        shops = Shop.objects.filter(is_active=True)
        serializer_class = AdminShopSerializer if role == "admin" else ShopSerializer
        return Response(
            serializer_class(shops, many=True, context={"request": request}).data
        )

    def post(self, request):
        serializer = ShopSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        gst_number = serializer.validated_data.get("gst_number")
        if gst_number and Shop.objects.filter(gst_number=gst_number).exists():
            return Response(
                {"detail": f"A shop with GST number '{gst_number}' already exists."},
                status=400,
            )

        try:
            serializer.save(owner=request.user)
        except IntegrityError:
            return Response(
                {"detail": f"A shop with GST number '{gst_number}' already exists."},
                status=400,
            )
        return Response(serializer.data, status=201)


class ShopDetailView(APIView):
    """
    GET    /api/shops/<id>/   -> shop detail (admin ko extra fields)
    PATCH  /api/shops/<id>/   -> owner/admin: name, description, address, gst, lat/lng
    DELETE /api/shops/<id>/   -> owner/admin: soft delete (is_active=False)
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _get_active_shop(self, pk):
        try:
            return Shop.objects.get(pk=pk, is_active=True)
        except Shop.DoesNotExist:
            return None

    def _can_manage(self, request, shop):
        is_admin = getattr(request.user, "role", None) == "admin"
        return shop.owner_id == request.user.id or is_admin

    def get(self, request, pk):
        shop = self._get_active_shop(pk)
        if shop is None:
            return Response({"detail": "Shop not found."}, status=404)

        is_admin = getattr(request.user, "role", None) == "admin"
        serializer_class = AdminShopSerializer if is_admin else ShopSerializer
        return Response(serializer_class(shop, context={"request": request}).data)

    def patch(self, request, pk):
        shop = self._get_active_shop(pk)
        if shop is None:
            return Response({"detail": "Shop not found."}, status=404)

        if not self._can_manage(request, shop):
            return Response(
                {"detail": "You do not have permission to edit this shop."}, status=403
            )

        data = {k: v for k, v in request.data.items() if k in EDITABLE_SHOP_FIELDS}
        if not data:
            return Response(
                {"detail": f"Nothing to update. Allowed: {sorted(EDITABLE_SHOP_FIELDS)}"},
                status=400,
            )

        old_image_name = shop.image.name if shop.image else None
        serializer = ShopSerializer(
            shop, data=data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        try:
            updated_shop = serializer.save()
        except IntegrityError:
            return Response({"detail": "GST number already exists."}, status=400)
        if old_image_name and old_image_name != updated_shop.image.name:
            delete_shop_image(old_image_name)
        return Response(
            ShopSerializer(updated_shop, context={"request": request}).data
        )

    def delete(self, request, pk):
        shop = self._get_active_shop(pk)
        if shop is None:
            return Response({"detail": "Shop not found."}, status=404)

        if not self._can_manage(request, shop):
            return Response(
                {"detail": "You do not have permission to delete this shop."},
                status=403,
            )
        shop.is_active = False
        shop.save(update_fields=["is_active"])
        return Response({"detail": f"Shop '{shop.name}' deactivated."})


class FeaturedShopsView(APIView):
    """GET /api/shops/featured/?limit=6 — zyada orders wali active shops pehle."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.orders.models import OrderItem

        try:
            limit = min(max(int(request.query_params.get("limit", 6)), 1), 20)
        except ValueError:
            limit = 6

        counts = dict(
            OrderItem.objects.exclude(status="cancelled")
            .values("shop_id")
            .annotate(n=Count("id"))
            .values_list("shop_id", "n")
        )

        shops = list(Shop.objects.filter(is_active=True))
        shops.sort(key=lambda s: counts.get(s.id, 0), reverse=True)

        data = ShopSerializer(
            shops[:limit], many=True, context={"request": request}
        ).data
        for row in data:
            row["orders_count"] = counts.get(row["id"], 0)
        return Response(data)


def haversine_km(lat1, lng1, lat2, lng2):
    """Do points ke beech earth pe doori (km)."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class NearbyShopsView(APIView):
    """
    GET /api/shops/nearby/?lat=28.66&lng=77.43&radius_km=5&limit=20
    Radius ke andar ki active shops, nazdeek wali pehle, har ek ke saath distance_km.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response({"detail": "lat aur lng (numbers) zaroori hain."}, status=400)

        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return Response({"detail": "lat/lng ki range galat hai."}, status=400)

        try:
            radius = min(max(float(request.query_params.get("radius_km", 5)), 0.1), 100)
            limit = min(max(int(request.query_params.get("limit", 20)), 1), 50)
        except ValueError:
            radius, limit = 5.0, 20

        # Bounding box: pehle DB se kam shops chhaanto (1 degree lat ~ 111 km)
        dlat = radius / 111.0
        dlng = radius / (111.0 * max(math.cos(math.radians(lat)), 0.01))

        candidates = Shop.objects.filter(
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False,
            latitude__gte=lat - dlat,
            latitude__lte=lat + dlat,
            longitude__gte=lng - dlng,
            longitude__lte=lng + dlng,
        )

        results = []
        for shop in candidates:
            d = haversine_km(lat, lng, shop.latitude, shop.longitude)
            if d <= radius:
                results.append((d, shop))

        results.sort(key=lambda x: x[0])
        results = results[:limit]

        data = ShopSerializer(
            [s for _, s in results], many=True, context={"request": request}
        ).data
        for row, (d, _) in zip(data, results):
            row["distance_km"] = round(d, 2)

        return Response({"count": len(data), "radius_km": radius, "results": data})