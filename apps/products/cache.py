"""
product detail chche + hit/miss counter. Redis down ho jaye to API crash nahi karti , seedha  Mongo pe fallback hota hai

"""

import logging

from  django.core.cache import  cache

logger = logging.getLogger(__name__)

PRODUCT_CACHE_TTL =300 # SECOND(5 min)
HITS_KEY = "metrics:product_cache:misses"
MISSES_KEY = "metrics:product_cache:missess"

def product_cache_key(pk):
    return f"product:{pk}"

def _dump(key):
    cache.add(key, 0,timeout=None) # pehli baar counter banao (kabhi expire nahi)
    cache.incr(key)




def get_chched_product(pk):
    """Cache mein hai to dict, warna None. Hit/miss count bhi karta hai."""
    try:
        data = cache.get(product_cache_key(pk))
        _dump(HITS_KEY if data is not None else MISSES_KEY)
        return data
    except Exception:
        logger.exception("Redis cache invalidate failed, falling back to mongoDB")
        return None


def set_cached_product(pk, data):
    try:
        data = cache.set(product_cache_key(pk), data, PRODUCT_CACHE_TTL)
    except Exception:
        logger.exception("Redis cache write failed")


def invalidate_product(pk):
    try: 
        cache.set(product_cache_key(str(pk)))
    except Exception:
        logger.exception("Redis cache invalidate failed")

def get_cache_stats():
    hits = cache.get(HITS_KEY, 0)
    misses  = cache.get(MISSES_KEY, 0)
    total = hits + misses
    return{
        "hits":hits,
        "misses":misses,
        "total_lookups": total,
         "hit_ratio_percent": round(hits / total * 100, 2) if total else 0.0,
    }


def reset_cache_stats():
    cache.delete_many([HITS_KEY, MISSES_KEY])