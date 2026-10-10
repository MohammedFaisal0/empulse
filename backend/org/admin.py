from django.contrib import admin

from org.models import Department, Employee, Team


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "head", "headcount")
    search_fields = ("name",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "department", "head", "headcount")
    list_filter = ("department",)
    search_fields = ("name",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "employee_code",
        "full_name",
        "email",
        "job_title",
        "department",
        "team",
        "app_role",
        "is_demo_person",
    )
    list_filter = ("department", "app_role", "is_manager", "is_demo_person")
    search_fields = ("full_name", "email", "employee_code")
    ordering = ("full_name",)
