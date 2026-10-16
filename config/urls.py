from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def home(request):
    if request.user.is_authenticated:
        return JsonResponse({"detail": f"welcome {request.user.username}!"})
    return JsonResponse({"detail": "Not logged in."})


def custom404(request, exception=None):
    return JsonResponse({"detail": "Not found. Ye URL exist nahi karta."}, status=404)


urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/shops/", include("apps.shops.urls")),
    path("api/products/", include("apps.products.urls")),
    path("api/cart/", include("apps.cart.urls")),
    path("accounts/", include("allauth.urls")),
    path("api/orders/", include("apps.orders.urls")),
]

# Uploaded images (/media/...) serve karne ke liye. Sirf development ke liye;
# production mein nginx ya CDN ye kaam karega.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Is file ke bilkul end mein, taaki ab ke baad koi bhi galat URL JSON 404 de
# (HTML debug page nahi). Django sirf root urls.py ka handler404 padhta hai.
handler404 = custom404