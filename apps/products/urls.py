from django.urls import path

from  apps.products.views import ProductDetailView, ProductListCreateView

urlpatterns =[
    path("",  ProductListCreateView.as_view(), name="product create list "),
     path("<str:pk>/", ProductDetailView.as_view(), name="product-detail"),
]

