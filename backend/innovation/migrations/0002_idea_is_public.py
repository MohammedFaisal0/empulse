from django.db import migrations, models


def backfill_public(apps, schema_editor):
    Idea = apps.get_model("innovation", "Idea")
    Idea.objects.filter(status__in=["approved", "implemented"]).update(is_public=True)


class Migration(migrations.Migration):

    dependencies = [
        ("innovation", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="idea",
            name="is_public",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.RunPython(backfill_public, migrations.RunPython.noop),
    ]
