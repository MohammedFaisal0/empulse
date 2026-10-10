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
