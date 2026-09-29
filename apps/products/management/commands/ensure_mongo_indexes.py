"""
Mongo indexese bnaata hai m(idempotent - dobara chalane se koi problem nahi )
usage : docker compose exec web python manage.py 
"""

import pymongo
from django.core.management.base import BaseCommand

from core.mongo import get_mongo_db

class Command(BaseCommand):
    help = "Create MangoDB indexes fro product collection "

    def handle(self, *args, **options):
        products = get_mongo_db().products

        #Test index: name ko description se  3x zyada weight

        products.create_index(
            [("name", pymongo.TEXT), ("description", pymongo.TEXT)],
            name="product_text_idx",
            weights={"name":3, "description":1},

        )
        products.create_index([("shop_id", pymongo.ASCENDING)], name="product_shop_idx")
        products.create_index(
            [("category",pymongo.ASCENDING), ("price", pymongo.ASCENDING)],
            name = "product_category_price_idx",
        )

        self.stdout.write(self.style.SUCCESS("Indexes ready:"))
        for name in products.index_information():
            self.stdout.write(f" - {name}")  

             