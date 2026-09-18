from django.db import IntegrityError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.shops.models import Shop
from apps.shops.serializers import AdminShopSerializer, ShopSerializer
from core.permissions import HasRole





class ShopListCreateView(APIView):
    """
        GET  /api/shops/   -> role ke hisab se :
                            -seller:sirf apin shops, -user/admin:sarri active shops(admin ko extra fields)
        POST /api/shops/   -> nayi shop banao (sirf seller/admin)
        """

    def get_permissions(self):
        if self.request.method == "POST":
            return[IsAuthenticated(), HasRole()]
        return[IsAuthenticated()]

    #hasRole ko allowd_roles chahiya - attribute se milega 
    allowed_roles = ["seller","admin"]


    def get(self, request):
        role = getattr(request.user, "role", None)

        if role == "seller":
            shops = Shop.objects.filter(owner=request.user)
            serializer =ShopSerializer(shops, many=True)
            return Response(serializer.data)

        shops = Shop.objects.filter(is_active = True)
        serializer_class = AdminShopSerializer if role == "admin" else ShopSerializer
        serializer = serializer_class(shops, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ShopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        gst_number = serializer.validated_data.get("gst_number")
        if gst_number and Shop.objects.filter(gst_number=gst_number).exists():
            return Response(
                {"detail": f"A shop with GST number '{gst_number}' already exists ."},
                status=400,
            )


        try: 
            serializer.save(owner= request.user)
        except IntegrityError:
            # Race condition fallback — do requests same waqt aa jayein to bhi
            # DB-level unique constraint crash na kare, clean error de.
            return Response(
                {"detail":f"A shop GST number '{gst_number}'already exists"},
                status=400,
            )
        return Response(serializer.data,status=201)


class ShopDetailView(APIView):
    """
    GET    /api/shops/<id>/   -> ek shop ki detail (admin ko extra fields)
    DELETE /api/shops/<id>/   -> shop delete karo (owner khud, ya admin)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            shop = Shop.objects.get(pk=pk, is_active=True)
        except Shop.DoesNotExist:
            return Response({"detail": "Shop not found."}, status=404)

        is_admin = getattr(request.user, "role", None) == "admin"
        serializer_class = AdminShopSerializer if is_admin else ShopSerializer
        serializer = serializer_class(shop)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            shop = Shop.objects.get(pk=pk)
        except Shop.DoesNotExist:
            return Response({"detail": "Shop not found."}, status=404)

        is_owner = shop.owner_id == request.user.id
        is_admin = getattr(request.user, "role", None) == "admin"

        if not (is_owner or is_admin):
            return Response(
                {"detail": "You do not have permission to delete this shop."},
                status=403,
            )

        shop.delete()
        return Response({"detail": f"Shop '{shop.name}' deleted successfully."}, status=200)



