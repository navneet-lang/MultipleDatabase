from django.db import IntegrityError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.shops.models import Shop
from apps.shops.serializers import AdminShopSerializer, ShopSerializer
from core.permissions import HasRole

EDITABLE_SHOP_FIELDS ={"name" , "descriptions", "address","gst_number"}



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
    patch /api/shops/<id>/  -> owenr/admin: name, description, address, gst_number
    DELETE /api/shops/<id>/   ->owner/admin: soft delete (is_active=False)

    """

    permission_classes = [IsAuthenticated]


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
            return Response({"detail":"Shop not found."}, status=404)



        
        is_admin = getattr(request.user, "role", None) == "admin"
        serializer_class = AdminShopSerializer if is_admin else ShopSerializer
        
        return Response(serializer_class(shop).data)

    def patch(self, request, pk):
        shop = self ._get_active_shop(pk)
        if shop is None:
            return Response({"detail":"Shop not found"}, status=404)

        if not self._can_manage(request,shop):
            return Response(
                {"detail":"You do not have permission to edit this shop ."}, status=403
            )
         # Sirf allowed fields (owner / is_active client se kabhi nahi badlenge)

        data = {k: v for k, v in request.data.items()if k in EDITABLE_SHOP_FIELDS}
        if not data:
            return Response(
                {"detail" : f"Nothing to update . Allowed : {sorted(EDITABLE_SHOP_FIELDS)}"},
                status=400
            )
        serializer = ShopSerializer(shop, data= data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except InterruptedError:
            return Response({"detail": "GST number already exists."}, status=400)
        return Response(serializer.data)

    def delete(self, request, pk):
        shop = self._get_active_shop(pk)
        if shop is None:
            return Response({"detail": "Shop not found ."}, status=404)

        if not self._can_manage(request, shop):
            return Response(
                {"detail":"You do not have permission to detele this shop."},
                status=403
            )
        # Soft delete: purane order ka data bach rahe , products orpha na ho 
        shop.is_active= False
        shop.save(update_fields=["is_active"])
        return Response({"detail":f"Shop '{shop.name}' deactiveted."})
        
