from django.contrib import admin

from accounts.models import AuditLog, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "employee")
    list_filter = ("role",)
    search_fields = ("user__email", "employee__full_name")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "employee", "path")
    list_filter = ("action",)
    search_fields = ("actor__email", "employee__full_name", "path")
    readonly_fields = ("created_at",)
