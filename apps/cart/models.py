"""
cart PostgreSql mein - user se directly linked hai (relational data). product ka price yahan save nahi hota - display ke waqt Mongo se live fetch hota hai, taaki hamesha current price dekhi 
to Data	Kahan store hota hai
Kaun user, kaunsa product, kitni quantity	Postgres (CartItem table)
Product ka naam, price, stock, description	MongoDB (products collection)
"""


from django.conf import settings
from django.db import models


class CartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )

    product_id = models.CharField(max_length=24) # Mongo ObjectId (as string)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)


    class Meta:
        # Ek user ek product ko cart mein sirf ek hi row mein rakhega —
        # dobara add karne par quantity badhegi, naya row nahi banega.

        unique_together = ("user", "product_id")


    def __str__(self):
        return f"{self.user.username} - {self.product_id} X{self.quantity}"
