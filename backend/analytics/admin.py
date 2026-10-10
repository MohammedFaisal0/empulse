from django.contrib import admin

from analytics.models import EconomicImpactMonthly


@admin.register(EconomicImpactMonthly)
class EconomicImpactMonthlyAdmin(admin.ModelAdmin):
    list_display = (
        "month",
        "department",
        "headcount",
        "avg_burnout_risk_pct",
        "net_impact_sar",
        "roi_pct",
    )
    list_filter = ("department",)
    date_hierarchy = "month"
