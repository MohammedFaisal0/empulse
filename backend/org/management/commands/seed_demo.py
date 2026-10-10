"""Load data/generated/*.csv and create the three demo login users.

Idempotent: safe to run twice. Replaces domain rows from CSVs and upserts users.
"""

from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import UserProfile
from analytics.models import EconomicImpactMonthly
from innovation.models import Idea, Recognition
from interventions.models import Intervention
from org.models import Department, Employee, Team
from pulse.models import EmployeeCurrent, Skill, WeeklyMetric

User = get_user_model()

# seed_demo.py → commands → management → org → backend → project root
PROJECT_ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = PROJECT_ROOT / "data" / "generated"

BATCH = 2000

DEMO_USERS = (
    {
        "email": "layla@horizon.demo",
        "role": UserProfile.Role.EMPLOYEE,
        "password": "empulse123",
    },
    {
        "email": "yasmin@horizon.demo",
        "role": UserProfile.Role.MANAGER,
        "password": "empulse123",
    },
    {
        "email": "rana@horizon.demo",
        "role": UserProfile.Role.HR,
        "password": "empulse123",
    },
)


def _empty(value: str | None) -> bool:
    return value is None or value.strip() == ""


def _int(value: str) -> int:
    return int(float(value))


def _int_or_none(value: str) -> int | None:
    if _empty(value):
        return None
    return int(float(value))


def _float(value: str) -> float:
    return float(value)


def _float_or_none(value: str) -> float | None:
    if _empty(value):
        return None
    return float(value)


def _bool01(value: str) -> bool:
    if _empty(value):
        return False
    return int(float(value)) == 1


def _date(value: str) -> date:
    return datetime.strptime(value.strip(), "%Y-%m-%d").date()


def _date_or_none(value: str) -> date | None:
    if _empty(value):
        return None
    return _date(value)


def _read_csv(name: str) -> list[dict[str, str]]:
    path = DATA_DIR / name
    with path.open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def _bulk(model, objs: list, batch_size: int = BATCH) -> None:
    for i in range(0, len(objs), batch_size):
        model.objects.bulk_create(objs[i : i + batch_size], batch_size=batch_size)


