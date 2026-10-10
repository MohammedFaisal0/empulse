from django.db import models


class EconomicImpactMonthly(models.Model):
    id = models.BigAutoField(primary_key=True)
    month = models.DateField(db_index=True)
    department = models.ForeignKey(
        "org.Department",
        on_delete=models.CASCADE,
        related_name="economic_impacts",
        db_index=True,
    )
    headcount = models.PositiveIntegerField()
    avg_burnout_risk_pct = models.FloatField()
    avg_wellbeing_score = models.FloatField()
    avg_performance_score = models.FloatField()
    interventions_completed = models.PositiveIntegerField()
    ideas_implemented = models.PositiveIntegerField()
    expected_exits_baseline = models.FloatField()
    exits_avoided = models.FloatField()
    retention_savings_sar = models.FloatField()
    productivity_gain_sar = models.FloatField()
    innovation_value_sar = models.FloatField()
    program_cost_sar = models.FloatField()
    net_impact_sar = models.FloatField()
    roi_pct = models.FloatField()

    class Meta:
        verbose_name_plural = "economic impact monthly"
        constraints = [
            models.UniqueConstraint(
                fields=["month", "department"],
                name="uniq_economic_impact_month_department",
            )
        ]
        indexes = [
            models.Index(fields=["month", "department"]),
        ]

    def __str__(self) -> str:
        return f"{self.department_id} {self.month}"
