from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("innovation", "0002_idea_is_public"),
    ]

    operations = [
        migrations.AlterField(
            model_name="recognition",
            name="is_public",
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]