class Command(BaseCommand):
    help = "Load demo CSVs from data/generated and create demo users (idempotent)."

    def handle(self, *args, **options):
        if not DATA_DIR.is_dir():
            raise SystemExit(f"Missing data directory: {DATA_DIR}")

        self.stdout.write(f"Loading from {DATA_DIR}")

        with transaction.atomic():
            self._clear()
            self._load_org()
            self._load_pulse()
            self._load_rest()
            self._create_demo_users()

        emp_count = Employee.objects.count()
        self.stdout.write(self.style.SUCCESS(f"seed_demo complete: {emp_count} employees"))

    def _clear(self) -> None:
        # Reverse dependency order
        WeeklyMetric.objects.all().delete()
        EmployeeCurrent.objects.all().delete()
        Skill.objects.all().delete()
        Recognition.objects.all().delete()
        Idea.objects.all().delete()
        Intervention.objects.all().delete()
        EconomicImpactMonthly.objects.all().delete()
        # Clear circular heads before deleting employees
        Department.objects.update(head=None)
        Team.objects.update(head=None)
        Employee.objects.update(manager=None)
        Employee.objects.all().delete()
        Team.objects.all().delete()
        Department.objects.all().delete()

    def _load_org(self) -> None:
        dept_rows = _read_csv("departments.csv")
        team_rows = _read_csv("teams.csv")
        emp_rows = _read_csv("employees.csv")

        departments = [
            Department(
                id=_int(r["id"]),
                name=r["name"],
                head=None,
                headcount=_int(r["headcount"]),
            )
            for r in dept_rows
        ]
        _bulk(Department, departments)

        teams = [
            Team(
                id=_int(r["id"]),
                name=r["name"],
                department_id=_int(r["department_id"]),
                head=None,
                headcount=_int(r["headcount"]),
            )
            for r in team_rows
        ]
        _bulk(Team, teams)

        employees = []
        for r in emp_rows:
            employees.append(
                Employee(
                    id=_int(r["id"]),
                    employee_code=r["employee_code"],
                    first_name=r["first_name"],
                    last_name=r["last_name"],
                    full_name=r["full_name"],
                    email=r["email"],
                    gender=r["gender"],
                    age=_int(r["age"]),
                    job_title=r["job_title"],
                    job_level=_int(r["job_level"]),
                    department_id=_int(r["department_id"]),
                    team_id=_int_or_none(r["team_id"]),
                    hire_date=_date(r["hire_date"]),
                    tenure_years=_float(r["tenure_years"]),
                    monthly_income_sar=_int(r["monthly_income_sar"]),
                    income_ratio=_float(r["income_ratio"]),
                    years_since_promotion=_float(r["years_since_promotion"]),
                    work_location=r["work_location"],
                    work_mode=r["work_mode"],
                    app_role=r["app_role"],
                    is_manager=_bool01(r["is_manager"]),
                    is_demo_person=_bool01(r["is_demo_person"]),
                    manager=None,
                )
            )
        _bulk(Employee, employees)

        # Second pass: managers
        manager_updates = []
        for r in emp_rows:
            mid = _int_or_none(r["manager_id"])
            if mid is not None:
                manager_updates.append(Employee(id=_int(r["id"]), manager_id=mid))
        if manager_updates:
            Employee.objects.bulk_update(manager_updates, ["manager_id"], batch_size=BATCH)

        # Department / team heads
        dept_heads = []
        for r in dept_rows:
            hid = _int_or_none(r["head_id"])
            if hid is not None:
                dept_heads.append(Department(id=_int(r["id"]), head_id=hid))
        if dept_heads:
            Department.objects.bulk_update(dept_heads, ["head_id"], batch_size=BATCH)

        team_heads = []
        for r in team_rows:
            hid = _int_or_none(r["head_id"])
            if hid is not None:
                team_heads.append(Team(id=_int(r["id"]), head_id=hid))
        if team_heads:
            Team.objects.bulk_update(team_heads, ["head_id"], batch_size=BATCH)

        self.stdout.write(
            f"  org: {len(departments)} departments, {len(teams)} teams, {len(employees)} employees"
        )

    def _load_pulse(self) -> None:
        current_rows = _read_csv("employee_current.csv")
        currents = [
            EmployeeCurrent(
                employee_id=_int(r["employee_id"]),
                as_of=_date(r["as_of"]),
                workload_index=_float(r["workload_index"]),
                overtime_hours_monthly=_float(r["overtime_hours_monthly"]),
                work_life_balance=_float(r["work_life_balance"]),
                job_satisfaction=_float(r["job_satisfaction"]),
                mood_score=_float(r["mood_score"]),
                engagement_score=_float(r["engagement_score"]),
                absence_days_annual=_float(r["absence_days_annual"]),
                recognition_90d=_int(r["recognition_90d"]),
                training_times_last_year=_int(r["training_times_last_year"]),
                ideas_submitted_12m=_int(r["ideas_submitted_12m"]),
                ideas_approved_12m=_int(r["ideas_approved_12m"]),
                ideas_implemented_12m=_int(r["ideas_implemented_12m"]),
                innovation_score=_float(r["innovation_score"]),
                task_completion_rate=_float(r["task_completion_rate"]),
                task_quality_score=_float(r["task_quality_score"]),
                collaboration_score=_float(r["collaboration_score"]),
                performance_score=_int(r["performance_score"]),
                performance_tier=r["performance_tier"],
                wellbeing_score=_int(r["wellbeing_score"]),
                burnout_risk_pct=_int(r["burnout_risk_pct"]),
                burnout_level=r["burnout_level"],
                attrition_risk_pct=_int(r["attrition_risk_pct"]),
                attrition_level=r["attrition_level"],
                burnout_drivers=r["burnout_drivers"],
                attrition_drivers=r["attrition_drivers"],
                burnout_change_6w_pts=_int(r["burnout_change_6w_pts"]),
            )
            for r in current_rows
        ]
        _bulk(EmployeeCurrent, currents)

        weekly_rows = _read_csv("weekly_metrics.csv")
        weeklies = [
            WeeklyMetric(
                employee_id=_int(r["employee_id"]),
                week_start=_date(r["week_start"]),
                workload_index=_float(r["workload_index"]),
                overtime_hours_monthly=_float(r["overtime_hours_monthly"]),
                mood_score=_float(r["mood_score"]),
                engagement_score=_float(r["engagement_score"]),
                wellbeing_score=_float(r["wellbeing_score"]),
                performance_score=_float(r["performance_score"]),
                burnout_risk_pct=_float(r["burnout_risk_pct"]),
                pulse_submitted=_bool01(r["pulse_submitted"]),
            )
            for r in weekly_rows
        ]
        _bulk(WeeklyMetric, weeklies)

        skill_rows = _read_csv("skills.csv")
        skills = [
            Skill(
                id=_int(r["id"]),
                employee_id=_int(r["employee_id"]),
                skill=r["skill"],
                category=r["category"],
                level=_int(r["level"]),
            )
            for r in skill_rows
        ]
        _bulk(Skill, skills)

        self.stdout.write(
            f"  pulse: {len(currents)} current, {len(weeklies)} weekly, {len(skills)} skills"
        )

    def _load_rest(self) -> None:
        intervention_rows = _read_csv("interventions.csv")
        interventions = [
            Intervention(
                id=_int(r["id"]),
                employee_id=_int(r["employee_id"]),
                type=r["type"],
                rationale=r["rationale"],
                driver=r["driver"],
                status=r["status"],
                proposed_by=r["proposed_by"],
                owner_id=_int(r["owner_id"]),
                approved_by_id=_int_or_none(r["approved_by_id"]),
                created_at=_date(r["created_at"]),
                approved_at=_date_or_none(r["approved_at"]),
                started_at=_date_or_none(r["started_at"]),
                completed_at=_date_or_none(r["completed_at"]),
                followup_at=_date_or_none(r["followup_at"]),
                expected_risk_reduction_pts=_int(r["expected_risk_reduction_pts"]),
                cost_sar=_int(r["cost_sar"]),
                human_approved=_bool01(r["human_approved"]),
                baseline_risk_pct=_int(r["baseline_risk_pct"]),
                followup_risk_pct=_float_or_none(r["followup_risk_pct"]),
                outcome=r["outcome"],
            )
            for r in intervention_rows
        ]
        _bulk(Intervention, interventions)

        idea_rows = _read_csv("ideas.csv")
        ideas = [
            Idea(
                id=_int(r["id"]),
                employee_id=_int(r["employee_id"]),
                title=r["title"],
                category=r["category"],
                status=r["status"],
                novelty_score=_float(r["novelty_score"]),
                feasibility_score=_float(r["feasibility_score"]),
                business_value_score=_float(r["business_value_score"]),
                submitted_at=_date(r["submitted_at"]),
                decided_at=_date_or_none(r["decided_at"]),
                implemented_at=_date_or_none(r["implemented_at"]),
                estimated_value_sar=_float_or_none(r["estimated_value_sar"]),
                realized_value_sar=_float_or_none(r["realized_value_sar"]),
            )
            for r in idea_rows
        ]
        _bulk(Idea, ideas)

        recognition_rows = _read_csv("recognitions.csv")
        recognitions = [
            Recognition(
                id=_int(r["id"]),
                giver_id=_int(r["giver_id"]),
                receiver_id=_int(r["receiver_id"]),
                type=r["type"],
                message=r["message"],
                created_at=_date(r["created_at"]),
                is_public=_bool01(r["is_public"]),
            )
            for r in recognition_rows
        ]
        _bulk(Recognition, recognitions)

        econ_rows = _read_csv("economic_impact_monthly.csv")
        economics = [
            EconomicImpactMonthly(
                month=_date(r["month"]),
                department_id=_int(r["department_id"]),
                headcount=_int(r["headcount"]),
                avg_burnout_risk_pct=_float(r["avg_burnout_risk_pct"]),
                avg_wellbeing_score=_float(r["avg_wellbeing_score"]),
                avg_performance_score=_float(r["avg_performance_score"]),
                interventions_completed=_int(r["interventions_completed"]),
                ideas_implemented=_int(r["ideas_implemented"]),
                expected_exits_baseline=_float(r["expected_exits_baseline"]),
                exits_avoided=_float(r["exits_avoided"]),
                retention_savings_sar=_float(r["retention_savings_sar"]),
                productivity_gain_sar=_float(r["productivity_gain_sar"]),
                innovation_value_sar=_float(r["innovation_value_sar"]),
                program_cost_sar=_float(r["program_cost_sar"]),
                net_impact_sar=_float(r["net_impact_sar"]),
                roi_pct=_float(r["roi_pct"]),
            )
            for r in econ_rows
        ]
        _bulk(EconomicImpactMonthly, economics)

        self.stdout.write(
            f"  rest: {len(interventions)} interventions, {len(ideas)} ideas, "
            f"{len(recognitions)} recognitions, {len(economics)} economic rows"
        )

    def _create_demo_users(self) -> None:
        for spec in DEMO_USERS:
            email = spec["email"]
            try:
                employee = Employee.objects.get(email=email)
            except Employee.DoesNotExist as exc:
                raise SystemExit(f"Demo employee missing for {email}") from exc

            user, created = User.objects.get_or_create(
                username=email,
                defaults={
                    "email": email,
                    "first_name": employee.first_name,
                    "last_name": employee.last_name,
                    "is_staff": True,
                },
            )
            user.email = email
            user.first_name = employee.first_name
            user.last_name = employee.last_name
            user.is_staff = True
            user.set_password(spec["password"])
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.employee = employee
            profile.role = spec["role"]
            profile.save()

            action = "created" if created else "updated"
            self.stdout.write(
                f"  user {action}: {email} -> {employee.full_name} ({spec['role']})"
            )
