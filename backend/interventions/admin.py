from django.contrib import admin

from interventions.models import Intervention


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "employee",
        "type",
        "status",
        "owner",
        "human_approved",
        "created_at",
        "outcome",
    )
    list_filter = ("status", "human_approved", "type")
    search_fields = ("employee__full_name", "type", "rationale")
    date_hierarchy = "created_at"
