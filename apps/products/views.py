"""
apps/products/views.py

Manual pymongo CRUD — koi ORM/ODM nahi. core/mongo.py se connection
milta hai, saare operations yahan direct MongoDB collection pe hote hain.
"""

from bson import ObjectId
from bson.errors import InvalidId
from bson.decimal128 import Decimal128
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime, timezone

from apps.shops.models import Shop
from apps.products.serializers import ProductSerializer, ProductUpdateSerializer
from core.mongo import get_mongo_db
from core.permissions import HasRole
from apps.orders.models import OrderItem
from apps.products.serializers import ProductSerializer, ProductUpdateSerializer,ReviewSerializer
 

def serialize_product(doc):
    """Mongo document ko JSON-safe dict mein convert karta hai."""
    doc["id"] = str(doc.pop("_id"))
    if isinstance(doc.get("price"), Decimal128):
        doc["price"] = float(doc["price"].to_decimal())
    return doc


class ProductListCreateView(APIView):
    """
    GET  /api/products/   -> saare products list (sabko, filter: shop_id, category)
    POST /api/products/   -> naya product add (sirf seller/admin, apni shop ka)
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), HasRole()]
        return [IsAuthenticated()]

    allowed_roles = ["seller", "admin"]

    def get(self, request):
        db = get_mongo_db()
        query = {}

        shop_id = request.query_params.get("shop_id")
        if shop_id:
            try:
                query["shop_id"] = int(shop_id)
            except ValueError:
                return Response({"detail": "shop_id must be an integer."}, status=400)

        category = request.query_params.get("category")
        if category:
            query["category"] = category

        products = list(db.products.find(query))
        return Response([serialize_product(p) for p in products])

    def post(self, request):
        serializer = ProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            shop = Shop.objects.get(id=data["shop_id"], is_active=True)
        except Shop.DoesNotExist:
            return Response({"detail": "Invalid shop_id — shop does not exist."}, status=400)

        is_admin = getattr(request.user, "role", None) == "admin"
        if shop.owner_id != request.user.id and not is_admin:
            return Response(
                {"detail": "You can only add products to your own shop."}, status=403
            )

        db = get_mongo_db()
        document = {
            "name": data["name"],
            "description": data.get("description", ""),
            "price": float(data["price"]),
            "category": data["category"],
            "stock": data.get("stock", 0),
            "shop_id": data["shop_id"],
            "extra_fields": data.get("extra_fields", {}),
        }

        result = db.products.insert_one(document)
        document["id"] = str(result.inserted_id)
        document.pop("_id", None)

        return Response(document, status=201)


class ProductDetailView(APIView):
    """
    GET    /api/products/<id>/   -> ek product ki detail
    PUT    /api/products/<id>/   -> product update (sirf shop ka owner ya admin)
    DELETE /api/products/<id>/   -> product delete (sirf shop ka owner ya admin)
    """

    permission_classes = [IsAuthenticated]

    def _get_product_or_404(self, db, pk):
        try:
            object_id = ObjectId(pk)
        except InvalidId:
            return None
        return db.products.find_one({"_id": object_id})

    def _check_ownership(self, request, product):
        """Product jis shop ka hai, uska owner khud ya admin hi edit/delete kar sake."""
        try:
            shop = Shop.objects.get(id=product["shop_id"])
        except Shop.DoesNotExist:
            return False
        is_admin = getattr(request.user, "role", None) == "admin"
        return shop.owner_id == request.user.id or is_admin

    def get(self, request, pk):
        db = get_mongo_db()
        product = self._get_product_or_404(db, pk)
        if product is None:
            return Response({"detail": "Product not found."}, status=404)
        return Response(serialize_product(product))

    def patch(self, request, pk):
        db = get_mongo_db()
        product = self._get_product_or_404(db, pk)
        if product is None:
            return Response({"detail": "Product not found."}, status=404)

        if not self._check_ownership(request, product):
            return Response(
                {"detail": "You do not have permission to edit this product."}, status=403
            )

        serializer = ProductUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_data = serializer.validated_data

        if "price" in update_data:
            update_data["price"] = float(update_data["price"])

        if update_data:
            db.products.update_one({"_id": product["_id"]}, {"$set": update_data})

        updated_product = db.products.find_one({"_id": product["_id"]})
        return Response(serialize_product(updated_product))


    def put(self, request, pk):
        db = get_mongo_db()
        product = self._get_product_or_404(db, pk)
        if product is None:
            return Response({"detail": "Product not found."}, status=404)

        if not self._check_ownership(request, product):
            return Response(
                {"detail": "You do not have permission to edit this product."}, status=403
            )

        # PUT = poori resource replace karo, isliye saari required fields chahiye
        serializer = ProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_data = {
            "name": data["name"],
            "description": data.get("description", ""),
            "price": float(data["price"]),
            "category": data["category"],
            "stock": data.get("stock", 0),
            "extra_fields": data.get("extra_fields", {}),
        }

        db.products.update_one({"_id": product["_id"]}, {"$set": update_data})

        updated_product = db.products.find_one({"_id": product["_id"]})
        return Response(serialize_product(updated_product))

    def delete(self, request, pk):
        db = get_mongo_db()
        product = self._get_product_or_404(db, pk)
        if product is None:
            return Response({"detail": "Product not found."}, status=404)

        if not self._check_ownership(request, product):
            return Response(
                {"detail": "You do not have permission to delete this product."}, status=403
            )

        db.products.delete_one({"_id": product["_id"]})
        return Response({"detail": f"Product '{product['name']}' deleted successfully."})


class ProductReviewView(APIView):
    """
        GET  /api/products/<id>/reviews/   -> embedded reviews array dikhata hai
        POST /api/products/<id>/reviews/   -> naya review add (sirf jisne khareeda ho)
        """

    permission_classes = [IsAuthenticated]


    def get(self, request, pk):
        db = get_mongo_db()
        try:
            object_id = ObjectId(pk)
        except InvalidId:
            return Response({"detail": "Invalid product id."}, status=400)

        product = db.products.find_one({"_id": object_id}, {"reviews": 1})
        if product is None:
            return Response({"detail" : "product not found ."}, status=404)
        return Response(product.get("revies", []))

    def post(self, request,pk):
        db = get_mongo_db()
        try:
            object_id = ObjectId(pk)
        except InvalidId:
            return Response({"detail":"Invalid product id."}, status=400)

        product =db.products.find_one({"_id":object_id})
        if product is None:
            return Response({"detail":"product not found ."}, status=404)

         # Sirf jisne ye product actually khareeda ho wahi review de sake

        has_purchased = OrderItem.objects.filter(
            order__user= request.user, product_id=pk
        ).exists()
        if not has_purchased:
            return Response(
                {"detail":"you can only review product you have purchased"}, status=403
            )

            # Ek user sirf ek hi baar review de sake
        existing_reviews = product.get("reviews",[])
        if any(r.get("user_id")== request.user.id for r in existing_reviews):
            return Response({"detail":"You have already reviewed this product"}, status=400)

        serialize = ReviewSerializer(data = request.data)
        serialize.is_valid(raise_exception=True)
        data = serialize.validated_data

        review = {
            "user_id": request.user.id,
            "username":request.user.username,
            "rating":data["rating"],
            "comment":data.get("comment", ""),
            "created_at":datetime.now(timezone.utc).isoformat(),

        }
         # $push — embedded array mein naya document add karta hai

        db.products.update_one(
            {"_id":object_id},
            {"$push": {"reviews": review}},
        )

        return Response({"detail":"Review added.","review":review }, status=201)


class ProductRatingView(APIView):
      """
        GET /api/products/<id>/rating/
        Aggregation pipeline se average rating + review count nikalta hai —
        calculation database ke andar hoti hai, Python mein loop nahi lagana padta.
        """

      permission_classes = [IsAuthenticated]

      def get(self, request, pk):
          db = get_mongo_db()
          try:
              object_id =ObjectId(pk)
          except InvalidId:
              return Response({"detail":"Invalid product id ."}, status=400)

          pipeline = [
              {"$match":{"_id":  object_id}}, # sirf ye product
              {"$unwind":"$reviews"}, #reviews array ko flatten karo

              {
                  "$group":{
                      "_id":"$_id",
                      "average_rating":{"$avg": "$reviews.rating"},
                      "review_count": {"$sum":1},          
                  }
              },
              
          ]

          result = list(db.products.aggregate(pipeline))
          if not result:
              return Response({"average_rating" : None, "review_count":0})

          return Response(
              {
                  "average_rating":round(result[0]["average_rating"], 2),
                  "review_count":result[0]["review_count"],
              }
          )
          

      
      

    