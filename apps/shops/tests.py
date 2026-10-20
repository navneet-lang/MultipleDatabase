from io import BytesIO

from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient, APITestCase

from apps.shops.models import Shop

User = get_user_model()


class ShopUpdateTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="shop-owner", role="seller"
        )
        self.shop = Shop.objects.create(
            owner=self.seller,
            name="Test Shop",
            description="Old description",
            address="Delhi",
            gst_number="GST-TEST-1",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.seller)

    def test_patch_updates_description(self):
        response = self.client.patch(
            f"/api/shops/{self.shop.id}/",
            {"description": "Updated description"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.description, "Updated description")

    def test_patch_uploads_shop_cover_image(self):
        image_bytes = BytesIO()
        Image.new("RGB", (2, 2), color="indigo").save(image_bytes, format="PNG")
        image = SimpleUploadedFile(
            "shop-cover.png", image_bytes.getvalue(), content_type="image/png"
        )

        response = self.client.patch(
            f"/api/shops/{self.shop.id}/",
            {"image": image},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["image_url"].endswith(".png"))
        self.shop.refresh_from_db()
        self.assertTrue(default_storage.exists(self.shop.image.name))
        default_storage.delete(self.shop.image.name)
