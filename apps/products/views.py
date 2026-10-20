"""
apps/products/views.py

Manual pymongo CRUD — koi ORM/ODM nahi. core/mongo.py se connection
milta hai, saare operations yahan direct MongoDB collection pe hote hain
 to  ab ham isame ye add karnge like 
 curd+search/pagination + Redis cache
"""

import uuid
import math
import time
from datetime import timedelta
from django.db.models import Count, Sum
from bson import ObjectId
from bson.decimal128 import Decimal128
from bson.errors import InvalidId
from pymongo.errors import OperationFailure
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import OrderItem


from apps.products.cache import(
    get_cache_stats,
    get_cached_product,  # FIX: Spelling theek ki hai
    invalidate_product,
    reset_cache_stats,
    set_cached_product
)

from apps.products.serializers import (
    ProductListQuerySerializer,
    ProductSerializer,
    ProductUpdateSerializer,
    ReviewSerializer,
)
from apps.shops.models import Shop
from core.mongo import get_mongo_db
from core.permissions import HasRole
from django.utils import timezone

from django.conf import settings
from django.core.files.storage import default_storage
from PIL import Image
from  rest_framework.parsers import FormParser, MultiPartParser



def serialize_product(doc):
    """Mongo document ko JSON-safe dict mein convert karta hai."""
    doc["id"] = str(doc.pop("_id"))
    if isinstance(doc.get("price"), Decimal128):
        doc["price"] = float(doc["price"].to_decimal())
    return doc

def with_image_url(doc ,request):
    path = doc.get("image")
    doc["image_url"]  =  request.build_absolute_uri(path) if path else None
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
        params = ProductListQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        p = params.validated_data

        query = {}
        if p.get("shop_id") is not None:
            query["shop_id"] = p["shop_id"]
        if p.get("category"):
            query["category"] = p["category"]

        # FIX: Band (inactive) shops ke products hide karo
        inactive_ids = list(Shop.objects.filter(is_active=False).values_list("id", flat=True))
        if inactive_ids:
            if query.get("shop_id") in inactive_ids:
                return Response(
                    {
                        "count": 0,
                        "page": p["page"],
                        "limit": p["limit"],
                        "total_pages": 0,
                        "results": [],
                    }
                )
            if "shop_id" not in query:
                query["shop_id"] = {"$nin": inactive_ids}

        price_filter = {}
        if "price_min" in p:
            price_filter["$gte"] = p["price_min"]
        if "price_max" in p:
            price_filter["$lte"] = p["price_max"]
        if price_filter:
            query["price"] = price_filter

        # List mein reviews array nahi bhejte (heavy hota hai)
        projection = {"reviews": 0}
        search_text = p.get("q", "").strip()
        if search_text:
            query["$text"] = {"$search": search_text}
            projection["score"] = {"$meta": "textScore"}

        page, limit = p["page"], p["limit"]
        db = get_mongo_db()

        try:  
            total = db.products.count_documents(query)
            cursor = db.products.find(query, projection)
            if search_text:
                cursor = cursor.sort([("score", {"$meta": "textScore"})])  # best match pehle
            else:
                cursor = cursor.sort("_id", -1)  # newest pehle
            docs = list(cursor.skip((page - 1) * limit).limit(limit))
        except OperationFailure:
            return Response(
                {"detail": "Search index missing. Run: python manage.py ensure_mongo_indexes"},
                status=503,
            )

        for doc in docs:
            doc.pop("score", None)

        shop_ids = {d.get("shop_id") for d in docs if d.get("shop_id") is not None}
        shop_names = dict(Shop.objects.filter(id__in=shop_ids).values_list("id", "name"))
        for d in docs:
            d["shop_name"] = shop_names.get(d.get("shop_id"), "")

        return Response(
            {
                "count": total,
                "page": page,
                "limit": limit,
                "total_pages": math.ceil(total / limit) if total else 0,
                "results": [with_image_url(serialize_product(d), request) for d in docs],
            }
        )

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
    PATCH  /api/products/<id>/   -> kuch fields update (sirf shop ka owner ya admin)
    PUT    /api/products/<id>/   -> poora product replace (sirf shop ka owner ya admin)
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
        if not ObjectId.is_valid(pk):
            return Response({"detail":"Product not found"}, status=404)

        data = get_cached_product(pk)
        cache_status = "HIT"
        if data is None:
            db = get_mongo_db()
            product = self._get_product_or_404(db, pk)
            if product is None:
                return Response({"detail": "Product not found."}, status=404)
            data = serialize_product(product)
            set_cached_product(pk, data)
            cache_status = "MISS"

        shop = Shop.objects.filter(id=data.get("shop_id")).first()
        if shop is None:
            return Response({"detail": "Product not found."}, status=404)
        is_admin = getattr(request.user, "role", None) == "admin"
        if not shop.is_active and shop.owner_id != request.user.id and not is_admin:
            return Response({"detail": "Product not found."}, status=404)

        response = Response(with_image_url(dict(data), request))
        response["X-Cache"] = cache_status
        return response
        
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
            invalidate_product(pk)

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
        invalidate_product(pk)

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
        invalidate_product(pk)
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
            return Response({"detail": "Product not found."}, status=404)
        return Response(product.get("reviews", []))

    def post(self, request, pk):
        db = get_mongo_db()
        try:
            object_id = ObjectId(pk)
        except InvalidId:
            return Response({"detail": "Invalid product id."}, status=400)

        product = db.products.find_one({"_id": object_id})
        if product is None:
            return Response({"detail": "Product not found."}, status=404)

        # Sirf jisne ye product actually khareeda ho wahi review de sake
        has_purchased = OrderItem.objects.filter(
            order__user=request.user, product_id=pk
        ).exists()
        if not has_purchased:
            return Response(
                {"detail": "You can only review products you have purchased."}, status=403
            )

        # Ek user sirf ek hi baar review de sake
        existing_reviews = product.get("reviews", [])
        if any(r.get("user_id") == request.user.id for r in existing_reviews):
            return Response({"detail": "You have already reviewed this product."}, status=400)

        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        review = {
            "user_id": request.user.id,
            "username": request.user.username,
            "rating": data["rating"],
            "comment": data.get("comment", ""),
            "created_at": timezone.now().isoformat(),
        }

        # $push — embedded array mein naya document add karta hai
        db.products.update_one(
            {"_id": object_id},
            {"$push": {"reviews": review}},
        )
        invalidate_product(pk)

        return Response({"detail": "Review added.", "review": review}, status=201)


