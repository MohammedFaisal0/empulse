from django.contrib import admin

from accounts.models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "employee")
    list_filter = ("role",)
    search_fields = ("user__email", "employee__full_name")
