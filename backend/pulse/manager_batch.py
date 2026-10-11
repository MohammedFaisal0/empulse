"""Manager Batch 1b endpoints: morale, recognition, innovation, interventions, reports, pulseai."""

from __future__ import annotations

from datetime import date, timedelta
from statistics import mean

from django.db.models import Max
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import UserProfile
from accounts.permissions import get_user_employee, get_user_role
from analytics.aggregates import aggregate_or_suppress, suppress_small_group
from innovation.models import Idea, Recognition
from interventions.models import Intervention
from org.privacy import employees_visible_to
from pulse.models import EmployeeCurrent, WeeklyMetric

VALID_INTERVENTION_STATUSES = {
    "proposed",
    "approved",
    "in_progress",
    "completed",
    "declined",
}


def _require_manager(user):
    role = get_user_role(user)
    if role not in (
        UserProfile.Role.MANAGER,
        UserProfile.Role.HR,
        UserProfile.Role.ADMIN,
    ):
        raise ApiError("auth.permission_denied", status_code=403)
    return role


def _report_ids(user):
    return list(
        employees_visible_to(user).order_by("full_name").values_list("id", flat=True)
    )


def _avg(vals):
    return round(mean(vals), 1) if vals else None


class ManagerMoraleView(APIView):
    """GET /api/manager/morale/ — team mood/engagement series (aggregates, n≥5)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def get(self, request):
        _require_manager(request.user)
        ids = _report_ids(request.user)
        n = len(ids)
        series = []
        if ids:
            from collections import defaultdict

            by_week = defaultdict(lambda: {"mood": [], "engagement": [], "workload": [], "burnout": []})
            rows = (
                WeeklyMetric.objects.filter(employee_id__in=ids)
                .order_by("-week_start")
                .values(
                    "week_start",
                    "mood_score",
                    "engagement_score",
                    "workload_index",
                    "burnout_risk_pct",
                )[: n * 16]
            )
            for r in rows:
                k = r["week_start"].isoformat()
                by_week[k]["mood"].append(float(r["mood_score"]))
                by_week[k]["engagement"].append(float(r["engagement_score"]))
                by_week[k]["workload"].append(float(r["workload_index"]))
                by_week[k]["burnout"].append(float(r["burnout_risk_pct"]))
            for k in sorted(by_week.keys())[-12:]:
                b = by_week[k]
                series.append(
                    {
                        "week_start": k,
                        "morale": _avg(b["mood"]),
                        "engagement": _avg(b["engagement"]),
                        "workload": _avg(b["workload"]),
                        "burnout_risk_pct": _avg(b["burnout"]),
                    }
                )

        def _delta(key: str):
            if len(series) < 2:
                return None
            a = series[0].get(key)
            b = series[-1].get(key)
            if a is None or b is None:
                return None
            return round(float(b) - float(a), 1)

        signals = aggregate_or_suppress(
            n,
            lambda _i: {
                "morale": series[-1]["morale"] if series else None,
                "morale_delta": _delta("morale"),
                "engagement": series[-1]["engagement"] if series else None,
                "engagement_delta": _delta("engagement"),
                "workload": series[-1]["workload"] if series else None,
                "workload_delta": _delta("workload"),
                "burnout_risk_pct": (
                    series[-1]["burnout_risk_pct"] if series else None
                ),
                "burnout_delta": _delta("burnout_risk_pct"),
                "recognition_90d_avg": None,
                "recognition_delta": None,
                "collaboration": None,
                "collaboration_delta": None,
                "innovation_participation": None,
                "innovation_delta": None,
            },
        )
        # Fill recognition / collab / innov from current when not suppressed.
        if not signals.get("suppressed") and ids:
            curr = list(EmployeeCurrent.objects.filter(employee_id__in=ids))
            signals["recognition_90d_avg"] = _avg(
                [float(c.recognition_90d) for c in curr]
            )
            signals["collaboration"] = _avg(
                [float(c.collaboration_score) for c in curr]
            )
            signals["innovation_participation"] = round(
                sum(1 for c in curr if c.ideas_submitted_12m > 0) / max(1, n) * 100,
                1,
            )

        # Themes: anonymous — suppressed under 5 contributors (design rule).
        themes = suppress_small_group(
            n,
            {
                "items": [
                    # No private check-in text in DB — mark as not collected.
                ]
            },
        )

        return Response(
            {
                "direct_reports": n,
                "series": series if n >= 5 else [],
                "signals": signals,
                "themes": themes,
                "themes_note": "anonymous_suppressed_under_5",
            }
        )


class ManagerRecognitionView(APIView):
    """GET/POST /api/manager/recognition/ — given/received for direct reports; no leaderboard."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def get(self, request):
        _require_manager(request.user)
        reports = list(
            employees_visible_to(request.user)
            .order_by("full_name")
            .values("id", "full_name", "job_title")
        )
        ids = [r["id"] for r in reports]
        today = date.today()

        received = list(
            Recognition.objects.filter(receiver_id__in=ids)
            .select_related("giver", "receiver")
            .order_by("-created_at")[:40]
            .values(
                "id",
                "type",
                "message",
                "created_at",
                "is_public",
                "giver_id",
                "receiver_id",
                "giver__full_name",
                "receiver__full_name",
            )
        )
        given = list(
            Recognition.objects.filter(giver_id__in=ids)
            .select_related("giver", "receiver")
            .order_by("-created_at")[:40]
            .values(
                "id",
                "type",
                "message",
                "created_at",
                "is_public",
                "giver_id",
                "receiver_id",
                "giver__full_name",
                "receiver__full_name",
            )
        )

        last_by_receiver = {
            row["receiver_id"]: row["last"]
            for row in Recognition.objects.filter(receiver_id__in=ids)
            .values("receiver_id")
            .annotate(last=Max("created_at"))
        }
        # Coverage sorted by longest gap — not by merit/score.
        coverage = []
        for r in reports:
            last = last_by_receiver.get(r["id"])
            days = (today - last).days if last else None
            coverage.append(
                {
                    "id": r["id"],
                    "full_name": r["full_name"],
                    "job_title": r["job_title"],
                    "last_recognized": last.isoformat() if last else None,
                    "days_since": days if days is not None else 9999,
                }
            )
        coverage.sort(key=lambda x: (-x["days_since"], x["full_name"]))

        def serialize(rows):
            return [
                {
                    "id": row["id"],
                    "type": row["type"],
                    "message": row["message"],
                    "created_at": row["created_at"].isoformat(),
                    "is_public": row["is_public"],
                    "giver_id": row["giver_id"],
                    "receiver_id": row["receiver_id"],
                    "giver_name": row["giver__full_name"],
                    "receiver_name": row["receiver__full_name"],
                }
                for row in rows
            ]

        return Response(
            {
                "direct_reports": len(ids),
                "received": serialize(received),
                "given": serialize(given),
                "coverage": coverage,
                "members": reports,
            }
        )

    @extend_schema(tags=["manager"])
    def post(self, request):
        _require_manager(request.user)
        ids = set(_report_ids(request.user))
        receiver_id = request.data.get("receiver_id")
        if receiver_id not in ids:
            raise ApiError("error.not_found", status_code=404)
        giver_emp = get_user_employee(request.user)
        if giver_emp is None:
            raise ApiError("error.validation", status_code=400)

        next_id = (Recognition.objects.order_by("-id").values_list("id", flat=True).first() or 0) + 1
        rec = Recognition.objects.create(
            id=next_id,
            giver=giver_emp,
            receiver_id=receiver_id,
            type=str(request.data.get("type") or "Impact")[:64],
            message=str(request.data.get("message") or "")[:2000],
            created_at=date.today(),
            is_public=bool(request.data.get("is_public", True)),
        )
        return Response(
            {
                "id": rec.id,
                "type": rec.type,
                "receiver_id": rec.receiver_id,
                "created_at": rec.created_at.isoformat(),
            },
            status=201,
        )


