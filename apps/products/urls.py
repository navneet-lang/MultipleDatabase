"""
apps/products/urls.py
"""

from django.urls import path

from apps.products.views import (
    ProductCacheStatsView,
    ProductDetailView,
    ProductListCreateView,
    ProductRatingView,
    ProductReviewView,
    ProductCategoryListView,  # Ye import add kiya hai
)

urlpatterns = [
    path("", ProductListCreateView.as_view(), name="product-list-create"),
    path("cache-stats/", ProductCacheStatsView.as_view(), name="product-cache-stats"),
    path("categories/", ProductCategoryListView.as_view(), name="product-categories"),  # Ye path add kiya hai (hamesha <str:pk> se upar)
    
    # Niche wale saare dynamic <str:pk> wale routes hain
    path("<str:pk>/reviews/", ProductReviewView.as_view(), name="product-reviews"),
    path("<str:pk>/rating/", ProductRatingView.as_view(), name="product-rating"),
    path("<str:pk>/", ProductDetailView.as_view(), name="product-detail"),
]