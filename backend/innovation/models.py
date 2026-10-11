from django.db import models


class Idea(models.Model):
    id = models.IntegerField(primary_key=True)
    employee = models.ForeignKey(
        "org.Employee",
        on_delete=models.CASCADE,
        related_name="ideas",
        db_index=True,
    )
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=64)
    status = models.CharField(max_length=32, db_index=True)
    novelty_score = models.FloatField()
    feasibility_score = models.FloatField()
    business_value_score = models.FloatField()
    submitted_at = models.DateField(db_index=True)
    decided_at = models.DateField(null=True, blank=True, db_index=True)
    implemented_at = models.DateField(null=True, blank=True, db_index=True)
    estimated_value_sar = models.FloatField(null=True, blank=True)
    realized_value_sar = models.FloatField(null=True, blank=True)
    # Marketplace visibility — seed sets True for approved/implemented (CSV has no column).
    is_public = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-submitted_at", "id"]

    def __str__(self) -> str:
        return self.title


class Recognition(models.Model):
    id = models.IntegerField(primary_key=True)
    giver = models.ForeignKey(
        "org.Employee",
        on_delete=models.CASCADE,
        related_name="recognitions_given",
        db_index=True,
    )
    receiver = models.ForeignKey(
        "org.Employee",
        on_delete=models.CASCADE,
        related_name="recognitions_received",
        db_index=True,
    )
    type = models.CharField(max_length=64)
    message = models.TextField()
    created_at = models.DateField(db_index=True)
    is_public = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self) -> str:
        return f"{self.type}: {self.giver_id} → {self.receiver_id}"
