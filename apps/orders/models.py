"""
Order aur OrderItem — PostgreSQL mein. OrderItem mein price/name ka
"snapshot" save hota hai (checkout ke waqt ka), Cart ki tarah live
Mongo se fetch nahi hota — order history hamesha wahi dikhana chahiye
jo customer ne actually pay kiya tha
"""

from django.conf import settings
from django.db import models

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "pending",
        CONFIRMED = "confirmed", "confirmed",
        SHIPPED = "shipped","shipped",
        DELIVERED  = "delivered","delivered",
        CANCELLED = "cancelled", "cancelled",

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete =models.CASCADE,
        related_name = "orders",

    )

    status =  models.CharField(max_length=20, choices= Status.choices, default=Status.PENDING)
    total_amount =  models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at=  models.DateTimeField(auto_now=True)


    def __str__(self):
        return f"Order #{self.id} — {self.user.username} — {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete= models.CASCADE, related_name="items")
    product_id = models.CharField(max_length=24) # MongoDB ObjectId (as string)`
    shop_id = models.IntegerField()
    name = models.CharField(max_length=255) # snapshot — checkout ke waqt ka naam
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def line_total(self):
        return self.price * self.quantity

    def __str__(self):
        return f"{self.name} x{self.quantity} (Order #{self.order_id})" 
                      



    


                       