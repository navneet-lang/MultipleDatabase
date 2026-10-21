from django.urls import path

from apps.users.views import (
    # GoogleLoginView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    RequestOTPView,
    VerifyOTPView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    # path("google/", GoogleLoginView.as_view(), name="google-login"),
    path("request-otp/", RequestOTPView.as_view(), name="request-otp"),
    path("verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
]