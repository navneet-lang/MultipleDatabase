"""
Celery task - order confirm/ delivery hone per email bhejta hai background mein chalta hai (celery worker container ke andar isliye API response slow nahi hota ) 
"""

from celery import shared_task
from django.core.mail import send_mail


@shared_task
def send_order_confirmation_email(order_id, user_email, username, total_amount):
    subject = f"Order #{order_id} Confirmed!"
    message = (
        f"Hi {username},\n\n"
        f"Aapka order #{order_id} confirm ho gaya hai.\n"
        f"Total amount: ₹{total_amount}\n\n"
        f"Dhanyawad!"
    )
    send_mail(subject, message, None, [user_email], fail_silently=False)


@shared_task
def send_order_status_update_email(order_id, user_email, username, new_status):
    subject = f"Order #{order_id} - Status Update: {new_status.title()}"
    message = (
        f"Hi {username},\n\n"
        f"Aapke order #{order_id} ka status update ho gaya hai : {new_status.upper()}\n\n"
        f"Thanks"
    )

    send_mail(subject, message, None, [user_email], fail_silently=False)