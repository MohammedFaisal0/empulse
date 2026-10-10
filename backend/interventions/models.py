from django.db import models


class Intervention(models.Model):
    id = models.IntegerField(primary_key=True)
    employee = models.ForeignKey(
        "org.Employee",
        on_delete=models.CASCADE,
        related_name="interventions",
        db_index=True,
    )
    type = models.CharField(max_length=128)
    rationale = models.TextField()
    driver = models.CharField(max_length=128)
    status = models.CharField(max_length=32, db_index=True)
    proposed_by = models.CharField(max_length=64)
    owner = models.ForeignKey(
        "org.Employee",
        on_delete=models.PROTECT,
        related_name="owned_interventions",
        db_index=True,
    )
    approved_by = models.ForeignKey(
        "org.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_interventions",
    )
    created_at = models.DateField(db_index=True)
    approved_at = models.DateField(null=True, blank=True, db_index=True)
    started_at = models.DateField(null=True, blank=True, db_index=True)
    completed_at = models.DateField(null=True, blank=True, db_index=True)
    followup_at = models.DateField(null=True, blank=True, db_index=True)
    expected_risk_reduction_pts = models.IntegerField()
    cost_sar = models.PositiveIntegerField()
    human_approved = models.BooleanField(default=False)
    baseline_risk_pct = models.PositiveSmallIntegerField()
    followup_risk_pct = models.FloatField(null=True, blank=True)
    outcome = models.CharField(max_length=32)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self) -> str:
        return f"{self.type} ({self.status}) → {self.employee_id}"
