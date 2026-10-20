from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.shops.models import Shop

User = get_user_model()


class ProductOwnershipTests(APITestCase):
    def test_seller_cannot_add_product_to_another_sellers_shop(self):
        seller = User.objects.create_user(username="seller-one", role="seller")
        other_seller = User.objects.create_user(username="seller-two", role="seller")
        other_shop = Shop.objects.create(
            owner=other_seller,
            name="Other Seller Shop",
            address="Delhi",
            gst_number="GST-OTHER-SELLER",
        )
        self.client.force_authenticate(user=seller)

        with patch("apps.products.views.get_mongo_db") as get_mongo_db:
            response = self.client.post(
                "/api/products/",
                {
                    "name": "Unauthorized product",
                    "description": "Must not be added",
                    "price": "100.00",
                    "category": "Test",
                    "stock": 1,
                    "shop_id": other_shop.id,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "You can only add products to your own shop.",
        )
        get_mongo_db.assert_not_called()
