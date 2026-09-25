from django.contrib import admin
from apps.orders.models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_id", "shop_id", "name", "price", "quantity"]
    
