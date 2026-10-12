"""PulseAI shared engine: privacy, refusal, fallback, AuditLog."""

from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AuditLog, UserProfile
from accounts.tests import PrivacyFixturesMixin
from org.models import Employee
from pulse.models import EmployeeCurrent


def _current_kwargs(emp: Employee, **over) -> dict:
    base = dict(
        employee=emp,
        as_of=date(2026, 9, 20),
        workload_index=110,
        overtime_hours_monthly=22,
        work_life_balance=2.0,
        job_satisfaction=2.5,
        mood_score=3.0,
        engagement_score=58,
        absence_days_annual=4,
        recognition_90d=0,
        training_times_last_year=1,
        ideas_submitted_12m=2,
        ideas_approved_12m=1,
        ideas_implemented_12m=0,
        innovation_score=72,
        task_completion_rate=88,
        task_quality_score=80,
        collaboration_score=75,
        performance_score=82,
        performance_tier="silver",
        wellbeing_score=60,
        burnout_risk_pct=55,
        burnout_level="moderate",
        attrition_risk_pct=25,
        attrition_level="low",
        burnout_drivers="[]",
        attrition_drivers="[]",
        burnout_change_6w_pts=1,
    )
    base.update(over)
    return base


@override_settings(GEMINI_API_KEY="")
class PulseAIEngineTests(PrivacyFixturesMixin, TestCase):
    def setUp(self):
        super().setUp()
        for emp in (self.outsider, self.report_a, self.report_b, self.manager_emp):
            if not EmployeeCurrent.objects.filter(employee=emp).exists():
                EmployeeCurrent.objects.create(**_current_kwargs(emp))
        # Pad manager team to ≥5 for aggregate tools
        for i in range(5):
            emp = Employee.objects.create(
                id=800 + i,
                employee_code=f"PAI{i:03d}",
                full_name=f"Pulse Extra {i}",
                first_name="Pulse",
                last_name=f"E{i}",
                email=f"pai{i}@horizon.demo",
                gender="F",
                age=28 + i,
                department=self.report_a.department,
                team=self.report_a.team,
                manager=self.manager_emp,
                job_title="Analyst",
                job_level=2,
                hire_date=date(2023, 1, 1),
                work_mode="Hybrid",
                work_location="Riyadh",
                tenure_years=3.0,
                monthly_income_sar=14000,
                income_ratio=1.0,
                years_since_promotion=1.0,
                app_role="employee",
                is_manager=False,
                is_demo_person=False,
            )
            EmployeeCurrent.objects.create(**_current_kwargs(emp, burnout_risk_pct=62 + i))

    def _auth(self, user: User):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_employee_cannot_get_team_data(self):
        self._auth(self.employee_user)
        response = self.client.post(
            "/api/me/pulseai/",
            {"question": "What is my team's burnout?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("refused"))
        self.assertNotIn("team_burnout_summary", response.data.get("tools_called") or [])
        # Allowed own-data question
        ok = self.client.post(
            "/api/me/pulseai/",
            {"question": "How am I doing this quarter?"},
            format="json",
        )
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertFalse(ok.data.get("refused"))
        self.assertTrue(ok.data.get("own_data_only"))
        self.assertIn("my_summary", ok.data.get("tools_called") or [])

    def test_manager_cannot_get_outsiders(self):
        self._auth(self.manager_user)
        response = self.client.post(
            "/api/manager/pulseai/",
            {"question": "What are the main burnout drivers?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("refused"))
        # Tool results must not include outsider id / name
        blob = str(response.data)
        self.assertNotIn(self.outsider.full_name, blob)
        self.assertNotIn(str(self.outsider.id), blob)
        self.assertFalse(response.data.get("individuals_included"))

    def test_executive_gets_no_individuals(self):
        self._auth(self.exec_user)
        response = self.client.post(
            "/api/hr/pulseai/",
            {"question": "What are the systemic burnout drivers across the organization?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("executive_aggregates_only"))
        self.assertFalse(response.data.get("individuals_included"))
        blob = str(response.data)
        self.assertNotIn(self.report_a.full_name, blob)
        self.assertNotIn(self.outsider.full_name, blob)

    def test_fallback_without_gemini_key(self):
        self._auth(self.employee_user)
        response = self.client.post(
            "/api/me/pulseai/",
            {"question": "Summarise my progress this quarter"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("engine"), "rules")
        self.assertFalse(response.data.get("stub", True))
        self.assertIn("disclaimer", response.data)
        self.assertIn("Decision support", response.data["disclaimer"])

    def test_refusal_on_ranking(self):
        self._auth(self.manager_user)
        response = self.client.post(
            "/api/manager/pulseai/",
            {"question": "Rank my team by performance on a leaderboard"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("refused"))
        self.assertEqual(response.data.get("refusal_reason"), "rank")
        self.assertIn("data_used", response.data)
        self.assertIn("findings", response.data)
        self.assertIn("recommendation", response.data)

    def test_audit_log_written(self):
        before = AuditLog.objects.filter(action=AuditLog.Action.PULSEAI_QUERY).count()
        self._auth(self.hr_user)
        response = self.client.post(
            "/api/hr/pulseai/",
            {"question": "Where is recognition not reaching people?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        after = AuditLog.objects.filter(action=AuditLog.Action.PULSEAI_QUERY).count()
        self.assertEqual(after, before + 1)
        log = AuditLog.objects.filter(action=AuditLog.Action.PULSEAI_QUERY).latest(
            "created_at"
        )
        self.assertIn("tools", log.metadata)
        # Employee questions must not store question text
        self._auth(self.employee_user)
        self.client.post(
            "/api/me/pulseai/",
            {"question": "SECRET_QUESTION_SHOULD_NOT_BE_LOGGED"},
            format="json",
        )
        emp_log = (
            AuditLog.objects.filter(
                action=AuditLog.Action.PULSEAI_QUERY, actor=self.employee_user
            )
            .latest("created_at")
        )
        self.assertNotIn("SECRET_QUESTION_SHOULD_NOT_BE_LOGGED", str(emp_log.metadata))

    def test_arabic_language_detection(self):
        self._auth(self.employee_user)
        response = self.client.post(
            "/api/me/pulseai/",
            {"question": "كيف حالي هذا الربع؟"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("language"), "ar")
