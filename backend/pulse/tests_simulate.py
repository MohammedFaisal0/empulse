"""H13 What-if Simulator: privacy, AuditLog, zero levers, monotonic sanity."""

from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AuditLog, UserProfile
from accounts.tests import PrivacyFixturesMixin
from org.models import Department, Employee, Team
from pulse.models import EmployeeCurrent


def _current_kwargs(emp: Employee, **over) -> dict:
    base = dict(
        employee=emp,
        as_of=date(2026, 9, 20),
        workload_index=85,
        overtime_hours_monthly=12,
        work_life_balance=2.5,
        job_satisfaction=2.8,
        mood_score=3.2,
        engagement_score=62,
        absence_days_annual=4,
        recognition_90d=1,
        training_times_last_year=2,
        ideas_submitted_12m=1,
        ideas_approved_12m=0,
        ideas_implemented_12m=0,
        innovation_score=70,
        task_completion_rate=80,
        task_quality_score=78,
        collaboration_score=75,
        performance_score=78,
        performance_tier="bronze",
        wellbeing_score=55,
        burnout_risk_pct=48,
        burnout_level="moderate",
        attrition_risk_pct=22,
        attrition_level="low",
        burnout_drivers="[]",
        attrition_drivers="[]",
        burnout_change_6w_pts=2,
    )
    base.update(over)
    return base


