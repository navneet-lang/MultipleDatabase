from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("shops", "0004_rename_longitube_shop_llongitude"),
    ]

    operations = [
        migrations.RenameField(
            model_name="shop",
            old_name="llongitude",
            new_name="longitude",
        ),
    ]
