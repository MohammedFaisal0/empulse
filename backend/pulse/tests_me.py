"""Employee /api/me/... privacy: own data only."""

from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserProfile
from accounts.tests import PrivacyFixturesMixin
from innovation.models import Idea, Recognition
from org.models import Employee
from pulse.models import EmployeeCurrent


class MeEndpointsPrivacyTests(PrivacyFixturesMixin, TestCase):
    def setUp(self):
        super().setUp()
        # Ensure outsider (employee_user) has a current snapshot for /api/me/
        EmployeeCurrent.objects.create(
            employee=self.outsider,
            as_of=date(2026, 9, 20),
            workload_index=90,
            overtime_hours_monthly=8,
            work_life_balance=70,
            job_satisfaction=75,
            mood_score=72,
            engagement_score=80,
            absence_days_annual=2,
            recognition_90d=1,
            training_times_last_year=2,
            ideas_submitted_12m=1,
            ideas_approved_12m=0,
            ideas_implemented_12m=0,
            innovation_score=70,
            task_completion_rate=88,
            task_quality_score=85,
            collaboration_score=82,
            performance_score=84,
            performance_tier="silver",
            wellbeing_score=74,
            burnout_risk_pct=32,
            burnout_level="low",
            attrition_risk_pct=18,
            attrition_level="low",
            burnout_drivers="[]",
            attrition_drivers="[]",
            burnout_change_6w_pts=-2,
        )

    def _auth(self, user: User):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_employee_me_overview_returns_own_id_only(self):
        self._auth(self.employee_user)
        response = self.client.get("/api/me/overview/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.outsider.id)
        self.assertEqual(response.data["full_name"], self.outsider.full_name)
        # Spoof query ignored — still own row
        spoof = self.client.get(f"/api/me/overview/?employee_id={self.report_a.id}")
        self.assertEqual(spoof.status_code, status.HTTP_200_OK)
        self.assertEqual(spoof.data["id"], self.outsider.id)
        self.assertNotEqual(spoof.data["id"], self.report_a.id)

    def test_employee_cannot_read_another_employee_profile(self):
        self._auth(self.employee_user)
        response = self.client.get(f"/api/employees/{self.report_a.id}/")
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )

    def test_employee_cannot_read_manager_member_endpoint(self):
        self._auth(self.employee_user)
        response = self.client.get(f"/api/manager/members/{self.report_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_me_twin_is_own(self):
        self._auth(self.employee_user)
        response = self.client.get("/api/me/twin/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.outsider.id)
        self.assertTrue(response.data.get("own"))

    def test_employee_me_performance_no_other_people(self):
        self._auth(self.employee_user)
        response = self.client.get("/api/me/performance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.outsider.id)
        self.assertTrue(response.data.get("no_ranking"))
        self.assertNotIn("people", response.data)
        self.assertNotIn("percentile", response.data)
        self.assertNotIn("rank", response.data)

    def test_layla_cannot_read_another_employee_private_fields_via_me(self):
        """Layla's /api/me/* never returns another person's wellbeing/risk."""
        self._auth(self.employee_user)
        for path in (
            "/api/me/overview/",
            "/api/me/twin/",
            "/api/me/performance/",
            "/api/me/growth/",
            "/api/me/reports/",
        ):
            response = self.client.get(path)
            self.assertEqual(response.status_code, status.HTTP_200_OK, path)
            self.assertEqual(response.data["id"], self.outsider.id, path)
            blob = str(response.data)
            self.assertNotIn(self.report_a.full_name, blob)
            self.assertNotIn("Khalid", blob)

    def test_marketplace_returns_only_public_ideas(self):
        Idea.objects.create(
            id=9001,
            employee=self.report_a,
            title="Private draft idea",
            category="Process",
            status="under_review",
            novelty_score=50,
            feasibility_score=50,
            business_value_score=50,
            submitted_at=date(2026, 9, 1),
            is_public=False,
        )
        Idea.objects.create(
            id=9002,
            employee=self.report_a,
            title="Public approved idea",
            category="Process",
            status="approved",
            novelty_score=60,
            feasibility_score=70,
            business_value_score=80,
            submitted_at=date(2026, 9, 2),
            is_public=True,
        )
        self._auth(self.employee_user)
        response = self.client.get("/api/me/marketplace/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [i["title"] for i in response.data["ideas"]]
        self.assertIn("Public approved idea", titles)
        self.assertNotIn("Private draft idea", titles)
        self.assertTrue(response.data.get("public_only"))
        for idea in response.data["ideas"]:
            self.assertIn("author", idea)
            self.assertIn("first_name", idea["author"])
            self.assertNotIn("wellbeing", idea)
            self.assertNotIn("burnout_risk_pct", idea)
            self.assertNotIn("full_name", idea["author"])

    def test_recognition_wall_returns_only_public_items(self):
        Recognition.objects.create(
            id=9101,
            giver=self.report_a,
            receiver=self.outsider,
            type="Impact",
            message="Private thanks",
            created_at=date(2026, 9, 1),
            is_public=False,
        )
        Recognition.objects.create(
            id=9102,
            giver=self.report_b,
            receiver=self.outsider,
            type="Collaboration",
            message="Public thanks",
            created_at=date(2026, 9, 2),
            is_public=True,
        )
        Recognition.objects.create(
            id=9103,
            giver=self.report_a,
            receiver=self.report_b,
            type="Mentorship",
            message="Also private — never on wall",
            created_at=date(2026, 9, 3),
            is_public=False,
        )
        self._auth(self.employee_user)
        response = self.client.get("/api/me/recognition/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        wall = response.data["wall"]
        wall_msgs = [r["message"] for r in wall]
        wall_ids = [r["id"] for r in wall]
        self.assertIn("Public thanks", wall_msgs)
        self.assertNotIn("Private thanks", wall_msgs)
        self.assertNotIn("Also private — never on wall", wall_msgs)
        self.assertNotIn(9101, wall_ids)
        self.assertNotIn(9103, wall_ids)
        self.assertTrue(response.data.get("public_only"))
        self.assertTrue(response.data.get("no_leaderboard"))
        self.assertEqual(response.data.get("public_count"), 1)
        # Newest first among public rows
        self.assertEqual(wall[0]["id"], 9102)
        for row in wall:
            self.assertTrue(row.get("is_public"))

    def test_non_public_recognitions_never_appear_on_wall(self):
        """Hard rule: is_public=0 rows are excluded from the Wall of Impact."""
        private_ids = []
        for i, msg in enumerate(("secret-a", "secret-b", "secret-c"), start=1):
            rec = Recognition.objects.create(
                id=9200 + i,
                giver=self.report_a,
                receiver=self.outsider,
                type="Impact",
                message=msg,
                created_at=date(2026, 8, i),
                is_public=False,
            )
            private_ids.append(rec.id)
        Recognition.objects.create(
            id=9299,
            giver=self.report_b,
            receiver=self.outsider,
            type="Impact",
            message="visible-public",
            created_at=date(2026, 8, 10),
            is_public=True,
        )
        self._auth(self.employee_user)
        response = self.client.get("/api/me/recognition/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        wall_ids = {r["id"] for r in response.data["wall"]}
        wall_msgs = {r["message"] for r in response.data["wall"]}
        for pid in private_ids:
            self.assertNotIn(pid, wall_ids)
        self.assertNotIn("secret-a", wall_msgs)
        self.assertNotIn("secret-b", wall_msgs)
        self.assertNotIn("secret-c", wall_msgs)
        self.assertIn("visible-public", wall_msgs)
        self.assertEqual(response.data["public_count"], 1)

    def test_pulseai_stub_own_data_only(self):
        self._auth(self.employee_user)
        response = self.client.post(
            "/api/me/pulseai/",
            {"question": "How am I doing?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("stub"))
        self.assertTrue(response.data.get("own_data_only"))
        self.assertIn("data_used", response.data)
        self.assertIn("findings", response.data)
        self.assertIn("recommendation", response.data)
