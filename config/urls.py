from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse

def home(request):
    if request.user.is_authenticated:
        return JsonResponse({"detail": f"welcome {request.user.username}!"})
    return JsonResponse({"detail":"Not logged in."})
               

urlpatterns =[
    path("", home),
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/shops/", include("apps.shops.urls")),        
    path("api/products/", include("apps.products.urls")), 
    path("api/cart/", include("apps.cart.urls")),  
    path("accounts/", include("allauth.urls")),
    path("api/orders/", include("apps.orders.urls")),  
]                                                                  

                            