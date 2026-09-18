"""
core/cookies.py

Reusable helpers for setting and clearing JWT cookies (httpOnly).
"""

from django.conf import settings


# Cookie config — sab settings.py se aayega (env-driven)

ACCESS_COOKIE_NAME = getattr(settings, "AUTH_ACCESS_COOKIE_NAME", "access_token")
REFRESH_COOKIE_NAME = getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "refresh_token")

# seconds
ACCESS_COOKIE_MAX_AGE = getattr(settings, "AUTH_ACCESS_COOKIE_MAX_AGE", 5 * 60)          # 5 min
REFRESH_COOKIE_MAX_AGE = getattr(settings, "AUTH_REFRESH_COOKIE_MAX_AGE", 7 * 24 * 60 * 60)  # 7 days

COOKIE_SECURE = getattr(settings, "AUTH_COOKIE_SECURE", not settings.DEBUG)
COOKIE_SAMESITE = getattr(settings, "AUTH_COOKIE_SAMESITE", "Lax")
COOKIE_DOMAIN = getattr(settings, "AUTH_COOKIE_DOMAIN", None)
COOKIE_PATH = getattr(settings, "AUTH_COOKIE_PATH", "/")


def set_auth_cookies(response, access_token: str, refresh_token: str | None = None):
    """
    Access token (+ optionally refresh token) ko httpOnly cookie mein set karta hai.
    """
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=ACCESS_COOKIE_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
    )

    if refresh_token is not None:
        response.set_cookie(
            key=REFRESH_COOKIE_NAME,
            value=refresh_token,
            max_age=REFRESH_COOKIE_MAX_AGE,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            domain=COOKIE_DOMAIN,
            path=getattr(settings, "AUTH_REFRESH_COOKIE_PATH", COOKIE_PATH),
        )

    return response


def clear_auth_cookies(response):
    """Logout par dono cookies clear karta hai."""
    response.delete_cookie(ACCESS_COOKIE_NAME, path=COOKIE_PATH, domain=COOKIE_DOMAIN)
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=getattr(settings, "AUTH_REFRESH_COOKIE_PATH", COOKIE_PATH),
        domain=COOKIE_DOMAIN,
    )
    return response


def get_token_from_cookie(request, cookie_name: str) -> str | None:
    """Request ke cookies se token nikalta hai."""
    return request.COOKIES.get(cookie_name) 