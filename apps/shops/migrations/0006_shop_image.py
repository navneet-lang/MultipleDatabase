from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shops", "0005_rename_llongitude_shop_longitude"),
    ]

    operations = [
        migrations.AddField(
            model_name="shop",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to="shops/"),
        ),
    ]
