from django.db import models


class EmployeeCurrent(models.Model):
    employee = models.OneToOneField(
        "org.Employee",
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="current",
    )
    as_of = models.DateField(db_index=True)
    workload_index = models.FloatField()
    overtime_hours_monthly = models.FloatField()
    work_life_balance = models.FloatField()
    job_satisfaction = models.FloatField()
    mood_score = models.FloatField()
    engagement_score = models.FloatField()
    absence_days_annual = models.FloatField()
    recognition_90d = models.PositiveIntegerField()
    training_times_last_year = models.PositiveIntegerField()
    ideas_submitted_12m = models.PositiveIntegerField()
    ideas_approved_12m = models.PositiveIntegerField()
    ideas_implemented_12m = models.PositiveIntegerField()
    innovation_score = models.FloatField()
    task_completion_rate = models.FloatField()
    task_quality_score = models.FloatField()
    collaboration_score = models.FloatField()
    performance_score = models.PositiveSmallIntegerField()
    performance_tier = models.CharField(max_length=16)
    wellbeing_score = models.PositiveSmallIntegerField()
    burnout_risk_pct = models.PositiveSmallIntegerField()
    burnout_level = models.CharField(max_length=16)
    attrition_risk_pct = models.PositiveSmallIntegerField()
    attrition_level = models.CharField(max_length=16)
    burnout_drivers = models.TextField()
    attrition_drivers = models.TextField()
    burnout_change_6w_pts = models.IntegerField()

    class Meta:
        verbose_name_plural = "employee current snapshots"

    def __str__(self) -> str:
        return f"{self.employee_id} @ {self.as_of}"


class WeeklyMetric(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee = models.ForeignKey(
        "org.Employee",
        on_delete=models.CASCADE,
        related_name="weekly_metrics",
        db_index=True,
    )
    week_start = models.DateField(db_index=True)
    workload_index = models.FloatField()
    overtime_hours_monthly = models.FloatField()
    mood_score = models.FloatField()
    engagement_score = models.FloatField()
    wellbeing_score = models.FloatField()
    performance_score = models.FloatField()
    burnout_risk_pct = models.FloatField()
    pulse_submitted = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "week_start"],
                name="uniq_weekly_metric_employee_week",
            )
        ]
        indexes = [
            models.Index(fields=["week_start"]),
            models.Index(fields=["employee", "week_start"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee_id} {self.week_start}"


class Skill(models.Model):
    id = models.IntegerField(primary_key=True)
    employee = models.ForeignKey(
        "org.Employee",
        on_delete=models.CASCADE,
        related_name="skills",
        db_index=True,
    )
    skill = models.CharField(max_length=128)
    category = models.CharField(max_length=32)
    level = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["employee_id", "skill"]

    def __str__(self) -> str:
        return f"{self.employee_id}: {self.skill}"
