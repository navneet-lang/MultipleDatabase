from django.urls import path
from apps.orders.views import CheckoutView, OrderListView, OrderDetailView

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("", OrderListView.as_view(), name="order-list"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
]

    