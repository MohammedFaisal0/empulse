from django.db import models


class Department(models.Model):
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=128)
    head = models.ForeignKey(
        "Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_departments",
    )
    headcount = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Team(models.Model):
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=128)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="teams",
        db_index=True,
    )
    head = models.ForeignKey(
        "Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_teams",
    )
    headcount = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Employee(models.Model):
    id = models.IntegerField(primary_key=True)
    employee_code = models.CharField(max_length=32, db_index=True)
    first_name = models.CharField(max_length=64)
    last_name = models.CharField(max_length=64)
    full_name = models.CharField(max_length=128, unique=True)
    email = models.EmailField(unique=True)
    gender = models.CharField(max_length=8)
    age = models.PositiveSmallIntegerField()
    job_title = models.CharField(max_length=128)
    job_level = models.PositiveSmallIntegerField()
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="employees",
        db_index=True,
    )
    team = models.ForeignKey(
        Team,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
        db_index=True,
    )
    hire_date = models.DateField(db_index=True)
    tenure_years = models.FloatField()
    monthly_income_sar = models.PositiveIntegerField()
    income_ratio = models.FloatField()
    years_since_promotion = models.FloatField()
    work_location = models.CharField(max_length=64)
    work_mode = models.CharField(max_length=32)
    app_role = models.CharField(max_length=32)
    is_manager = models.BooleanField(default=False)
    is_demo_person = models.BooleanField(default=False)
    manager = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="direct_reports",
        db_index=True,
    )

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["department", "full_name"]),
            models.Index(fields=["team", "full_name"]),
        ]

    def __str__(self) -> str:
        return self.full_name
