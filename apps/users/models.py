from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        SELLER = "seller", "Seller"
        USER = "user", "User"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.username}({self.role})"


class OTPVerifications(models.Model):
    phone_number = models.CharField(max_length=15, unique=True)
    otp_hash = models.CharField(max_length=128)  # OTP plain text mein nahi rakhte
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    MAX_ATTEMPTS = 5
    TTL_MINUTES = 5

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=self.TTL_MINUTES)

    def __str__(self):
        return f"OTP for {self.phone_number}"