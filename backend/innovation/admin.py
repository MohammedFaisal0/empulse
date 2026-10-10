from django.contrib import admin

from innovation.models import Idea, Recognition


@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "employee",
        "category",
        "status",
        "submitted_at",
    )
    list_filter = ("status", "category")
    search_fields = ("title", "employee__full_name")
    date_hierarchy = "submitted_at"


@admin.register(Recognition)
class RecognitionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "type",
        "giver",
        "receiver",
        "created_at",
        "is_public",
    )
    list_filter = ("type", "is_public")
    search_fields = ("message", "giver__full_name", "receiver__full_name")
    date_hierarchy = "created_at"
