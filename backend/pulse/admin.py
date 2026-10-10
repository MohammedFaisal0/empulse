from django.contrib import admin

from pulse.models import EmployeeCurrent, Skill, WeeklyMetric


@admin.register(EmployeeCurrent)
class EmployeeCurrentAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "as_of",
        "performance_score",
        "performance_tier",
        "wellbeing_score",
        "burnout_risk_pct",
        "attrition_risk_pct",
    )
    list_filter = ("performance_tier", "burnout_level", "attrition_level")
    search_fields = ("employee__full_name", "employee__email")


@admin.register(WeeklyMetric)
class WeeklyMetricAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "week_start",
        "performance_score",
        "wellbeing_score",
        "burnout_risk_pct",
        "pulse_submitted",
    )
    list_filter = ("week_start", "pulse_submitted")
    search_fields = ("employee__full_name",)
    date_hierarchy = "week_start"


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("id", "employee", "skill", "category", "level")
    list_filter = ("category",)
    search_fields = ("skill", "employee__full_name")
