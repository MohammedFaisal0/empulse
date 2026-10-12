"""H08–H11 HR aggregate endpoints (innovation, recognition, interventions, matrix)."""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean, median
from typing import Any

from django.db.models import Avg, Count, Max, Q, Sum
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import AuditLog, UserProfile
from accounts.permissions import get_user_employee, get_user_role
from analytics.aggregates import MIN_GROUP_SIZE, aggregate_or_suppress
from innovation.models import Idea, Recognition
from interventions.models import Intervention
from org.models import Department, Employee, Team
from org.privacy import assert_not_executive_individual
from pulse.models import EmployeeCurrent, WeeklyMetric

AS_OF = date(2026, 10, 6)
YEAR_START = date(2026, 1, 1)
Q3_START = date(2026, 7, 1)
Q3_END = date(2026, 9, 30)
Q2_START = date(2026, 4, 1)
Q2_END = date(2026, 6, 30)
ELEVATED = 60
PERF_HIGH = 70
WELL_HIGH = 55

VALID_INTERVENTION_STATUSES = {
    "proposed",
    "approved",
    "in_progress",
    "completed",
    "declined",
    "cancelled",
}

DNA_TRAITS = (
    ("idea_generation", "novelty_score"),
    ("problem_solving", "feasibility_score"),
    ("experimentation", None),
    ("collaboration", None),
    ("digital_innovation", None),
    ("implementation", None),
    ("business_impact", "business_value_score"),
)

RECOG_TYPE_LABELS = {
    "Impact": "Performance Star",
    "Innovation": "Innovation Champion",
    "Collaboration": "Collaboration Hero",
    "Customer Focus": "Digital Pioneer",
    "Mentorship": "Team Supporter",
    "Above & Beyond": "Growth Champion",
}


def _require_hr_org_viewer(user):
    role = get_user_role(user)
    if role not in (
        UserProfile.Role.HR,
        UserProfile.Role.EXECUTIVE,
        UserProfile.Role.ADMIN,
    ):
        raise ApiError("auth.permission_denied", status_code=403)
    return role


def _require_hr_individual(user):
    assert_not_executive_individual(user)
    role = get_user_role(user)
    if role not in (UserProfile.Role.HR, UserProfile.Role.ADMIN):
        raise ApiError("auth.permission_denied", status_code=403)
    return role


def _avg(vals: list[float]) -> float | None:
    return round(mean(vals), 1) if vals else None


def _med(vals: list[float]) -> float | None:
    return round(float(median(vals)), 1) if vals else None


def _pct(part: int, whole: int) -> float | None:
    if whole <= 0:
        return None
    return round(100.0 * part / whole, 1)


def _tier_of(score: float) -> str:
    if score >= 90:
        return "gold"
    if score >= 80:
        return "silver"
    if score >= 70:
        return "bronze"
    return "growth"


def _matrix_quad(perf: float, well: float) -> str:
    high_p = perf >= PERF_HIGH
    high_w = well >= WELL_HIGH
    if high_p and high_w:
        return "thriving"
    if high_p and not high_w:
        return "burnout_risk"
    if not high_p and high_w:
        return "development"
    return "critical_support"


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < MIN_GROUP_SIZE or len(xs) != len(ys):
        return None
    mx, my = mean(xs), mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    denx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    deny = math.sqrt(sum((y - my) ** 2 for y in ys))
    if denx == 0 or deny == 0:
        return None
    return round(num / (denx * deny), 2)


