"""
apps/users/management/commands/setup_google_oauth.py

.env se GOOGLE_CLIENT_ID/SECRET padh ke Site + SocialApp automatically
create/update kar deta hai — Django Admin mein manually jaake add nahi
karna padta.

Usage:
    docker compose exec web python manage.py setup_google_oauth
"""

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Configures the Site and Google SocialApp from env vars."

    def handle(self, *args, **options):
        from allauth.socialaccount.models import SocialApp

        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            self.stderr.write("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET .env mein set nahi hain.")
            return

        site, _ = Site.objects.update_or_create(
            id=settings.SITE_ID,
            defaults={"domain": "localhost:8000", "name": "localhost"},
        )

        app, created = SocialApp.objects.update_or_create(
            provider="google",
            name="Google",
            defaults={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "secret": settings.GOOGLE_CLIENT_SECRET,
            },
        )
        app.sites.add(site)

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} Google SocialApp, linked to {site.domain}"))