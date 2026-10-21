"""
apps/users/views.py

Login, register, refresh, logout endpoints — core/cookies.py, core/authentication.py
aur core/permissions.py yahan actual use ho rahe hain.
"""
import random
import secrets
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken



# new one 
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.users.models import OTPVerifications
from apps.users.serializers import RequestOTPSerializer, VerifyOTPSerializer

from core.cookies import (
    REFRESH_COOKIE_NAME,
    clear_auth_cookies,
    get_token_from_cookie,
    set_auth_cookies,
)

User = get_user_model()


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Body: {"username": "...", "email": "...", "password": "...", "role": "user"}
    `role` optional hai, default customer. "admin" kabhi allow nahi hai.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    #singup se sirf ye roles  ban sakta hain . Admin sirf createsuperuser
    ALLOWED_SINGUP_ROLES = {User.Role.USER, "seller"}

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email", "")
        password = request.data.get("password")
        role = request.data.get("role") or  User.Role.USER

        if not username or not password:
            return Response(
                {"detail": "username and password are required."}, status=400
            )
        if role not in self.ALLOWED_SINGUP_ROLES:
            return Response(
                {"detail": "Invalid role. Choose 'user' or 'seller'."}, status=400
            )

        username = username.strip()  # leading/trailing spaces hata do

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already taken."}, status=400)

        user = User.objects.create_user(
            username=username, email=email, password=password, role=role
        )

        return Response(
            {"detail": "User created.", "username": user.username, "role": user.role},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: {"username": "...", "password": "..."}
    Success par access+refresh tokens httpOnly cookies mein set ho jate hain.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"detail": "username and password are required."}, status=400
            )

        username = username.strip()  # leading/trailing spaces hata do

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=401)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {"detail": "Login successful.", "username": user.username, "role": user.role}
        )
        set_auth_cookies(response, access_token, refresh_token)
        return response


class RefreshView(APIView):
    """
    POST /api/auth/refresh/
    Cookie se refresh token padhta hai, naya access token (aur rotated
    refresh token, kyunki ROTATE_REFRESH_TOKENS=True hai) issue karta hai.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = get_token_from_cookie(request, REFRESH_COOKIE_NAME)
        if refresh_token is None:
            return Response({"detail": "Refresh token missing."}, status=401)

        try:
            refresh = RefreshToken(refresh_token)
            new_access_token = str(refresh.access_token)
            new_refresh_token = str(refresh)  # rotation ki wajah se naya token
        except TokenError:
            return Response({"detail": "Refresh token invalid or expired."}, status=401)

        response = Response({"detail": "Token refreshed."})
        set_auth_cookies(response, new_access_token, new_refresh_token)
        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Dono cookies clear kar deta hai.
    """
    permission_classes = [IsAuthenticated]
 
    def post(self, request):
        response = Response({"detail": "Logged out."})
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    """
    GET /api/auth/me/
    Test karne ke liye — cookie se authentication chal raha hai ya nahi,
    yehi confirm karta hai.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"username": request.user.username, "role": request.user.role}
        )



class RequestOTPView(APIView):
    """POST /api/auth/request-otp/  {"phone_number": "+919876543210"}"""
    permission_classes = [AllowAny]

    def post(self, request):
        s = RequestOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        phone = s.validated_data["phone_number"]

        # Spam roko: 60 second mein dobara nahi
        existing = OTPVerifications.objects.filter(phone_number=phone).first()
        if existing and (timezone.now() - existing.created_at).total_seconds() < 60:
            return Response({"detail": "Thodi der baad dobara try karo."}, status=429)

        otp = f"{secrets.randbelow(1_000_000):06d}"
        OTPVerifications.objects.update_or_create(
            phone_number=phone,
            defaults={"otp_hash": make_password(otp), "attempts": 0, "created_at": timezone.now()},
        )

        # TODO: SMS gateway (Twilio/MSG91) yahan. Abhi sirf development mein console.
        if settings.DEBUG:
            print(f"[DEV] OTP for {phone}: {otp}")

        # Hamesha same response, taaki pata na chale number registered hai ya nahi
        return Response({"detail": "Agar number sahi hai to OTP bhej diya gaya hai."})


class VerifyOTPView(APIView):
    """POST /api/auth/verify-otp/  {"phone_number": "...", "otp": "123456"}"""
    permission_classes = [AllowAny]

    def post(self, request):
        s = VerifyOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        phone = s.validated_data["phone_number"]
        otp = s.validated_data["otp"]

        record = OTPVerifications.objects.filter(phone_number=phone).first()
        bad = Response({"detail": "Invalid ya expired OTP."}, status=400)
        if record is None or record.is_expired():
            return bad

        if record.attempts >= OTPVerifications.MAX_ATTEMPTS:
            record.delete()
            return Response({"detail": "Bahut zyada galat koshish. Naya OTP maango."}, status=429)

        if not check_password(otp, record.otp_hash):
            record.attempts += 1
            record.save(update_fields=["attempts"])
            return bad

        record.delete()

        # Phone se user dhoondo, nahi hai to naya customer banao (role hamesha default)
        user = User.objects.filter(phone_number=phone).first()
        created = False
        if user is None:
            user = User(username=f"u_{phone.lstrip('+')}", phone_number=phone, role=User.Role.USER)
            user.set_unusable_password()
            user.save()
            created = True

        if not user.is_active:
            return Response({"detail": "Account disabled."}, status=403)

        refresh = RefreshToken.for_user(user)
        response = Response(
            {"detail": "Login successful.", "username": user.username,
             "role": user.role, "is_new_user": created}
        )
        set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response