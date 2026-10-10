from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AuditLog, UserProfile
from analytics.aggregates import aggregate_or_suppress, suppress_small_group
from org.models import Department, Employee, Team


class PrivacyFixturesMixin:
    """Minimal org graph for auth/privacy tests (no seed_demo dependency)."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.dept = Department.objects.create(id=1, name="Engineering", headcount=10)
        self.team = Team.objects.create(
            id=1,
            name="Platform Reliability",
            department=self.dept,
            headcount=9,
        )
        self.other_team = Team.objects.create(
            id=2,
            name="Customer Insights",
            department=self.dept,
            headcount=8,
        )

        self.manager_emp = Employee.objects.create(
            id=100,
            employee_code="HZ0100",
            first_name="Yasmin",
            last_name="Hadi",
            full_name="Yasmin Hadi",
            email="yasmin@horizon.demo",
            gender="F",
            age=38,
            job_title="Engineering Manager",
            job_level=4,
            department=self.dept,
            team=self.team,
            hire_date=date(2018, 1, 1),
            tenure_years=8.0,
            monthly_income_sar=25000,
            income_ratio=1.0,
            years_since_promotion=2.0,
            work_location="Riyadh",
            work_mode="Hybrid",
            app_role="manager",
            is_manager=True,
            is_demo_person=True,
            manager=None,
        )
        self.report_a = Employee.objects.create(
            id=101,
            employee_code="HZ0101",
            first_name="Khalid",
            last_name="Mansour",
            full_name="Khalid Mansour",
            email="khalid@horizon.demo",
            gender="M",
            age=31,
            job_title="Platform Engineer",
            job_level=2,
            department=self.dept,
            team=self.team,
            hire_date=date(2020, 3, 1),
            tenure_years=6.0,
            monthly_income_sar=18000,
            income_ratio=1.0,
            years_since_promotion=1.0,
            work_location="Riyadh",
            work_mode="Hybrid",
            app_role="employee",
            is_manager=False,
            is_demo_person=True,
            manager=self.manager_emp,
        )
        self.report_b = Employee.objects.create(
            id=102,
            employee_code="HZ0102",
            first_name="Tariq",
            last_name="Zaki",
            full_name="Tariq Zaki",
            email="tariq@horizon.demo",
            gender="M",
            age=29,
            job_title="Platform Engineer",
            job_level=2,
            department=self.dept,
            team=self.team,
            hire_date=date(2021, 6, 1),
            tenure_years=4.0,
            monthly_income_sar=17000,
            income_ratio=1.0,
            years_since_promotion=1.0,
            work_location="Riyadh",
            work_mode="Hybrid",
            app_role="employee",
            is_manager=False,
            is_demo_person=False,
            manager=self.manager_emp,
        )
        self.outsider = Employee.objects.create(
            id=201,
            employee_code="HZ0201",
            first_name="Layla",
            last_name="Haddad",
            full_name="Layla Haddad",
            email="layla@horizon.demo",
            gender="F",
            age=33,
            job_title="Senior Data Analyst",
            job_level=3,
            department=self.dept,
            team=self.other_team,
            hire_date=date(2019, 5, 1),
            tenure_years=7.0,
            monthly_income_sar=20000,
            income_ratio=1.0,
            years_since_promotion=1.5,
            work_location="Riyadh",
            work_mode="Hybrid",
            app_role="employee",
            is_manager=False,
            is_demo_person=True,
            manager=None,
        )
        self.hr_emp = Employee.objects.create(
            id=300,
            employee_code="HZ0300",
            first_name="Rana",
            last_name="Aziz",
            full_name="Rana Aziz",
            email="rana@horizon.demo",
            gender="F",
            age=45,
            job_title="Chief People Officer",
            job_level=5,
            department=self.dept,
            team=None,
            hire_date=date(2015, 1, 1),
            tenure_years=11.0,
            monthly_income_sar=40000,
            income_ratio=1.0,
            years_since_promotion=3.0,
            work_location="Riyadh",
            work_mode="Hybrid",
            app_role="hr",
            is_manager=False,
            is_demo_person=True,
            manager=None,
        )

        self.employee_user = self._make_user(
            "layla@horizon.demo", self.outsider, UserProfile.Role.EMPLOYEE
        )
        self.manager_user = self._make_user(
            "yasmin@horizon.demo", self.manager_emp, UserProfile.Role.MANAGER
        )
        self.hr_user = self._make_user(
            "rana@horizon.demo", self.hr_emp, UserProfile.Role.HR
        )
        self.exec_user = self._make_user(
            "exec@horizon.demo", None, UserProfile.Role.EXECUTIVE
        )

    def _make_user(self, email: str, employee, role: str) -> User:
        user = User.objects.create_user(
            username=email,
            email=email,
            password="empulse123",
            first_name=(employee.first_name if employee else "Exec"),
            last_name=(employee.last_name if employee else "User"),
        )
        UserProfile.objects.create(user=user, employee=employee, role=role)
        return user

    def _auth(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")


class AuthApiTests(PrivacyFixturesMixin, TestCase):
    def test_login_returns_tokens(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "layla@horizon.demo", "password": "empulse123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_invalid_credentials_returns_code(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "layla@horizon.demo", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["code"], "auth.invalid_credentials")

    def test_refresh_token(self):
        login = self.client.post(
            "/api/auth/login/",
            {"email": "layla@horizon.demo", "password": "empulse123"},
            format="json",
        )
        response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_me_returns_role_employee_id_name_team(self):
        self._auth(self.employee_user)
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "employee")
        self.assertEqual(response.data["employee_id"], self.outsider.id)
        self.assertEqual(response.data["name"], "Layla Haddad")
        self.assertEqual(response.data["team"], "Customer Insights")
        self.assertEqual(response.data["email"], "layla@horizon.demo")


class PrivacyApiTests(PrivacyFixturesMixin, TestCase):
    def test_employee_cannot_read_another_employee(self):
        self._auth(self.employee_user)
        response = self.client.get(f"/api/employees/{self.report_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "error.not_found")

        own = self.client.get(f"/api/employees/{self.outsider.id}/")
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertEqual(own.data["id"], self.outsider.id)

    def test_manager_cannot_read_outside_team(self):
        self._auth(self.manager_user)
        outside = self.client.get(f"/api/employees/{self.outsider.id}/")
        self.assertEqual(outside.status_code, status.HTTP_404_NOT_FOUND)

        report = self.client.get(f"/api/employees/{self.report_a.id}/")
        self.assertEqual(report.status_code, status.HTTP_200_OK)
        self.assertEqual(report.data["id"], self.report_a.id)

        listing = self.client.get("/api/employees/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in listing.data}
        self.assertEqual(ids, {self.report_a.id, self.report_b.id})

    def test_hr_profile_read_writes_audit_log(self):
        self._auth(self.hr_user)
        before = AuditLog.objects.count()
        response = self.client.get(f"/api/employees/{self.outsider.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(AuditLog.objects.count(), before + 1)
        log = AuditLog.objects.latest("created_at")
        self.assertEqual(log.actor_id, self.hr_user.id)
        self.assertEqual(log.employee_id, self.outsider.id)
        self.assertEqual(log.action, AuditLog.Action.EMPLOYEE_PROFILE_READ)

    def test_executive_denied_individual_access(self):
        self._auth(self.exec_user)
        response = self.client.get(f"/api/employees/{self.outsider.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "privacy.executive_aggregates_only")


class AggregateSuppressionTests(TestCase):
    def test_small_group_is_suppressed(self):
        result = suppress_small_group(4, {"avg": 72})
        self.assertEqual(result, {"suppressed": True})

        result = aggregate_or_suppress(
            [1, 2, 3, 4],
            lambda rows: {"avg": sum(rows) / len(rows)},
        )
        self.assertTrue(result["suppressed"])
        self.assertNotIn("avg", result)

    def test_large_enough_group_returns_payload(self):
        result = aggregate_or_suppress(
            [10, 20, 30, 40, 50],
            lambda rows: {"avg": sum(rows) / len(rows)},
        )
        self.assertFalse(result["suppressed"])
        self.assertEqual(result["n"], 5)
        self.assertEqual(result["avg"], 30.0)
