"""
apps/users/views.py

Login, register, refresh, logout endpoints — core/cookies.py, core/authentication.py
aur core/permissions.py yahan actual use ho rahe hain.
"""

from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

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
    `role` optional hai — default "user" rahega.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email", "")
        password = request.data.get("password")
        role = request.data.get("role", User.Role.USER)

        if not username or not password:
            return Response(
                {"detail": "username and password are required."}, status=400
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