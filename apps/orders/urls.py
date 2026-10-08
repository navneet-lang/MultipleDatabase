"""
apps/orders/urls.py
"""

from django.urls import path

from apps.orders.views import (
    CheckoutView,
    OrderDetailView,
    OrderListView,
    SellerOrderItemListView,
    SellerOrderItemStatusView,
    SellerSummaryView,
    BuyerOrderCancelView
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("", OrderListView.as_view(), name="order-list"),
    path("seller/items/", SellerOrderItemListView.as_view(), name="seller-order-items"),
    path(
        "seller/items/<int:item_id>/status/",
        SellerOrderItemStatusView.as_view(),
        name="seller-order-item-status",
    ),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("seller/summary/", SellerSummaryView.as_view()),
path("<int:pk>/cancel/", BuyerOrderCancelView.as_view()),
]