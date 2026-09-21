from django.urls import path
from apps.cart.views import CartItemDetailView, CartView, ClearCartView

urlpatterns = [
    path("", CartView.as_view(), name="cart"),
    path("clear/", ClearCartView.as_view(), name="cart-clar"),
    path("<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
]