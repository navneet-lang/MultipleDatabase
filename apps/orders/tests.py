from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from apps.cart.models import CartItem
from apps.orders.models import Order, OrderItem
from apps.shops.models import Shop

User = get_user_model()
PID = str(ObjectId())


def fake_db(stock=5):
    db = MagicMock()
    db.products.find_one.return_value = {
        "_id": ObjectId(PID),
        "name": "Tea",
        "price": 100.0,
        "stock": stock,
        "shop_id": 1,
    }
    db.products.update_one.return_value.modified_count = 1
    return db


class CheckoutTests(APITestCase):
    def setUp(self):  # <-- Dhyan rakh: 'U' capital hona chahiye
        seller = User.objects.create_user("seller1", password="pass12345", role="seller")
        self.shop = Shop.objects.create(id=1, name="S", owner=seller, address="x")
        self.buyer = User.objects.create_user("buyer1", password="pass12345", role="user")
        self.client = APIClient()
        self.client.force_authenticate(user=self.buyer)
        CartItem.objects.create(user=self.buyer, product_id=PID, quantity=2)

    @patch("apps.orders.views.send_order_confirmation_email")
    @patch("apps.orders.views.invalidate_product")
    @patch("apps.orders.views.get_mongo_db")
    def test_checkout_ok(self, mdb, _inv, _mail):
        mdb.return_value = fake_db(stock=5)
        r = self.client.post("/api/orders/checkout/", {"address": "Delhi"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Order.objects.count(), 1)
        self.assertFalse(CartItem.objects.filter(user=self.buyer).exists())

    @patch("apps.orders.views.get_mongo_db")
    def test_checkout_needs_address(self, mdb):
        mdb.return_value = fake_db()
        r = self.client.post("/api/orders/checkout/", {}, format="json")
        self.assertEqual(r.status_code, 400)

    @patch("apps.orders.views.get_mongo_db")
    def test_checkout_insufficient_stock(self, mdb):
        mdb.return_value = fake_db(stock=1)
        r = self.client.post("/api/orders/checkout/", {"address": "Delhi"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)


class BuyerOrderCancellationTests(APITestCase):
    def setUp(self):
        seller = User.objects.create_user(username="cancel-seller", role="seller")
        self.shop = Shop.objects.create(
            id=1, name="Cancel Shop", owner=seller, address="x"
        )
        self.buyer = User.objects.create_user(username="cancel-buyer", role="user")
        self.client = APIClient()
        self.client.force_authenticate(user=self.buyer)
        self.order = Order.objects.create(
            user=self.buyer,
            total_amount=200,
            address="Delhi",
        )
        self.item = OrderItem.objects.create(
            order=self.order,
            product_id=PID,
            shop_id=self.shop.id,
            name="Tea",
            price=100,
            quantity=2,
        )

    @patch("apps.orders.views.send_order_status_update_email")
    @patch("apps.orders.views.invalidate_product")
    @patch("apps.orders.views.get_mongo_db")
    def test_cancel_restock_is_idempotent(self, mongo, _invalidate, _email):
        db = fake_db()
        mongo.return_value = db
        db.products.update_one.return_value.modified_count = 0
        db.products.find_one.return_value = {
            "_restocked_order_item_ids": [str(self.item.id)]
        }

        response = self.client.patch(f"/api/orders/{self.order.id}/cancel/")

        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "cancelled")
        self.assertEqual(db.products.update_one.call_count, 2)
        self.assertEqual(
            db.products.update_one.call_args_list[0].args[1],
            {
                "$inc": {"stock": self.item.quantity},
                "$addToSet": {
                    "_restocked_order_item_ids": str(self.item.id)
                },
            },
        )

        response = self.client.patch(f"/api/orders/{self.order.id}/cancel/")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(db.products.update_one.call_count, 2)