"""
Order aur OrderItem — PostgreSQL mein. OrderItem mein price/name ka
"snapshot" save hota hai (checkout ke waqt ka), 



OrderItem ka apna status hai, kyunki ek order mein alag shops ke items
ho sakte hain aur har seller sirf apne item ka status badalta hai.
Order.status in items se derive hota hai (recompute_status).
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



    def recompute_status(self):
        """Item ke status se order la overall status nikalta hai """
        statuses = set(self.items.values_list("status", flat= True))
        if not statuses:
            return self.status

        active  = statuses - {"cancelled"}

        if not active:
            new_status = "cancelled"
        elif active == {"delivered"}:
            new_status= "delivered"
        elif active <= {"shipped", "delivered"}:
            new_status = "shipped"
        elif active <= {"confirmed", "shipped", "delivered"}:
            new_status = "pending" #koi iteam abhi bhi pending

        if new_status != self.status:
            self.status = new_status
            self.save(update_fields=["status","updated_at"])
        return self.status

    def __str__(self):
        return f"Order #{self.id} - {self.user.username}- {self.status}"




   


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete= models.CASCADE, related_name="items")
    product_id = models.CharField(max_length=24) # MongoDB ObjectId (as string)`
    shop_id = models.IntegerField()
    name = models.CharField(max_length=255) # snapshot — checkout ke waqt ka naam
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=Order.Status.choices, default=Order.Status.PENDING     
    )

    @property
    def line_total(self):
        return self.price * self.quantity

    def __str__(self):
        return f"{self.name} x{self.quantity} (Order #{self.order_id})" 
                      



    


                       