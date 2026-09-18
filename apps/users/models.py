

from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "ADMIN",
        MANAGER = "manager", "Manager",
        SELLER = "seller", "Seller",
        USER = "user","User"
   

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)


    def __str__(self):
        return f"{self.username}({self.role})"