class ProductRatingView(APIView):
    """
    GET /api/products/<id>/rating/
    Aggregation pipeline se average rating + review count nikalta hai —
    calculation database ke andar hoti hai, Python mein loop nahi lagana padta.

    new one is a GET /api/products/<id>/rating/  -> aggregation pipeline se average rating
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        db = get_mongo_db()
        try:
            object_id = ObjectId(pk)
        except InvalidId:
            return Response({"detail": "Invalid product id."}, status=400)

        pipeline = [
            {"$match": {"_id": object_id}},  # sirf ye product
            {"$unwind": "$reviews"},  # reviews array ko flatten karo
            {
                "$group": {
                    "_id": "$_id",
                    "average_rating": {"$avg": "$reviews.rating"},
                    "review_count": {"$sum": 1},
                }
            },
        ]

        result = list(db.products.aggregate(pipeline))
        if not result:
            return Response({"average_rating": None, "review_count": 0})

        return Response(
            {
                "average_rating": round(result[0]["average_rating"], 2),
                "review_count": result[0]["review_count"],
            }
        )


class ProductCacheStatsView(APIView):
    """
    GET    /api/products/cache-stats/   -> hits, misses, hit ratio (sirf admin)
    DELETE /api/products/cache-stats/   -> counters reset (testing ke liye)
    """
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["admin"]

    def get(self, request):
        return Response(get_cache_stats())

    def delete(self, request):
        reset_cache_stats()
        return Response({"detail": "cache counters reset"})


class ProductCategoryListView(APIView):
    """
    GET /api/products/categories/
    Distinct categories + har category ke kitne products (filter sidebar ke liye).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        db = get_mongo_db()

        match = {}
        inactive_ids = list(Shop.objects.filter(is_active=False).values_list("id", flat=True))
        if inactive_ids:
            match["shop_id"] = {"$nin": inactive_ids}

        pipeline = [
            {"$match": match},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
        ]
        rows = db.products.aggregate(pipeline)
        return Response(
            [{"name": r["_id"], "count": r["count"]} for r in rows if r["_id"]]
        )



