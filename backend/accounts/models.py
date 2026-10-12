from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        EMPLOYEE = "employee", "Employee"
        MANAGER = "manager", "Manager"
        HR = "hr", "HR"
        EXECUTIVE = "executive", "Executive"
        ADMIN = "admin", "Admin"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    employee = models.OneToOneField(
        "org.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="user_profile",
    )
    role = models.CharField(max_length=32, choices=Role.choices)

    class Meta:
        ordering = ["user__email"]

    def __str__(self) -> str:
        return f"{self.user.email} ({self.role})"


class AuditLog(models.Model):
    """Every HR/admin read of an individual's profile must create a row."""

    class Action(models.TextChoices):
        EMPLOYEE_PROFILE_READ = "employee.profile.read", "Employee profile read"
        EXPORT = "export", "Export"
        INTERVENTION_APPROVE = "intervention.approve", "Intervention approve"
        SIMULATE = "simulate", "What-if simulate"
        PULSEAI_QUERY = "pulseai.query", "PulseAI query"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=64, choices=Action.choices)
    employee = models.ForeignKey(
        "org.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    path = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["employee", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} by {self.actor_id} at {self.created_at}"
