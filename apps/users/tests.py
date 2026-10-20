from rest_framework.test import APITestCase

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class RegisterRoleTests(APITestCase):
    def test_registration_works_with_cookie_for_deleted_user(self):
        deleted_user = User.objects.create_user(
            username="deleted-user", password="test-password-123"
        )
        stale_access_token = str(RefreshToken.for_user(deleted_user).access_token)
        deleted_user.delete()
        self.client.cookies["access_token"] = stale_access_token

        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "new-user-with-stale-cookie",
                "password": "test-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_buyer_registration_uses_user_role(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "buyer-role-test",
                "password": "test-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], User.Role.USER)

    def test_plural_users_role_is_rejected(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "buyer-plural-role-test",
                "password": "test-password-123",
                "role": "users",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
