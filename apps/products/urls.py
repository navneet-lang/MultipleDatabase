from django.urls import path
from apps.products.views import (
    ProductDetailView,
    ProductListCreateView,
    ProductRatingView,
    ProductReviewView,
)

urlpatterns = [
    path("", ProductListCreateView.as_view(), name="product-list-create"),
    path("<str:pk>/reviews/", ProductReviewView.as_view(), name="product-reviews"),
    path("<str:pk>/rating/", ProductRatingView.as_view(), name="product-rating"),
    path("<str:pk>/", ProductDetailView.as_view(), name="product-detail"),
]