class SimulatePrivacyTests(PrivacyFixturesMixin, TestCase):
    def setUp(self):
        super().setUp()
        # Ensure ≥5 people with currents in report_a's team for team-scope sims.
        self.sim_team = self.report_a.team
        self.extras = []
        for i in range(5):
            emp = Employee.objects.create(
                id=900 + i,
                employee_code=f"SIM{i:03d}",
                full_name=f"Sim Person {i}",
                first_name="Sim",
                last_name=f"P{i}",
                email=f"sim{i}@horizon.demo",
                gender="M",
                age=30 + i,
                department=self.report_a.department,
                team=self.sim_team,
                manager=self.manager_emp,
                job_title="Analyst",
                job_level=2,
                hire_date=date(2022, 1, 1),
                work_mode="Hybrid",
                work_location="Riyadh",
                tenure_years=4.0,
                monthly_income_sar=15000,
                income_ratio=1.0,
                years_since_promotion=1.5,
                app_role="employee",
                is_manager=False,
                is_demo_person=False,
            )
            EmployeeCurrent.objects.create(**_current_kwargs(emp))
            self.extras.append(emp)
        for emp in (self.report_a, self.report_b, self.outsider, self.manager_emp):
            if not EmployeeCurrent.objects.filter(employee=emp).exists():
                EmployeeCurrent.objects.create(**_current_kwargs(emp))

    def _auth(self, user: User):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_scope_under_five_suppressed(self):
        # Tiny brand-new team with 2 people
        tiny = Team.objects.create(
            id=99,
            name="Tiny Sim Team",
            department=self.report_a.department,
            headcount=2,
        )
        for i in range(2):
            emp = Employee.objects.create(
                id=990 + i,
                employee_code=f"TINY{i}",
                full_name=f"Tiny {i}",
                first_name="Tiny",
                last_name=str(i),
                email=f"tiny{i}@horizon.demo",
                gender="F",
                age=28,
                department=self.report_a.department,
                team=tiny,
                manager=self.manager_emp,
                job_title="IC",
                job_level=1,
                hire_date=date(2023, 1, 1),
                work_mode="Remote",
                work_location="Riyadh",
                tenure_years=2.0,
                monthly_income_sar=12000,
                income_ratio=1.0,
                years_since_promotion=1.0,
                app_role="employee",
                is_manager=False,
                is_demo_person=False,
            )
            EmployeeCurrent.objects.create(**_current_kwargs(emp))

        self._auth(self.hr_user)
        response = self.client.post(
            "/api/hr/simulate/",
            {"scope": "team", "scope_id": tiny.id, "levers": {}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "privacy.group_too_small")

    def test_executive_gets_aggregates_only(self):
        self._auth(self.exec_user)
        response = self.client.post(
            "/api/hr/simulate/",
            {
                "scope": "department",
                "scope_id": self.report_a.department_id,
                "levers": {"workload_change_pct": -10},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("individuals_included"))
        self.assertTrue(response.data.get("executive_aggregates_only"))
        self.assertTrue(response.data.get("estimated"))
        self.assertNotIn("people_rows", response.data)
        self.assertIn("burnout_risk_avg_pct", response.data)
        self.assertEqual(len(response.data["burnout_risk_avg_pct"]), 2)

    def test_manager_403_by_default(self):
        self._auth(self.manager_user)
        response = self.client.post(
            "/api/hr/simulate/",
            {
                "scope": "team",
                "scope_id": self.sim_team.id,
                "levers": {"workload_change_pct": -10},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(ALLOW_MANAGER_TEAM_SIMULATE=True)
    def test_manager_allowed_own_team_when_setting_on(self):
        self._auth(self.manager_user)
        response = self.client.post(
            "/api/hr/simulate/",
            {
                "scope": "team",
                "scope_id": self.sim_team.id,
                "levers": {"workload_change_pct": -10},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["people"], 5)

    def test_zero_levers_equal_before_after(self):
        self._auth(self.hr_user)
        response = self.client.post(
            "/api/hr/simulate/",
            {"scope": "organization", "levers": {}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in (
            "burnout_risk_avg_pct",
            "high_risk_count",
            "attrition_risk_avg_pct",
            "expected_exits_12m",
            "expected_exit_cost_sar",
        ):
            before, after = response.data[key]
            self.assertEqual(before, after, key)
        self.assertEqual(response.data["estimated_saving_sar"], 0)

    def test_more_workload_reduction_never_increases_burnout(self):
        self._auth(self.hr_user)
        mild = self.client.post(
            "/api/hr/simulate/",
            {
                "scope": "organization",
                "levers": {"workload_change_pct": -5},
            },
            format="json",
        )
        strong = self.client.post(
            "/api/hr/simulate/",
            {
                "scope": "organization",
                "levers": {"workload_change_pct": -20},
            },
            format="json",
        )
        self.assertEqual(mild.status_code, status.HTTP_200_OK)
        self.assertEqual(strong.status_code, status.HTTP_200_OK)
        self.assertLessEqual(
            strong.data["burnout_risk_avg_pct"][1],
            mild.data["burnout_risk_avg_pct"][1],
        )

    def test_simulate_writes_audit_log(self):
        self._auth(self.hr_user)
        before = AuditLog.objects.filter(action=AuditLog.Action.SIMULATE).count()
        response = self.client.post(
            "/api/hr/simulate/",
            {
                "scope": "organization",
                "controls": {"workload_pct": -10, "task_streams": 2},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            AuditLog.objects.filter(action=AuditLog.Action.SIMULATE).count(),
            before + 1,
        )
        log = AuditLog.objects.filter(action=AuditLog.Action.SIMULATE).latest(
            "created_at"
        )
        self.assertEqual(log.metadata.get("scope"), "organization")
        self.assertIn("levers", log.metadata)
        self.assertIn("assumptions", response.data)
        self.assertTrue(response.data["assumptions"].get("estimated"))

    def test_compare_max_three(self):
        self._auth(self.hr_user)
        response = self.client.post(
            "/api/hr/simulate/compare/",
            {
                "scope": "organization",
                "scenarios": [
                    {"label": "A", "levers": {"workload_change_pct": -5}},
                    {"label": "B", "levers": {"workload_change_pct": -10}},
                    {"label": "C", "levers": {"workload_change_pct": -15}},
                    {"label": "D", "levers": {"workload_change_pct": -20}},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