class ManagerInnovationView(APIView):
    """GET /api/manager/innovation/ — team ideas pipeline (no people ranking)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def get(self, request):
        _require_manager(request.user)
        ids = _report_ids(request.user)
        ideas = list(
            Idea.objects.filter(employee_id__in=ids)
            .select_related("employee")
            .order_by("-submitted_at")
            .values(
                "id",
                "title",
                "category",
                "status",
                "novelty_score",
                "feasibility_score",
                "business_value_score",
                "submitted_at",
                "estimated_value_sar",
                "realized_value_sar",
                "employee_id",
                "employee__full_name",
            )
        )
        by_status: dict[str, int] = {}
        for idea in ideas:
            by_status[idea["status"]] = by_status.get(idea["status"], 0) + 1

        pipeline = [
            {
                "id": i["id"],
                "title": i["title"],
                "category": i["category"],
                "status": i["status"],
                "submitter": i["employee__full_name"],
                "employee_id": i["employee_id"],
                "novelty_score": i["novelty_score"],
                "feasibility_score": i["feasibility_score"],
                "business_value_score": i["business_value_score"],
                "submitted_at": i["submitted_at"].isoformat() if i["submitted_at"] else None,
                "estimated_value_sar": i["estimated_value_sar"],
                "realized_value_sar": i["realized_value_sar"],
            }
            for i in ideas
        ]
        # Alphabetical by title within status — never by score.
        pipeline.sort(key=lambda x: (x["status"], x["title"]))

        kpis = aggregate_or_suppress(
            len(ids),
            lambda _i: {
                "ideas_count": len(ideas),
                "status_counts": by_status,
                "estimated_value_sar": sum(
                    (i["estimated_value_sar"] or 0) for i in ideas
                ),
                "realized_value_sar": sum(
                    (i["realized_value_sar"] or 0) for i in ideas
                ),
            },
        )
        return Response(
            {
                "direct_reports": len(ids),
                "kpis": kpis,
                "ideas": pipeline,
            }
        )


class ManagerInterventionsView(APIView):
    """
    GET /api/manager/interventions/
    POST /api/manager/interventions/ — creates status=proposed only (human-in-the-loop).
    PATCH /api/manager/interventions/<id>/ — approve / start / complete transitions.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def get(self, request):
        _require_manager(request.user)
        ids = _report_ids(request.user)
        rows = list(
            Intervention.objects.filter(employee_id__in=ids)
            .select_related("employee", "owner")
            .order_by("-created_at")
            .values(
                "id",
                "type",
                "rationale",
                "driver",
                "status",
                "human_approved",
                "expected_risk_reduction_pts",
                "baseline_risk_pct",
                "followup_risk_pct",
                "outcome",
                "created_at",
                "approved_at",
                "started_at",
                "completed_at",
                "followup_at",
                "employee_id",
                "employee__full_name",
                "owner_id",
                "owner__full_name",
            )
        )
        items = [
            {
                "id": r["id"],
                "display_id": f"INT-{r['id']:04d}",
                "type": r["type"],
                "rationale": r["rationale"],
                "driver": r["driver"],
                "status": r["status"],
                "human_approved": r["human_approved"],
                "expected_risk_reduction_pts": r["expected_risk_reduction_pts"],
                "baseline_risk_pct": r["baseline_risk_pct"],
                "followup_risk_pct": r["followup_risk_pct"],
                "outcome": r["outcome"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "approved_at": r["approved_at"].isoformat() if r["approved_at"] else None,
                "started_at": r["started_at"].isoformat() if r["started_at"] else None,
                "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
                "followup_at": r["followup_at"].isoformat() if r["followup_at"] else None,
                "employee_id": r["employee_id"],
                "employee_name": r["employee__full_name"],
                "owner_name": r["owner__full_name"],
            }
            for r in rows
        ]
        # Urgency/status then date — not performance rank.
        status_order = {
            "proposed": 0,
            "approved": 1,
            "in_progress": 2,
            "completed": 3,
            "declined": 4,
        }
        items.sort(
            key=lambda x: (
                status_order.get(x["status"], 9),
                x["created_at"] or "",
                x["employee_name"],
            )
        )
        return Response({"direct_reports": len(ids), "interventions": items})

    @extend_schema(tags=["manager"])
    def post(self, request):
        _require_manager(request.user)
        ids = set(_report_ids(request.user))
        employee_id = request.data.get("employee_id")
        if employee_id not in ids:
            raise ApiError("error.not_found", status_code=404)

        owner = get_user_employee(request.user)
        if owner is None:
            raise ApiError("error.validation", status_code=400)

        try:
            current = EmployeeCurrent.objects.get(employee_id=employee_id)
            baseline = current.burnout_risk_pct
        except EmployeeCurrent.DoesNotExist:
            baseline = int(request.data.get("baseline_risk_pct") or 0)

        next_id = (
            Intervention.objects.order_by("-id").values_list("id", flat=True).first() or 0
        ) + 1
        item = Intervention.objects.create(
            id=next_id,
            employee_id=employee_id,
            type=str(request.data.get("type") or "workload_relief")[:128],
            rationale=str(request.data.get("rationale") or "")[:4000],
            driver=str(request.data.get("driver") or "workload")[:128],
            status="proposed",
            proposed_by="manager",
            owner=owner,
            created_at=date.today(),
            expected_risk_reduction_pts=int(
                request.data.get("expected_risk_reduction_pts") or 10
            ),
            cost_sar=int(request.data.get("cost_sar") or 0),
            human_approved=False,
            baseline_risk_pct=baseline,
            outcome="pending",
        )
        return Response(
            {
                "id": item.id,
                "display_id": f"INT-{item.id:04d}",
                "status": item.status,
                "human_approved": item.human_approved,
            },
            status=201,
        )


class ManagerInterventionDetailView(APIView):
    """PATCH status transitions: proposed→approved→in_progress→completed."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def patch(self, request, pk: int):
        _require_manager(request.user)
        ids = set(_report_ids(request.user))
        try:
            item = Intervention.objects.get(pk=pk)
        except Intervention.DoesNotExist:
            raise ApiError("error.not_found", status_code=404) from None
        if item.employee_id not in ids:
            raise ApiError("error.not_found", status_code=404)

        action = str(request.data.get("action") or "")
        today = date.today()
        if action == "approve":
            item.status = "approved"
            item.human_approved = True
            item.approved_at = today
            emp = get_user_employee(request.user)
            if emp:
                item.approved_by = emp
        elif action == "start":
            if not item.human_approved and item.status != "approved":
                raise ApiError("error.validation", status_code=400)
            item.status = "in_progress"
            item.human_approved = True
            item.started_at = item.started_at or today
            if item.approved_at is None:
                item.approved_at = today
        elif action == "complete":
            item.status = "completed"
            item.completed_at = today
            item.followup_at = today + timedelta(days=28)
            if request.data.get("followup_risk_pct") is not None:
                item.followup_risk_pct = float(request.data["followup_risk_pct"])
            item.outcome = str(request.data.get("outcome") or "measured")[:32]
        elif action == "decline":
            item.status = "declined"
        else:
            raise ApiError("error.validation", status_code=400)

        if item.status not in VALID_INTERVENTION_STATUSES:
            raise ApiError("error.validation", status_code=400)
        item.save()
        return Response(
            {
                "id": item.id,
                "status": item.status,
                "human_approved": item.human_approved,
            }
        )


class ManagerReportsView(APIView):
    """GET /api/manager/reports/ — team-scoped report aggregates."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def get(self, request):
        _require_manager(request.user)
        ids = _report_ids(request.user)
        n = len(ids)
        curr = list(EmployeeCurrent.objects.filter(employee_id__in=ids))
        payload = aggregate_or_suppress(
            n,
            lambda _i: {
                "performance_score": _avg([float(c.performance_score) for c in curr]),
                "engagement_score": _avg([float(c.engagement_score) for c in curr]),
                "wellbeing_score": _avg([float(c.wellbeing_score) for c in curr]),
                "burnout_risk_pct": _avg([float(c.burnout_risk_pct) for c in curr]),
                "innovation_score": _avg([float(c.innovation_score) for c in curr]),
                "ideas_count": Idea.objects.filter(employee_id__in=ids).count(),
                "recognitions_count": Recognition.objects.filter(
                    receiver_id__in=ids
                ).count(),
                "interventions_count": Intervention.objects.filter(
                    employee_id__in=ids
                ).count(),
                "interventions_completed": Intervention.objects.filter(
                    employee_id__in=ids, status="completed"
                ).count(),
            },
        )
        return Response(
            {
                "direct_reports": n,
                "scope": {
                    "direct_reports_only": True,
                    "other_teams": False,
                    "org_hr_analytics": False,
                },
                "report": payload,
                "month_label": date.today().strftime("%b %Y").upper(),
            }
        )


class ManagerPulseAIStubView(APIView):
    """POST /api/manager/pulseai/ — canned answer in design format (Step 8 wires LLM)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def post(self, request):
        _require_manager(request.user)
        ids = _report_ids(request.user)
        question = str(request.data.get("question") or "").strip()
        curr = list(EmployeeCurrent.objects.filter(employee_id__in=ids))
        eng = _avg([float(c.engagement_score) for c in curr]) if curr else None
        burn = _avg([float(c.burnout_risk_pct) for c in curr]) if curr else None
        at_risk = sum(1 for c in curr if c.burnout_risk_pct >= 60)

        return Response(
            {
                "stub": True,
                "question": question
                or "Why did my team's engagement drop?",
                "data_used": [
                    {
                        "label": "Team engagement (current)",
                        "value": eng,
                        "n": len(ids),
                    },
                    {
                        "label": "Team burnout risk (current)",
                        "value": burn,
                        "n": len(ids),
                    },
                    {
                        "label": "People above 60% burnout risk",
                        "value": at_risk,
                        "n": len(ids),
                    },
                ],
                "findings": [
                    "Engagement and burnout move together on this team in the recent weekly series.",
                    f"{at_risk} direct reports are in the high burnout band (≥60%).",
                    "Wellbeing is shown beside performance and is never part of the EMPULSE score.",
                ],
                "recommendation": {
                    "summary": "Reallocate load for at-risk people and schedule supportive check-ins this week.",
                    "actions": [
                        "Open Burnout Early Warning for the attention list",
                        "Propose interventions (status starts as proposed — you approve)",
                        "Recognize recent delivery to close recognition gaps",
                    ],
                },
                "never_sees": [
                    "Private check-in free text",
                    "Email / chat content",
                    "Health or medical data",
                ],
            }
        )
