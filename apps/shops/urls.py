from django.urls import path
from apps.shops.views import FeaturedShopsView
from apps.shops.views import NearbyShopsView

from apps.shops.views import ShopDetailView,ShopListCreateView

urlpatterns= [

    path("", ShopListCreateView.as_view(), name="shop-list-create"),
    path("featured/", FeaturedShopsView.as_view()),
    path("<int:pk>/", ShopDetailView.as_view(), name="shop-detail"),
    path("nearby/", NearbyShopsView.as_view()),
]  



