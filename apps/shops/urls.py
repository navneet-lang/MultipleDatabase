from django.urls import path

from apps.shops.views import ShopDetailView,ShopListCreateView

urlpatterns= [

    path("", ShopListCreateView.as_view(), name="shop-list-create"),
      path("<int:pk>/", ShopDetailView.as_view(), name="shop-detail"),
]  