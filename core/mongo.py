 #ye only auth-unrealated data (log, analytic, ya jo bhi non -relations data jo hoga vo jayega )

from functools import lru_cache

from django.conf import settings
from pymongo import MongoClient
from pymongo.database import Database

@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
     """
    Ek hi MongoClient poori app ke liye reuse hota hai (connection pooling
    khud MongoClient handle karta hai) — baar baar naya client mat banao.
    """

     return MongoClient(settings.MONGO_URI)


def get_mongo_db() -> Database:

     client = get_mongo_client()
     return client[settings.MONGO_DB_NAME]
     
       