def _rate_ratio(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return round(a / b, 2)


# ---------------------------------------------------------------------------
# H08 Innovation Intelligence
# ---------------------------------------------------------------------------


class HrInnovationView(APIView):
    """GET /api/hr/innovation/ — ideas pipeline & value by department (aggregates)."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        role = _require_hr_org_viewer(request.user)
        is_exec = role == UserProfile.Role.EXECUTIVE

        headcount = Employee.objects.count()
        ideas_year = Idea.objects.filter(submitted_at__gte=YEAR_START)
        ideas_q3 = Idea.objects.filter(
            submitted_at__gte=Q3_START, submitted_at__lte=Q3_END
        )
        ideas_q2 = Idea.objects.filter(
            submitted_at__gte=Q2_START, submitted_at__lte=Q2_END
        )

        n_year = ideas_year.count()
        n_q2 = ideas_q2.count()
        ideas_delta_pct = (
            round(100.0 * (n_year - n_q2) / n_q2, 1) if n_q2 else None
        )

        q3_decided = ideas_q3.exclude(status="under_review")
        q3_approved = ideas_q3.filter(status__in=["approved", "implemented"])
        approval_rate = _pct(q3_approved.count(), max(q3_decided.count(), 1))

        impact_days: list[float] = []
        for row in (
            Idea.objects.filter(
                implemented_at__isnull=False, submitted_at__isnull=False
            )
            .values_list("submitted_at", "implemented_at")[:800]
        ):
            impact_days.append(float((row[1] - row[0]).days))
        time_to_impact_wks = (
            round(median(impact_days) / 7.0, 1) if impact_days else None
        )

        value_aggs = ideas_year.aggregate(
            estimated=Sum("estimated_value_sar"),
            realized=Sum("realized_value_sar"),
        )
        estimated = float(value_aggs["estimated"] or 0)
        realized = float(value_aggs["realized"] or 0)
        # Build cost is not in the ideas table — ROI uses realized / estimated.
        roi_multiple = (
            round(realized / estimated, 2) if estimated > 0 else None
        )
        roi_note = "realized_vs_estimated"
        if roi_multiple is None:
            roi_note = "not_collected"

        # Funnel from Q3 submissions (map statuses to design stages).
        submitted = ideas_q3.count()
        under_review = ideas_q3.filter(status="under_review").count()
        approved = ideas_q3.filter(status="approved").count()
        implemented = ideas_q3.filter(status="implemented").count()
        verified = ideas_q3.filter(
            status="implemented", realized_value_sar__gt=0
        ).count()
        funnel = [
            {"stage": "submitted", "count": submitted},
            {
                "stage": "ai_reviewed",
                "count": under_review + approved + implemented,
                "note": "mapped_from_under_review_plus_decided",
            },
            {"stage": "approved", "count": approved + implemented},
            {
                "stage": "in_build",
                "count": approved,
                "note": "approved_not_yet_implemented",
            },
            {"stage": "implemented", "count": implemented},
            {"stage": "verified_impact", "count": verified},
        ]
        verified_savings = float(
            ideas_year.filter(realized_value_sar__gt=0).aggregate(
                s=Sum("realized_value_sar")
            )["s"]
            or 0
        )

        # Participation by department (share with ≥1 idea this year).
        participants = set(
            ideas_year.values_list("employee_id", flat=True).distinct()
        )
        org_participation = _pct(len(participants), headcount)
        participation: list[dict[str, Any]] = []
        value_by_dept: list[dict[str, Any]] = []
        for dept in Department.objects.order_by("name"):
            emp_ids = list(
                Employee.objects.filter(department=dept).values_list(
                    "id", flat=True
                )
            )
            n = len(emp_ids)
            part = sum(1 for eid in emp_ids if eid in participants)
            row = aggregate_or_suppress(
                n,
                lambda _i, part=part, n=n: {
                    "department_id": dept.id,
                    "department": dept.name,
                    "participation_pct": _pct(part, n),
                    "participants": part,
                },
            )
            if not row.get("suppressed"):
                participation.append(row)

            dept_ideas = ideas_year.filter(employee__department=dept)
            idea_n = dept_ideas.count()
            est = float(
                dept_ideas.aggregate(s=Sum("estimated_value_sar"))["s"] or 0
            )
            real = float(
                dept_ideas.aggregate(s=Sum("realized_value_sar"))["s"] or 0
            )
            vrow = aggregate_or_suppress(
                n,
                lambda _i, est=est, real=real, idea_n=idea_n: {
                    "department_id": dept.id,
                    "department": dept.name,
                    "ideas": idea_n,
                    "estimated_value_sar": round(est),
                    "realized_value_sar": round(real),
                },
            )
            if not vrow.get("suppressed"):
                value_by_dept.append(vrow)

        participation.sort(key=lambda r: r["department"])
        value_by_dept.sort(key=lambda r: r["department"])

        # Org Innovation DNA — medians from currents + idea scores (no ranks).
        currents = list(
            EmployeeCurrent.objects.select_related("employee").all()
        )
        novelty_by_emp: dict[int, list[float]] = defaultdict(list)
        feas_by_emp: dict[int, list[float]] = defaultdict(list)
        biz_by_emp: dict[int, list[float]] = defaultdict(list)
        for idea in Idea.objects.filter(submitted_at__gte=YEAR_START).values(
            "employee_id",
            "novelty_score",
            "feasibility_score",
            "business_value_score",
        ):
            novelty_by_emp[idea["employee_id"]].append(
                float(idea["novelty_score"])
            )
            feas_by_emp[idea["employee_id"]].append(
                float(idea["feasibility_score"])
            )
            biz_by_emp[idea["employee_id"]].append(
                float(idea["business_value_score"])
            )

        idea_gen = [
            mean(v) for v in novelty_by_emp.values() if v
        ]
        problem = [mean(v) for v in feas_by_emp.values() if v]
        business = [mean(v) for v in biz_by_emp.values() if v]
        experimentation = [float(c.innovation_score) for c in currents]
        collaboration = [float(c.collaboration_score) for c in currents]
        implementation = []
        for c in currents:
            if c.ideas_submitted_12m:
                implementation.append(
                    100.0
                    * c.ideas_implemented_12m
                    / max(1, c.ideas_submitted_12m)
                )
        dna = [
            {
                "id": "idea_generation",
                "score": _med(idea_gen),
                "source": "ideas.novelty_score",
            },
            {
                "id": "problem_solving",
                "score": _med(problem),
                "source": "ideas.feasibility_score",
            },
            {
                "id": "experimentation",
                "score": _med(experimentation),
                "source": "innovation_score",
            },
            {
                "id": "collaboration",
                "score": _med(collaboration),
                "source": "collaboration_score",
            },
            {
                "id": "digital_innovation",
                "score": None,
                "source": None,
                "not_collected": True,
            },
            {
                "id": "implementation",
                "score": _med(implementation),
                "source": "ideas_implemented_ratio",
            },
            {
                "id": "business_impact",
                "score": _med(business),
                "source": "ideas.business_value_score",
            },
        ]

        # Systemic barriers from available signals.
        wait_days: list[float] = []
        for row in Idea.objects.filter(
            status="implemented",
            decided_at__isnull=False,
            implemented_at__isnull=False,
        ).values_list("decided_at", "implemented_at")[:500]:
            wait_days.append(float((row[1] - row[0]).days))
        wait_wks = round(median(wait_days) / 7.0) if wait_days else None
        idea_gen_med = next(
            (d["score"] for d in dna if d["id"] == "idea_generation"), None
        )
        impl_med = next(
            (d["score"] for d in dna if d["id"] == "implementation"), None
        )
        barriers = [
            {
                "id": "time_to_build",
                "title_key": "time_to_build",
                "weeks": wait_wks,
                "detail": "approved_to_implemented_median",
            },
            {
                "id": "implementation_skill",
                "title_key": "implementation_skill",
                "implementation_median": impl_med,
                "idea_generation_median": idea_gen_med,
            },
            {
                "id": "data_access",
                "title_key": "data_access",
                "count": None,
                "not_collected": True,
                "period": "Q2",
            },
        ]

        # Public ideas only when naming authors — alphabetical by title, never score.
        public_ideas = None
        if not is_exec:
            public_ideas = [
                {
                    "id": i["id"],
                    "title": i["title"],
                    "status": i["status"],
                    "author": i["employee__full_name"],
                    "employee_id": i["employee_id"],
                    "estimated_value_sar": i["estimated_value_sar"],
                    "realized_value_sar": i["realized_value_sar"],
                    "submitted_at": i["submitted_at"].isoformat()
                    if i["submitted_at"]
                    else None,
                }
                for i in Idea.objects.filter(is_public=True)
                .select_related("employee")
                .order_by("title", "employee__full_name")[:40]
                .values(
                    "id",
                    "title",
                    "status",
                    "estimated_value_sar",
                    "realized_value_sar",
                    "submitted_at",
                    "employee_id",
                    "employee__full_name",
                )
            ]

        return Response(
            {
                "as_of": AS_OF.isoformat(),
                "kpis": {
                    "ideas_this_year": n_year,
                    "ideas_delta_pct_vs_q2_volume": ideas_delta_pct,
                    "approval_rate_pct": approval_rate,
                    "approval_period": "Q3",
                    "time_to_impact_wks_median": time_to_impact_wks,
                    "innovation_roi": roi_multiple,
                    "innovation_roi_note": roi_note,
                    "estimated_value_sar": round(estimated),
                    "realized_value_sar": round(realized),
                },
                "funnel": {
                    "period": "Q3",
                    "stages": funnel,
                    "verified_savings_sar": round(verified_savings),
                },
                "participation": {
                    "org_pct": org_participation,
                    "by_department": participation,
                },
                "value_by_department": value_by_dept,
                "dna": {
                    "n": headcount,
                    "traits": dna,
                },
                "barriers": barriers,
                "public_ideas": public_ideas,
                "executive_individuals_hidden": is_exec,
                "suppression_min": MIN_GROUP_SIZE,
                "no_people_ranking": True,
            }
        )


# ---------------------------------------------------------------------------
# H09 Recognition Analytics
# ---------------------------------------------------------------------------


class HrRecognitionAnalyticsView(APIView):
    """GET /api/hr/recognition/ — coverage & gaps by dept/team; no people ranking."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)

        headcount = Employee.objects.count()
        cut_60 = AS_OF - timedelta(days=60)
        cut_12m = AS_OF - timedelta(days=365)

        receivers_60 = set(
            Recognition.objects.filter(created_at__gte=cut_60).values_list(
                "receiver_id", flat=True
            ).distinct()
        )
        receivers_12m = set(
            Recognition.objects.filter(created_at__gte=cut_12m).values_list(
                "receiver_id", flat=True
            ).distinct()
        )
        givers_60 = set(
            Recognition.objects.filter(created_at__gte=cut_60).values_list(
                "giver_id", flat=True
            ).distinct()
        )

        org_rate = _pct(len(receivers_60), headcount)
        # Q2 rate for delta
        q2_cut_start = Q2_END - timedelta(days=60)
        receivers_q2 = set(
            Recognition.objects.filter(
                created_at__gte=q2_cut_start, created_at__lte=Q2_END
            )
            .values_list("receiver_id", flat=True)
            .distinct()
        )
        q2_rate = _pct(len(receivers_q2), headcount)
        rate_delta = (
            round(org_rate - q2_rate, 1)
            if org_rate is not None and q2_rate is not None
            else None
        )

        q3_recs = Recognition.objects.filter(
            created_at__gte=Q3_START, created_at__lte=Q3_END
        )
        q3_count = q3_recs.count()
        q3_givers = q3_recs.values("giver_id").distinct().count()

        never_n = headcount - len(receivers_12m)
        never_pct = _pct(never_n, headcount)

        # Linked to outcomes — no impact-thread table; not collected.
        linked_to_outcomes_pct = None

        # Rate by department (alphabetical).
        by_dept: list[dict[str, Any]] = []
        for dept in Department.objects.order_by("name"):
            emp_ids = list(
                Employee.objects.filter(department=dept).values_list(
                    "id", flat=True
                )
            )
            n = len(emp_ids)
            rec_n = sum(1 for eid in emp_ids if eid in receivers_60)
            gave_n = sum(1 for eid in emp_ids if eid in givers_60)
            both = sum(
                1
                for eid in emp_ids
                if eid in receivers_60 and eid in givers_60
            )
            row = aggregate_or_suppress(
                n,
                lambda _i, rec_n=rec_n, gave_n=gave_n, both=both, n=n: {
                    "department_id": dept.id,
                    "department": dept.name,
                    "rate_pct": _pct(rec_n, n),
                    "giver_pct": _pct(gave_n, n),
                    "reciprocity_pct": _pct(both, n),
                    "recognized": rec_n,
                },
            )
            if not row.get("suppressed"):
                by_dept.append(row)

        # Rate by team (suppress <5).
        by_team: list[dict[str, Any]] = []
        for team in Team.objects.select_related("department").order_by("name"):
            emp_ids = list(
                Employee.objects.filter(team=team).values_list("id", flat=True)
            )
            n = len(emp_ids)
            rec_n = sum(1 for eid in emp_ids if eid in receivers_60)
            both = sum(
                1
                for eid in emp_ids
                if eid in receivers_60 and eid in givers_60
            )
            row = aggregate_or_suppress(
                n,
                lambda _i, rec_n=rec_n, both=both, n=n, team=team: {
                    "team_id": team.id,
                    "team": team.name,
                    "department": team.department.name,
                    "rate_pct": _pct(rec_n, n),
                    "reciprocity_pct": _pct(both, n),
                },
            )
            if not row.get("suppressed"):
                by_team.append(row)

        # Category mix Q3 — use DB types; map labels for display.
        type_counts = {
            r["type"]: r["c"]
            for r in q3_recs.values("type").annotate(c=Count("id"))
        }
        category_mix = []
        for typ, label in RECOG_TYPE_LABELS.items():
            c = type_counts.get(typ, 0)
            category_mix.append(
                {
                    "type": typ,
                    "label": label,
                    "count": c,
                    "pct": _pct(c, q3_count) if q3_count else 0,
                }
            )
        # Any leftover types alphabetical
        for typ in sorted(type_counts.keys()):
            if typ not in RECOG_TYPE_LABELS:
                c = type_counts[typ]
                category_mix.append(
                    {
                        "type": typ,
                        "label": typ,
                        "count": c,
                        "pct": _pct(c, q3_count) if q3_count else 0,
                    }
                )

        # Equity ratios (rate A / rate B) — groups must be ≥5.
        employees = list(
            Employee.objects.select_related().values(
                "id", "gender", "age", "work_mode"
            )
        )
        current_by_id = {
            c.employee_id: c
            for c in EmployeeCurrent.objects.select_related("employee")
        }

        def group_rate(predicate) -> float | None:
            ids = [e["id"] for e in employees if predicate(e)]
            if len(ids) < MIN_GROUP_SIZE:
                return None
            rec = sum(1 for eid in ids if eid in receivers_60)
            return _pct(rec, len(ids))

        women = group_rate(lambda e: (e["gender"] or "").upper().startswith("F"))
        men = group_rate(lambda e: (e["gender"] or "").upper().startswith("M"))
        remote = group_rate(
            lambda e: (e["work_mode"] or "").lower() == "remote"
        )
        onsite = group_rate(
            lambda e: (e["work_mode"] or "").lower() in ("on-site", "onsite")
        )
        under30 = group_rate(lambda e: (e["age"] or 99) < 30)
        mid = group_rate(lambda e: 30 <= (e["age"] or 0) <= 45)

        lower_tier_ids = []
        higher_tier_ids = []
        for eid, cur in current_by_id.items():
            tier = (cur.performance_tier or _tier_of(float(cur.performance_score))).lower()
            if tier in ("bronze", "growth"):
                lower_tier_ids.append(eid)
            elif tier in ("gold", "silver"):
                higher_tier_ids.append(eid)

        def ids_rate(ids: list[int]) -> float | None:
            if len(ids) < MIN_GROUP_SIZE:
                return None
            rec = sum(1 for eid in ids if eid in receivers_60)
            return _pct(rec, len(ids))

        lower_rate = ids_rate(lower_tier_ids)
        higher_rate = ids_rate(higher_tier_ids)
        tier_ratio = _rate_ratio(lower_rate, higher_rate)

        equity = [
            {
                "id": "women_men",
                "label_key": "women_men",
                "ratio": _rate_ratio(women, men),
                "band": [0.80, 1.25],
            },
            {
                "id": "remote_onsite",
                "label_key": "remote_onsite",
                "ratio": _rate_ratio(remote, onsite),
                "band": [0.80, 1.25],
            },
            {
                "id": "under30_mid",
                "label_key": "under30_mid",
                "ratio": _rate_ratio(under30, mid),
                "band": [0.80, 1.25],
            },
            {
                "id": "lower_higher_tier",
                "label_key": "lower_higher_tier",
                "ratio": tier_ratio,
                "band": [0.80, 1.25],
                "lower_rate": lower_rate,
                "higher_rate": higher_rate,
            },
        ]

        # Recognition → engagement correlation at team level (≥5).
        xs: list[float] = []
        ys: list[float] = []
        lowest_team = None
        for row in by_team:
            rate = row.get("rate_pct")
            if rate is None:
                continue
            team_emp_ids = set(
                Employee.objects.filter(team_id=row["team_id"]).values_list(
                    "id", flat=True
                )
            )
            team_currents = [
                c
                for eid, c in current_by_id.items()
                if eid in team_emp_ids
            ]
            if len(team_currents) < MIN_GROUP_SIZE:
                continue
            eng = _avg([float(c.engagement_score) for c in team_currents])
            if eng is None:
                continue
            xs.append(float(rate))
            ys.append(float(eng))
            if lowest_team is None or rate < lowest_team["rate_pct"]:
                lowest_team = {
                    "team": row["team"],
                    "department": row["department"],
                    "rate_pct": rate,
                    "engagement": eng,
                }

        high_rate_eng = [
            y for x, y in zip(xs, ys) if x >= 70
        ]
        low_rate_eng = [y for x, y in zip(xs, ys) if x < 70]
        eng_gap = None
        if high_rate_eng and low_rate_eng:
            eng_gap = round(mean(high_rate_eng) - mean(low_rate_eng), 1)
        r_val = _pearson(xs, ys)

        insight = {
            "r": r_val,
            "engagement_gap_pts": eng_gap,
            "threshold_pct": 70,
            "lowest_coverage": lowest_team,
        }

        tier_gap_pct = None
        if lower_rate is not None and higher_rate is not None and higher_rate:
            tier_gap_pct = round(
                100.0 * (1 - lower_rate / higher_rate), 0
            )

        return Response(
            {
                "as_of": AS_OF.isoformat(),
                "kpis": {
                    "recognition_rate_pct": org_rate,
                    "rate_delta_vs_q2": rate_delta,
                    "recognitions_q3": q3_count,
                    "givers_q3": q3_givers,
                    "linked_to_outcomes_pct": linked_to_outcomes_pct,
                    "linked_to_outcomes_not_collected": True,
                    "never_recognized_12mo": never_n,
                    "never_recognized_pct": never_pct,
                },
                "rate_by_department": by_dept,
                "rate_by_team": by_team,
                "category_mix": {
                    "period": "Q3",
                    "total": q3_count,
                    "items": category_mix,
                },
                "equity": {
                    "band": [0.80, 1.25],
                    "ratios": equity,
                    "tier_gap_pct": tier_gap_pct,
                },
                "insight": insight,
                "suppression_min": MIN_GROUP_SIZE,
                "no_people_ranking": True,
                "no_most_recognized_list": True,
            }
        )


# ---------------------------------------------------------------------------
# H10 AI Intervention Center
# ---------------------------------------------------------------------------


class HrInterventionsView(APIView):
    """
    GET /api/hr/interventions/ — KPIs + list (HR) / aggregates only (executive).
    POST — create status=proposed from a burnout signal (never auto-starts).
    """

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        role = _require_hr_org_viewer(request.user)
        is_exec = role == UserProfile.Role.EXECUTIVE

        year_start = YEAR_START
        cut_30 = AS_OF - timedelta(days=30)
        week_end = AS_OF + timedelta(days=7)

        # Detected = elevated burnout without an open intervention (rule-based).
        open_emp_ids = set(
            Intervention.objects.filter(
                status__in=["proposed", "approved", "in_progress"]
            ).values_list("employee_id", flat=True)
        )
        elevated = list(
            EmployeeCurrent.objects.filter(
                Q(burnout_level__iexact="high")
                | Q(burnout_risk_pct__gte=ELEVATED)
            ).select_related("employee", "employee__department", "employee__team")
        )
        detected_candidates = [
            c for c in elevated if c.employee_id not in open_emp_ids
        ]
        # Cap detection window: recently worsened or currently elevated.
        detected_n = len(
            [
                c
                for c in detected_candidates
                if (c.burnout_change_6w_pts or 0) >= 0
                or float(c.burnout_risk_pct) >= ELEVATED
            ]
        )

        proposed_n = Intervention.objects.filter(status="proposed").count()
        active_qs = Intervention.objects.filter(
            status__in=["approved", "in_progress"]
        )
        active_n = active_qs.count()
        # On-track: followup not overdue, or no followup yet.
        on_track = active_qs.filter(
            Q(followup_at__isnull=True) | Q(followup_at__gte=AS_OF)
        ).count()
        on_track_pct = _pct(on_track, active_n) if active_n else None

        followup_due = Intervention.objects.filter(
            followup_at__gte=AS_OF,
            followup_at__lte=week_end,
            status__in=["approved", "in_progress", "completed"],
        ).count()

        measured = Intervention.objects.filter(
            outcome__in=["worked", "partial", "no_change"],
            created_at__gte=year_start,
        )
        measured_n = measured.count()
        improved_n = measured.filter(outcome__in=["worked", "partial"]).count()
        improved_pct = _pct(improved_n, measured_n)

        outcome_mix = {
            "worked": measured.filter(outcome="worked").count(),
            "partial": measured.filter(outcome="partial").count(),
            "no_change": measured.filter(outcome="no_change").count(),
        }

        # Playbook learning from completed workload interventions.
        workload = Intervention.objects.filter(
            created_at__gte=year_start,
            type__icontains="workload",
            outcome__in=["worked", "partial", "no_change"],
            followup_risk_pct__isnull=False,
        )
        wl_total = workload.count()
        wl_strong = 0
        for item in workload:
            drop = float(item.baseline_risk_pct) - float(item.followup_risk_pct)
            if drop >= 15:
                wl_strong += 1

        recog_plans = Intervention.objects.filter(
            created_at__gte=year_start,
            type__icontains="recognition",
            outcome__in=["worked", "partial", "no_change"],
        )
        recog_worked = recog_plans.filter(outcome__in=["worked", "partial"]).count()

        playbook = {
            "workload_rebalance": {
                "strong_n": wl_strong,
                "total_n": wl_total,
                "threshold_pts": 15,
            },
            "recognition_only": {
                "worked_n": recog_worked,
                "total_n": recog_plans.count(),
            },
        }

        featured = None
        interventions_out = None
        proposals_out = None

        if not is_exec:
            # Featured: most recent completed with outcome worked.
            feat = (
                Intervention.objects.filter(
                    status="completed", outcome="worked"
                )
                .select_related(
                    "employee",
                    "employee__department",
                    "owner",
                    "approved_by",
                )
                .order_by("-completed_at", "-id")
                .first()
            )
            if feat:
                after_risk = feat.followup_risk_pct
                delta = (
                    round(float(feat.baseline_risk_pct) - float(after_risk), 1)
                    if after_risk is not None
                    else None
                )
                featured = {
                    "id": feat.id,
                    "display_id": f"INT-{feat.id:04d}",
                    "employee_id": feat.employee_id,
                    "employee_name": feat.employee.full_name,
                    "job_title": feat.employee.job_title,
                    "department": feat.employee.department.name,
                    "type": feat.type,
                    "rationale": feat.rationale,
                    "driver": feat.driver,
                    "status": feat.status,
                    "outcome": feat.outcome,
                    "owner_name": feat.owner.full_name if feat.owner_id else None,
                    "approved_by_name": (
                        feat.approved_by.full_name if feat.approved_by_id else None
                    ),
                    "created_at": feat.created_at.isoformat()
                    if feat.created_at
                    else None,
                    "approved_at": feat.approved_at.isoformat()
                    if feat.approved_at
                    else None,
                    "started_at": feat.started_at.isoformat()
                    if feat.started_at
                    else None,
                    "completed_at": feat.completed_at.isoformat()
                    if feat.completed_at
                    else None,
                    "followup_at": feat.followup_at.isoformat()
                    if feat.followup_at
                    else None,
                    "baseline_risk_pct": feat.baseline_risk_pct,
                    "followup_risk_pct": after_risk,
                    "risk_delta_pts": delta,
                    "expected_risk_reduction_pts": feat.expected_risk_reduction_pts,
                    "engagement_before": None,
                    "engagement_after": None,
                    "engagement_not_collected": True,
                    "performance_before": None,
                    "performance_after": None,
                    "performance_not_collected": True,
                }

            rows = list(
                Intervention.objects.select_related(
                    "employee",
                    "employee__department",
                    "employee__team",
                    "owner",
                )
                .order_by("-created_at", "employee__full_name")
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
                    "employee__department__name",
                    "employee__team__name",
                    "owner__full_name",
                )[:80]
            )
            status_order = {
                "proposed": 0,
                "approved": 1,
                "in_progress": 2,
                "completed": 3,
                "declined": 4,
                "cancelled": 5,
            }
            interventions_out = []
            for r in rows:
                expected_to = max(
                    0,
                    int(r["baseline_risk_pct"])
                    - int(r["expected_risk_reduction_pts"]),
                )
                interventions_out.append(
                    {
                        "id": r["id"],
                        "display_id": f"INT-{r['id']:04d}",
                        "employee_id": r["employee_id"],
                        "employee_name": r["employee__full_name"],
                        "department": r["employee__department__name"],
                        "team": r["employee__team__name"],
                        "type": r["type"],
                        "rationale": r["rationale"],
                        "driver": r["driver"],
                        "status": r["status"],
                        "human_approved": r["human_approved"],
                        "baseline_risk_pct": r["baseline_risk_pct"],
                        "expected_to_pct": expected_to,
                        "followup_risk_pct": r["followup_risk_pct"],
                        "outcome": r["outcome"],
                        "owner_name": r["owner__full_name"],
                        "created_at": r["created_at"].isoformat()
                        if r["created_at"]
                        else None,
                        "followup_at": r["followup_at"].isoformat()
                        if r["followup_at"]
                        else None,
                    }
                )
            interventions_out.sort(
                key=lambda x: (
                    status_order.get(x["status"], 9),
                    x["created_at"] or "",
                    x["employee_name"],
                )
            )

            # Rule-based proposals awaiting creation (signals, not auto-started).
            proposals_out = []
            for c in sorted(
                detected_candidates,
                key=lambda x: (-float(x.burnout_risk_pct), x.employee.full_name),
            )[:25]:
                proposals_out.append(
                    {
                        "employee_id": c.employee_id,
                        "employee_name": c.employee.full_name,
                        "department": c.employee.department.name,
                        "team": c.employee.team.name if c.employee.team_id else None,
                        "burnout_risk_pct": c.burnout_risk_pct,
                        "performance_score": c.performance_score,
                        "driver": "workload"
                        if float(c.workload_index) >= 100
                        else "burnout",
                        "suggested_type": "workload_relief",
                        "suggested_rationale": (
                            f"Burnout risk {c.burnout_risk_pct}% with "
                            f"workload index {round(float(c.workload_index))}."
                        ),
                    }
                )

        return Response(
            {
                "as_of": AS_OF.isoformat(),
                "kpis": {
                    "detected_30d": detected_n,
                    "proposed": proposed_n,
                    "active": active_n,
                    "on_track_pct": on_track_pct,
                    "followup_due": followup_due,
                    "measured": measured_n,
                    "improved_pct": improved_pct,
                },
                "outcome_mix": outcome_mix,
                "playbook": playbook,
                "featured": featured,
                "interventions": interventions_out,
                "signal_proposals": proposals_out,
                "executive_individuals_hidden": is_exec,
                "human_in_the_loop": True,
                "no_auto_start": True,
                "suppression_min": MIN_GROUP_SIZE,
                "no_people_ranking": True,
            }
        )

    @extend_schema(tags=["hr"])
    def post(self, request):
        """Create a proposed intervention from a burnout signal — does not start."""
        _require_hr_individual(request.user)
        employee_id = request.data.get("employee_id")
        try:
            emp = Employee.objects.get(pk=employee_id)
        except (Employee.DoesNotExist, TypeError, ValueError) as exc:
            raise ApiError("error.not_found", status_code=404) from exc

        owner = get_user_employee(request.user)
        if owner is None:
            # Fall back to employee's manager or the employee themselves.
            owner = emp.manager or emp

        try:
            current = EmployeeCurrent.objects.get(employee_id=emp.id)
            baseline = int(current.burnout_risk_pct)
        except EmployeeCurrent.DoesNotExist:
            baseline = int(request.data.get("baseline_risk_pct") or 0)

        next_id = (
            Intervention.objects.order_by("-id").values_list("id", flat=True).first()
            or 0
        ) + 1
        item = Intervention.objects.create(
            id=next_id,
            employee=emp,
            type=str(request.data.get("type") or "workload_relief")[:128],
            rationale=str(request.data.get("rationale") or "")[:4000],
            driver=str(request.data.get("driver") or "workload")[:128],
            status="proposed",
            proposed_by="hr_rule",
            owner=owner,
            created_at=AS_OF,
            expected_risk_reduction_pts=int(
                request.data.get("expected_risk_reduction_pts") or 15
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
                "no_auto_start": True,
            },
            status=201,
        )


