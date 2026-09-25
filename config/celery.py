"""
Celery app setup - redis ko broker (task queue) ke roop mein use karta hai
"""

import os
from celery import Celery

# 1. " config.settings" ki jagah "config.settings" aayega (space hata diya)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")

# 2 & 3. config_from_object aur settings ki spelling theek kar di hai
app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()  