class ProductTrendingView(APIView):
    """
    GET /api/products/trending/?limit=8&days=30
    Rank: alag buyers > quantity. Cancelled items count nahi.
    Window mein kuch na mile to all-time bestsellers (fallback).
    """

    permission_classes = [IsAuthenticated]

    def _rank(self, since, limit):
        qs = OrderItem.objects.exclude(status="cancelled")
        if since:
            qs = qs.filter(order__created_at__gte=since)
        return list(
            qs.values("product_id")
            .annotate(
                buyers=Count("order__user", distinct=True),
                sold=Sum("quantity"),
            )
            .order_by("-buyers", "-sold")[: limit * 3]
        )

    def get(self, request):
        try:
            limit = min(max(int(request.query_params.get("limit", 8)), 1), 20)
            days = min(max(int(request.query_params.get("days", 30)), 1), 365)
        except ValueError:
            limit, days = 8, 30

        since = timezone.now() - timedelta(days=days)
        rows = self._rank(since, limit)
        fallback = False
        if not rows:
            rows = self._rank(None, limit)
            fallback = True

        stats = {r["product_id"]: r for r in rows}
        object_ids = [ObjectId(p) for p in stats if ObjectId.is_valid(p)]

        db = get_mongo_db()
        docs = list(db.products.find({"_id": {"$in": object_ids}}, {"reviews": 0}))

        active_shop_ids = set(
            Shop.objects.filter(is_active=True).values_list("id", flat=True)
        )
        shop_names = dict(Shop.objects.values_list("id", "name"))

        results = []
        for d in docs:
            if d.get("shop_id") not in active_shop_ids:
                continue
            pid = str(d["_id"])
            item = serialize_product(d)
            item["buyers"] = stats[pid]["buyers"]
            item["sold"] = stats[pid]["sold"]
            item["shop_name"] = shop_names.get(item.get("shop_id"), "")
            results.append(with_image_url(item, request))

        results.sort(key=lambda x: (x["buyers"], x["sold"]), reverse=True)
        response = Response(results[:limit])
        response["X-Trending-Fallback"] = "true" if fallback else "false"
        return response



MAX_IMAGE_BYTES = 2 * 1024 * 1024 # 2MB
IMAGE_EXT = {"JPEG": ".jpg","PNG":".png", "WEBP":".webp"}


def _delete_media(path):
    """/media/products/x.jpg -> storage se file hata do."""
    if path and path.startswith(settings.MEDIA_URL):
        default_storage.delete(path[len(settings.MEDIA_URL):])


class ProductImageView(APIView):
    """
    POST   /api/products/<id>/image/   form-data: image=<file>
    DELETE /api/products/<id>/image/
    Sirf shop ka owner ya admin. DB mein relative path save hota hai.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def _load(self, request, pk):
        if not ObjectId.is_valid(pk):
            return None, Response({"detail": "Product not found."}, status=404)
        db = get_mongo_db()
        product = db.products.find_one({"_id": ObjectId(pk)})
        if product is None:
            return None, Response({"detail": "Product not found."}, status=404)
        try:
            shop = Shop.objects.get(id=product["shop_id"])
        except Shop.DoesNotExist:
            return None, Response({"detail": "Shop not found."}, status=404)
        is_admin = getattr(request.user, "role", None) == "admin"
        if shop.owner_id != request.user.id and not is_admin:
            return None, Response({"detail": "Not your product."}, status=403)
        return (db, product), None

    def post(self, request, pk):
        loaded, err = self._load(request, pk)
        if err:
            return err
        db, product = loaded

        file = request.FILES.get("image")
        if file is None:
            return Response({"detail": "'image' file is required."}, status=400)
        if file.size > MAX_IMAGE_BYTES:
            return Response({"detail": "Image 2 MB se chhoti honi chahiye."}, status=400)

        # Content-Type client bhejta hai (jhoota ho sakta hai), isliye file khud kholke dekho
        try:
            img = Image.open(file)
            fmt = img.format
            img.verify()
        except Exception:
            return Response({"detail": "Valid image nahi hai."}, status=400)
        ext = IMAGE_EXT.get(fmt)
        if ext is None:
            return Response({"detail": "Sirf JPG, PNG ya WEBP allowed hai."}, status=400)
        file.seek(0) 

        saved = default_storage.save(f"products/{uuid.uuid4().hex}{ext}", file)
        new_path = f"{settings.MEDIA_URL}{saved}"  # relative: /media/products/...

        _delete_media(product.get("image"))
        db.products.update_one({"_id": product["_id"]}, {"$set": {"image": new_path}})
        invalidate_product(pk)
        return Response(
            {
                "image": new_path,
                "image_url": request.build_absolute_uri(new_path),
            },
            status=201,
        )

    def delete(self, request, pk):
        loaded, err = self._load(request, pk)
        if err:
            return err
        db, product = loaded
        _delete_media(product.get("image"))
        db.products.update_one({"_id": product["_id"]}, {"$unset": {"image": ""}})
        invalidate_product(pk)
        return Response({"detail": "Image removed."})