class HrInterventionDetailView(APIView):
    """PATCH status transitions; approve writes AuditLog. Never auto-starts."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def patch(self, request, pk: int):
        _require_hr_individual(request.user)
        try:
            item = Intervention.objects.select_related("employee").get(pk=pk)
        except Intervention.DoesNotExist:
            raise ApiError("error.not_found", status_code=404) from None

        action = str(request.data.get("action") or "")
        today = AS_OF
        if action == "approve":
            item.status = "approved"
            item.human_approved = True
            item.approved_at = today
            emp = get_user_employee(request.user)
            if emp:
                item.approved_by = emp
            item.save()
            AuditLog.objects.create(
                actor=request.user,
                action=AuditLog.Action.INTERVENTION_APPROVE,
                employee=item.employee,
                path=request.path,
                metadata={
                    "intervention_id": item.id,
                    "status": item.status,
                    "type": item.type,
                },
            )
        elif action == "start":
            if not item.human_approved and item.status != "approved":
                raise ApiError("error.validation", status_code=400)
            item.status = "in_progress"
            item.human_approved = True
            item.started_at = item.started_at or today
            if item.approved_at is None:
                item.approved_at = today
            item.save()
        elif action == "complete":
            item.status = "completed"
            item.completed_at = today
            item.followup_at = today + timedelta(days=28)
            if request.data.get("followup_risk_pct") is not None:
                item.followup_risk_pct = float(request.data["followup_risk_pct"])
            outcome = str(request.data.get("outcome") or "pending")[:32]
            if outcome not in ("worked", "partial", "no_change", "pending"):
                raise ApiError("error.validation", status_code=400)
            item.outcome = outcome
            item.save()
        elif action == "decline":
            item.status = "declined"
            item.save()
        else:
            raise ApiError("error.validation", status_code=400)

        if item.status not in VALID_INTERVENTION_STATUSES:
            raise ApiError("error.validation", status_code=400)

        return Response(
            {
                "id": item.id,
                "status": item.status,
                "human_approved": item.human_approved,
                "outcome": item.outcome,
            }
        )


# ---------------------------------------------------------------------------
# H11 Performance–Wellbeing Matrix
# ---------------------------------------------------------------------------


class HrMatrixView(APIView):
    """
    GET /api/hr/matrix/ — org quadrants (P≥70, W≥55).
    Individual dots only for HR; executive gets counts only.
    """

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        role = _require_hr_org_viewer(request.user)
        is_exec = role == UserProfile.Role.EXECUTIVE

        dept_id = request.query_params.get("department_id")
        team_id = request.query_params.get("team_id")
        try:
            department_id = int(dept_id) if dept_id else None
            selected_team_id = int(team_id) if team_id else None
        except ValueError as exc:
            raise ApiError("error.validation", status_code=400) from exc

        qs = EmployeeCurrent.objects.select_related(
            "employee", "employee__department", "employee__team"
        )
        if selected_team_id:
            qs = qs.filter(employee__team_id=selected_team_id)
        elif department_id:
            qs = qs.filter(employee__department_id=department_id)

        currents = list(qs)
        n = len(currents)

        counts = {
            "thriving": 0,
            "burnout_risk": 0,
            "development": 0,
            "critical_support": 0,
        }
        people_by_quad: dict[str, list[dict[str, Any]]] = {
            k: [] for k in counts
        }

        for c in currents:
            q = _matrix_quad(
                float(c.performance_score), float(c.wellbeing_score)
            )
            counts[q] += 1
            if not is_exec:
                people_by_quad[q].append(
                    {
                        "id": c.employee_id,
                        "full_name": c.employee.full_name,
                        "initials": "".join(
                            p[0]
                            for p in c.employee.full_name.split()[:2]
                            if p
                        ).upper(),
                        "department": c.employee.department.name,
                        "team": c.employee.team.name
                        if c.employee.team_id
                        else None,
                        "performance_score": c.performance_score,
                        "wellbeing_score": c.wellbeing_score,
                        "quadrant": q,
                    }
                )

        for q in people_by_quad:
            people_by_quad[q].sort(key=lambda p: p["full_name"])

        # Per-department quadrant counts (suppress <5 headcount).
        by_dept: list[dict[str, Any]] = []
        dept_groups: dict[int, list[EmployeeCurrent]] = defaultdict(list)
        for c in EmployeeCurrent.objects.select_related(
            "employee", "employee__department"
        ):
            dept_groups[c.employee.department_id].append(c)

        for dept in Department.objects.order_by("name"):
            rows = dept_groups.get(dept.id, [])
            dcounts = {
                "thriving": 0,
                "burnout_risk": 0,
                "development": 0,
                "critical_support": 0,
            }
            for c in rows:
                dcounts[
                    _matrix_quad(
                        float(c.performance_score), float(c.wellbeing_score)
                    )
                ] += 1

            payload = aggregate_or_suppress(
                rows,
                lambda _rs, dcounts=dcounts, dept=dept: {
                    "department_id": dept.id,
                    "department": dept.name,
                    "counts": dcounts,
                },
            )
            if not payload.get("suppressed"):
                by_dept.append(payload)

        # Moved quadrant this quarter — compare ~13 weeks ago vs latest.
        moved_up = moved_down = None
        prior_week = AS_OF - timedelta(days=91)
        latest_week = (
            WeeklyMetric.objects.order_by("-week_start")
            .values_list("week_start", flat=True)
            .first()
        )
        prior_ws = (
            WeeklyMetric.objects.filter(week_start__lte=prior_week)
            .order_by("-week_start")
            .values_list("week_start", flat=True)
            .first()
        )
        if latest_week and prior_ws:
            latest_map = {
                m.employee_id: m
                for m in WeeklyMetric.objects.filter(week_start=latest_week)
            }
            prior_map = {
                m.employee_id: m
                for m in WeeklyMetric.objects.filter(week_start=prior_ws)
            }
            up = down = 0
            for eid, now in latest_map.items():
                old = prior_map.get(eid)
                if not old:
                    continue
                q_now = _matrix_quad(
                    float(now.performance_score), float(now.wellbeing_score)
                )
                q_old = _matrix_quad(
                    float(old.performance_score), float(old.wellbeing_score)
                )
                if q_now == q_old:
                    continue
                rank = {
                    "critical_support": 0,
                    "development": 1,
                    "burnout_risk": 1,
                    "thriving": 2,
                }
                if rank.get(q_now, 0) > rank.get(q_old, 0):
                    up += 1
                else:
                    down += 1
            moved_up = up
            moved_down = down

        teams_in_scope = {
            c.employee.team_id
            for c in currents
            if c.employee.team_id
        }

        playbooks = {
            "burnout_risk": {
                "title_key": "playbook_burnout",
                "detail_key": "playbook_burnout_detail",
            },
            "critical_support": {
                "title_key": "playbook_critical",
                "detail_key": "playbook_critical_detail",
            },
            "development": {
                "title_key": "playbook_dev",
                "detail_key": "playbook_dev_detail",
            },
            "thriving": {
                "title_key": "playbook_thriving",
                "detail_key": "playbook_thriving_detail",
            },
        }

        filters = {
            "departments": list(
                Department.objects.order_by("name").values("id", "name")
            ),
            "teams": list(
                Team.objects.filter(
                    department_id=department_id
                ).order_by("name").values("id", "name")
                if department_id
                else Team.objects.order_by("name").values("id", "name")[:40]
            ),
        }

        return Response(
            {
                "as_of": AS_OF.isoformat(),
                "thresholds": {
                    "performance": PERF_HIGH,
                    "wellbeing": WELL_HIGH,
                },
                "scope": {
                    "department_id": department_id,
                    "team_id": selected_team_id,
                    "n": n,
                    "teams": len(teams_in_scope),
                },
                "counts": counts,
                "by_department": by_dept,
                "moved": {
                    "up": moved_up,
                    "down": moved_down,
                    "not_collected": moved_up is None,
                },
                "people": None if is_exec else people_by_quad,
                "playbooks": playbooks,
                "filters": filters,
                "executive_individuals_hidden": is_exec,
                "suppression_min": MIN_GROUP_SIZE,
                "no_people_ranking": True,
            }
        )
