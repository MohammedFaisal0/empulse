from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserProfile
from org.models import Department, Employee, Team
from pulse.models import EmployeeCurrent


class ManagerBurnoutApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        dept = Department.objects.create(id=1, name="Engineering", headcount=3)
        team = Team.objects.create(
            id=1, name="Platform Reliability", department=dept, headcount=2
        )
        self.manager = Employee.objects.create(
            id=10,
            employee_code="HZ0010",
            first_name="Yasmin",
            last_name="Hadi",
            full_name="Yasmin Hadi",
            email="yasmin@horizon.demo",
            gender="F",
            age=38,
            job_title="Engineering Manager",
            job_level=4,
            department=dept,
            team=team,
            hire_date=date(2018, 1, 1),
            tenure_years=8,
            monthly_income_sar=25000,
            income_ratio=1,
            years_since_promotion=2,
            work_location="Riyadh",
            work_mode="Hybrid",
            app_role="manager",
            is_manager=True,
        )
        self.khalid = Employee.objects.create(
            id=944,
            employee_code="HZ0944",
            first_name="Khalid",
            last_name="Mansour",
            full_name="Khalid Mansour",
            email="khalid@horizon.demo",
            gender="M",
            age=31,
            job_title="Platform Engineer",
            job_level=2,
            department=dept,
            team=team,
            hire_date=date(2020, 1, 1),
            tenure_years=6,
            monthly_income_sar=18000,
            income_ratio=1,
            years_since_promotion=1,
            work_location="Riyadh",
            work_mode="Hybrid",
            app_role="employee",
            manager=self.manager,
        )
        EmployeeCurrent.objects.create(
            employee=self.khalid,
            as_of=date(2026, 10, 5),
            workload_index=79,
            overtime_hours_monthly=24,
            work_life_balance=1.8,
            job_satisfaction=2,
            mood_score=2.6,
            engagement_score=71,
            absence_days_annual=2,
            recognition_90d=1,
            training_times_last_year=1,
            ideas_submitted_12m=2,
            ideas_approved_12m=1,
            ideas_implemented_12m=0,
            innovation_score=70,
            task_completion_rate=90,
            task_quality_score=92,
            collaboration_score=88,
            performance_score=91,
            performance_tier="Gold",
            wellbeing_score=48,
            burnout_risk_pct=72,
            burnout_level="High",
            attrition_risk_pct=40,
            attrition_level="Moderate",
            burnout_drivers='{"increasing":[{"feature":"workload_index","label":"Workload","value":79,"baseline_value":66,"impact_pts":12.8}],"protective":[]}',
            attrition_drivers="{}",
            burnout_change_6w_pts=26,
        )
        user = User.objects.create_user(
            username="yasmin@horizon.demo",
            email="yasmin@horizon.demo",
            password="empulse123",
        )
        UserProfile.objects.create(
            user=user, employee=self.manager, role=UserProfile.Role.MANAGER
        )
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_burnout_returns_stored_risk_and_drivers(self):
        response = self.client.get("/api/manager/burnout/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["attention_count"], 1)
        person = response.data["people"][0]
        self.assertEqual(person["full_name"], "Khalid Mansour")
        self.assertEqual(person["burnout_risk_pct"], 72)
        self.assertEqual(person["drivers"]["increasing"][0]["label"], "Workload")

    def test_member_profile(self):
        response = self.client.get(f"/api/manager/members/{self.khalid.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["full_name"], "Khalid Mansour")
        self.assertEqual(response.data["current"]["burnout_risk_pct"], 72)
