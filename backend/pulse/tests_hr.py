"""HR / Executive privacy: audited individuals, aggregates, suppression."""

from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AuditLog, UserProfile
from accounts.tests import PrivacyFixturesMixin
from analytics.aggregates import aggregate_or_suppress
from org.models import Employee
from pulse.models import EmployeeCurrent


class HrEndpointsPrivacyTests(PrivacyFixturesMixin, TestCase):
    def setUp(self):
        super().setUp()
        for emp in (self.outsider, self.report_a, self.report_b):
            if not hasattr(emp, "current") or not EmployeeCurrent.objects.filter(
                employee=emp
            ).exists():
                EmployeeCurrent.objects.create(
                    employee=emp,
                    as_of=date(2026, 9, 20),
                    workload_index=70,
                    overtime_hours_monthly=4,
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

    def test_executive_cannot_read_individual_hr_profile(self):
        self._auth(self.exec_user)
        response = self.client.get(f"/api/hr/employees/{self.outsider.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "privacy.executive_aggregates_only")

    def test_executive_cannot_list_hr_directory(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/employees/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "privacy.executive_aggregates_only")

    def test_executive_can_read_aggregate_pulse(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/executive-pulse/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("no_people_ranking"))
        self.assertIn("organization", response.data)
        self.assertIn("heartbeat", response.data)
        self.assertIn("department_rings", response.data)
        self.assertIn("burnout_heatmap", response.data)
        self.assertIn("capability", response.data)
        self.assertIn("signals", response.data)
        self.assertEqual(response.data.get("suppression_min"), 5)

    def test_hr_profile_read_creates_audit_log(self):
        self._auth(self.hr_user)
        before = AuditLog.objects.count()
        response = self.client.get(f"/api/hr/employees/{self.outsider.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.outsider.id)
        self.assertEqual(AuditLog.objects.count(), before + 1)
        log = AuditLog.objects.latest("created_at")
        self.assertEqual(log.actor_id, self.hr_user.id)
        self.assertEqual(log.employee_id, self.outsider.id)
        self.assertEqual(log.action, AuditLog.Action.EMPLOYEE_PROFILE_READ)

    def test_hr_directory_alphabetical_not_by_score(self):
        self._auth(self.hr_user)
        response = self.client.get("/api/hr/employees/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sorted_by"], "full_name")
        self.assertTrue(response.data["no_score_sort"])
        self.assertIn("summary", response.data)
        self.assertEqual(response.data["page_size"], 50)
        names = [p["full_name"] for p in response.data["people"]]
        self.assertEqual(names, sorted(names))
        for p in response.data["people"]:
            self.assertIn("wellbeing_alert", p)
            self.assertNotIn("wellbeing_score", p)

    def test_hr_directory_export_creates_audit_log(self):
        self._auth(self.hr_user)
        before = AuditLog.objects.count()
        response = self.client.get("/api/hr/employees/export/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertEqual(AuditLog.objects.count(), before + 1)
        log = AuditLog.objects.latest("created_at")
        self.assertEqual(log.actor_id, self.hr_user.id)
        self.assertEqual(log.action, AuditLog.Action.EXPORT)

    def test_executive_cannot_export_directory(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/employees/export/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "privacy.executive_aggregates_only")

    def test_small_groups_suppressed_in_organization(self):
        """Teams under 5 stay suppressed in H02 payload."""
        self._auth(self.hr_user)
        # Fixture team has only 2 reports with current — under 5.
        response = self.client.get("/api/hr/organization/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("suppression_min"), 5)
        # At least one team cell should be suppressed in the tiny fixture graph.
        suppressed_any = False
        for dept in response.data["departments"]:
            for team in dept.get("teams", []):
                if team.get("suppressed"):
                    suppressed_any = True
                    self.assertNotIn("performance", team)
        self.assertTrue(suppressed_any)

    def test_aggregate_helper_suppresses_under_five(self):
        result = aggregate_or_suppress(
            [1, 2, 3, 4],
            lambda rows: {"avg": sum(rows) / len(rows)},
        )
        self.assertTrue(result["suppressed"])
        self.assertNotIn("avg", result)

    def test_executive_can_access_batch3b_aggregates(self):
        self._auth(self.exec_user)
        for path in (
            "/api/hr/teams/",
            "/api/hr/performance/",
            "/api/hr/burnout-intelligence/",
            "/api/hr/morale/",
        ):
            response = self.client.get(path)
            self.assertEqual(response.status_code, status.HTTP_200_OK, path)
            self.assertTrue(response.data.get("no_people_ranking"))
            self.assertEqual(response.data.get("suppression_min"), 5)

    def test_executive_cannot_read_team_members(self):
        self._auth(self.exec_user)
        team_id = self.report_a.team_id
        response = self.client.get(f"/api/hr/teams/{team_id}/members/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "privacy.executive_aggregates_only")

    def test_executive_performance_hides_individuals(self):
        self._auth(self.exec_user)
        response = self.client.get(
            f"/api/hr/performance/?team_id={self.report_a.team_id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("executive_individuals_hidden"))
        self.assertIsNone(response.data.get("people"))

    def test_hr_team_members_alphabetical(self):
        self._auth(self.hr_user)
        team_id = self.report_a.team_id
        response = self.client.get(f"/api/hr/teams/{team_id}/members/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sorted_by"], "full_name")
        names = [p["full_name"] for p in response.data["people"]]
        self.assertEqual(names, sorted(names))

    def test_morale_suppresses_small_teams(self):
        self._auth(self.hr_user)
        response = self.client.get("/api/hr/morale/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Fixture teams are under 5 — spectrum should omit them.
        for row in response.data.get("spectrum", []):
            self.assertGreaterEqual(row["n"], 5)

    def test_executive_can_access_batch3c_aggregates(self):
        self._auth(self.exec_user)
        for path in (
            "/api/hr/innovation/",
            "/api/hr/recognition/",
            "/api/hr/interventions/",
            "/api/hr/matrix/",
        ):
            response = self.client.get(path)
            self.assertEqual(response.status_code, status.HTTP_200_OK, path)
            self.assertTrue(response.data.get("no_people_ranking"))
            self.assertEqual(response.data.get("suppression_min"), 5)

    def test_executive_cannot_get_matrix_individuals(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/matrix/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("executive_individuals_hidden"))
        self.assertIsNone(response.data.get("people"))
        self.assertIn("counts", response.data)
        self.assertIn("by_department", response.data)

    def test_executive_cannot_get_intervention_individuals(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/interventions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("executive_individuals_hidden"))
        self.assertIsNone(response.data.get("interventions"))
        self.assertIsNone(response.data.get("signal_proposals"))
        self.assertIsNone(response.data.get("featured"))

    def test_executive_cannot_get_innovation_public_authors(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/innovation/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("executive_individuals_hidden"))
        self.assertIsNone(response.data.get("public_ideas"))

    def test_recognition_has_no_most_recognized_list(self):
        self._auth(self.hr_user)
        response = self.client.get("/api/hr/recognition/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("no_most_recognized_list"))
        self.assertNotIn("most_recognized", response.data)
        self.assertNotIn("people", response.data)

    def test_batch3c_suppresses_small_departments(self):
        self._auth(self.hr_user)
        for path, key in (
            ("/api/hr/innovation/", "participation"),
            ("/api/hr/recognition/", "rate_by_department"),
            ("/api/hr/matrix/", "by_department"),
        ):
            response = self.client.get(path)
            self.assertEqual(response.status_code, status.HTTP_200_OK, path)
            rows = (
                response.data[key].get("by_department", [])
                if key == "participation"
                else response.data.get(key, [])
            )
            for row in rows:
                self.assertFalse(row.get("suppressed"))
                self.assertGreaterEqual(row.get("n", 5), 5)

    def test_hr_approval_writes_audit_log(self):
        from interventions.models import Intervention

        self._auth(self.hr_user)
        emp = self.report_a
        next_id = (
            Intervention.objects.order_by("-id").values_list("id", flat=True).first()
            or 0
        ) + 1
        item = Intervention.objects.create(
            id=next_id,
            employee=emp,
            type="workload_relief",
            rationale="Test approve audit",
            driver="workload",
            status="proposed",
            proposed_by="hr_rule",
            owner=emp,
            created_at=date(2026, 10, 6),
            expected_risk_reduction_pts=15,
            cost_sar=0,
            human_approved=False,
            baseline_risk_pct=68,
            outcome="pending",
        )
        before = AuditLog.objects.count()
        response = self.client.patch(
            f"/api/hr/interventions/{item.id}/",
            {"action": "approve"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "approved")
        self.assertTrue(response.data["human_approved"])
        self.assertEqual(AuditLog.objects.count(), before + 1)
        log = AuditLog.objects.latest("created_at")
        self.assertEqual(log.action, AuditLog.Action.INTERVENTION_APPROVE)
        self.assertEqual(log.employee_id, emp.id)
        self.assertEqual(log.metadata.get("intervention_id"), item.id)

    def test_executive_cannot_approve_intervention(self):
        from interventions.models import Intervention

        self._auth(self.exec_user)
        item = Intervention.objects.filter(status="proposed").first()
        if item is None:
            emp = self.report_a
            next_id = (
                Intervention.objects.order_by("-id")
                .values_list("id", flat=True)
                .first()
                or 0
            ) + 1
            item = Intervention.objects.create(
                id=next_id,
                employee=emp,
                type="workload_relief",
                rationale="Exec deny",
                driver="workload",
                status="proposed",
                proposed_by="hr_rule",
                owner=emp,
                created_at=date(2026, 10, 6),
                expected_risk_reduction_pts=10,
                cost_sar=0,
                human_approved=False,
                baseline_risk_pct=60,
                outcome="pending",
            )
        response = self.client.patch(
            f"/api/hr/interventions/{item.id}/",
            {"action": "approve"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_propose_does_not_auto_start(self):
        self._auth(self.hr_user)
        response = self.client.post(
            "/api/hr/interventions/",
            {
                "employee_id": self.report_a.id,
                "type": "workload_relief",
                "rationale": "Signal-based proposal",
                "driver": "workload",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "proposed")
        self.assertFalse(response.data["human_approved"])
        self.assertTrue(response.data.get("no_auto_start"))

    def test_executive_can_access_batch3d_aggregates(self):
        self._auth(self.exec_user)
        for path in (
            "/api/hr/capability/",
            "/api/hr/economic/",
            "/api/hr/reports/",
            "/api/hr/pulseai/",
        ):
            if path.endswith("pulseai/"):
                response = self.client.post(path, {"question": "test"}, format="json")
            else:
                response = self.client.get(path)
            self.assertEqual(response.status_code, status.HTTP_200_OK, path)
            self.assertTrue(response.data.get("no_people_ranking"))

    def test_executive_capability_hides_spectrum_dots(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/capability/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("executive_individuals_hidden"))
        self.assertIsNone(response.data.get("spectrum"))
        self.assertTrue(response.data.get("not_a_leaderboard"))

    def test_economic_labels_estimates(self):
        self._auth(self.hr_user)
        response = self.client.get("/api/hr/economic/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("values_estimated"))
        self.assertTrue(response.data["kpis"].get("estimated"))
        self.assertTrue(len(response.data.get("assumptions", [])) >= 1)

    def test_report_export_writes_audit_log_csv(self):
        self._auth(self.exec_user)
        before = AuditLog.objects.count()
        response = self.client.get(
            "/api/hr/reports/export/?report=economic_impact&export_format=csv"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertEqual(AuditLog.objects.count(), before + 1)
        log = AuditLog.objects.latest("created_at")
        self.assertEqual(log.action, AuditLog.Action.EXPORT)
        self.assertEqual(log.metadata.get("report"), "economic_impact")
        self.assertEqual(log.metadata.get("format"), "csv")
        self.assertFalse(log.metadata.get("individuals_included"))

    def test_report_export_writes_audit_log_html(self):
        self._auth(self.hr_user)
        before = AuditLog.objects.count()
        response = self.client.get(
            "/api/hr/reports/export/?report=burnout_trends&export_format=html"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/html", response["Content-Type"])
        self.assertEqual(AuditLog.objects.count(), before + 1)
        log = AuditLog.objects.latest("created_at")
        self.assertEqual(log.action, AuditLog.Action.EXPORT)
        self.assertEqual(log.metadata.get("format"), "html")

    def test_reports_have_no_individuals(self):
        self._auth(self.exec_user)
        response = self.client.get("/api/hr/reports/?report=economic_impact")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("executive_safe"))
        self.assertFalse(response.data["report"].get("individuals_included"))
        self.assertNotIn("people", response.data["report"])

    def test_governance_hr_ok_executive_forbidden(self):
        self._auth(self.hr_user)
        response = self.client.get("/api/hr/governance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("hr_admin_only"))
        self.assertIn("audit_log", response.data)
        self.assertIn("privacy_rules", response.data)

        self._auth(self.exec_user)
        response = self.client.get("/api/hr/governance/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.manager_user)
        response = self.client.get("/api/hr/governance/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pulseai_org_stub_aggregates_only(self):
        self._auth(self.exec_user)
        response = self.client.post(
            "/api/hr/pulseai/",
            {"question": "What are the systemic burnout drivers?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("stub"))
        self.assertTrue(response.data.get("no_people_ranking"))
        self.assertTrue(response.data["scope"].get("aggregated"))
        self.assertEqual(response.data["scope"].get("suppression_min"), 5)
