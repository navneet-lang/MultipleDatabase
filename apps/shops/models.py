"""
apps/shops/models.py

shop ke data ko ham jo ha vo postgrase mai save karnge ham 
"""

from django.conf import settings
from django.db import models

# Create your models here.

class Shop(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,  
        related_name="shops",
    )

    name = models.CharField(max_length=255, )
    description= models.TextField(blank=True,  null=True)
    address= models.TextField(blank=True)
    gst_number = models.CharField(max_length=20, unique=True)
    is_active =models.BooleanField(default=True)
    created_at =models.DateTimeField(auto_now_add=True)
    update_at= models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (owner: {self.owner.username})"

         

 