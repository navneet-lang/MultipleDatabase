from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from core.cookies import ACCESS_COOKIE_NAME, get_token_from_cookie

class CookieJWTAuthentication(JWTAuthentication):
    """
        JWTAuthentication ko override karke cookie se raw token nikalte hain,
        baaki validation (signature, expiry, user lookup) SimpleJWT ka parent
        class hi karega — hum sirf "token kahan se aayega" wo part badal rahe hain.
        """

    def authenticate(self, request):
        raw_token = get_token_from_cookie(request, ACCESS_COOKIE_NAME)

             # Cookie nahi mili -> fallback: header check kar lo (mobile clients /
                # third-party API consumers ke liye jo header hi use karte hain)

        if raw_token is None:
            header=self.get_header(request)
            if header is None:
                return None
            raw_token = self.get_header(request)
            if raw_token is None:
              return None

        try:
            validated_token = self.get_validated_token(raw_token)

        except InvalidToken as exc:
            raise AuthenticationFailed("Access token invalid or expired. ") from exc
        user = self.get_user(validated_token)
        return(user,validated_token)