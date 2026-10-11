"""Employee self-service endpoints: /api/me/... — own data only."""

from __future__ import annotations

from datetime import date
from statistics import mean

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.permissions import get_user_employee
from innovation.models import Idea, Recognition
from org.models import Employee
from pulse.models import EmployeeCurrent, Skill, WeeklyMetric
from pulse.serializers import parse_drivers

# EMPULSE score weights (design / M04b) — wellbeing is always 0%.
WEIGHTS = {
    "task_completion": 0.25,
    "attendance": 0.10,
    "professionalism": 0.10,
    "innovation": 0.15,
    "collaboration": 0.15,
    "digital": 0.10,
    "engagement": 0.15,
    "wellbeing": 0.0,
}

TIER_BANDS = {"growth": 0, "bronze": 70, "silver": 80, "gold": 90}


def _require_own_employee(user):
    emp = get_user_employee(user)
    if emp is None:
        raise ApiError("auth.profile_missing", status_code=403)
    return emp


def _current_or_none(emp):
    try:
        return emp.current
    except EmployeeCurrent.DoesNotExist:
        return None


def _trajectory(emp, n: int = 26):
    weeks = list(
        WeeklyMetric.objects.filter(employee=emp)
        .order_by("-week_start")[:n]
        .values(
            "week_start",
            "burnout_risk_pct",
            "performance_score",
            "wellbeing_score",
            "engagement_score",
            "workload_index",
            "overtime_hours_monthly",
            "mood_score",
        )
    )
    weeks.reverse()
    return [
        {
            "week_start": w["week_start"].isoformat(),
            "burnout_risk_pct": w["burnout_risk_pct"],
            "performance_score": w["performance_score"],
            "wellbeing_score": w["wellbeing_score"],
            "engagement_score": w["engagement_score"],
            "workload_index": w["workload_index"],
            "overtime_hours_monthly": w["overtime_hours_monthly"],
            "mood_score": w["mood_score"],
        }
        for w in weeks
    ]


def _points_to_next_tier(score: int, tier: str) -> int:
    t = tier.lower()
    if t == "gold" or score >= 90:
        return 0
    if score < 70:
        return 70 - score
    if score < 80:
        return 80 - score
    return 90 - score


def _serialize_current(current: EmployeeCurrent | None) -> dict | None:
    if current is None:
        return None
    score = int(current.performance_score)
    tier = current.performance_tier
    return {
        "as_of": current.as_of.isoformat(),
        "performance_score": score,
        "performance_tier": tier,
        "performance_delta": None,  # filled by caller from trajectory when available
        "points_to_next_tier": _points_to_next_tier(score, tier),
        "next_tier": "gold"
        if score < 90
        else None,
        "wellbeing_score": current.wellbeing_score,
        "burnout_risk_pct": current.burnout_risk_pct,
        "burnout_level": current.burnout_level,
        "burnout_change_6w_pts": current.burnout_change_6w_pts,
        "attrition_risk_pct": current.attrition_risk_pct,
        "innovation_score": current.innovation_score,
        "engagement_score": current.engagement_score,
        "workload_index": current.workload_index,
        "overtime_hours_monthly": current.overtime_hours_monthly,
        "task_completion_rate": current.task_completion_rate,
        "task_quality_score": current.task_quality_score,
        "collaboration_score": current.collaboration_score,
        "mood_score": current.mood_score,
        "work_life_balance": current.work_life_balance,
        "job_satisfaction": current.job_satisfaction,
        "recognition_90d": current.recognition_90d,
        "ideas_submitted_12m": current.ideas_submitted_12m,
        "ideas_approved_12m": current.ideas_approved_12m,
        "ideas_implemented_12m": current.ideas_implemented_12m,
        "drivers": parse_drivers(current.burnout_drivers),
        "dimensions": {
            "task_completion": round(float(current.task_completion_rate), 1),
            "attendance": None,  # not collected
            "professionalism": None,  # not collected
            "innovation": round(float(current.innovation_score), 1),
            "collaboration": round(float(current.collaboration_score), 1),
            "digital": None,  # not collected
            "engagement": round(float(current.engagement_score), 1),
            "wellbeing": current.wellbeing_score,
        },
        "weights": WEIGHTS,
    }


def _changes_since(traj: list[dict], current: EmployeeCurrent | None, weeks_ago: int = 12):
    """Compare current to a point ~weeks_ago in the weekly series."""
    if not current or len(traj) < 2:
        return []
    idx = max(0, len(traj) - 1 - weeks_ago)
    past = traj[idx]
    items = []
    pairs = [
        ("wellbeing", float(past["wellbeing_score"]), float(current.wellbeing_score), ""),
        ("engagement", float(past["engagement_score"]), float(current.engagement_score), ""),
        ("workload", float(past["workload_index"]), float(current.workload_index), "%"),
        ("performance", float(past["performance_score"]), float(current.performance_score), ""),
    ]
    for metric, old, new, unit in pairs:
        delta = round(new - old, 1)
        items.append(
            {
                "metric": metric,
                "from": round(old, 1),
                "to": round(new, 1),
                "delta": delta,
                "unit": unit,
            }
        )
    return items


def _formula_rows(current: EmployeeCurrent) -> tuple[list[dict], float]:
    dims = [
        ("task_completion", float(current.task_completion_rate), WEIGHTS["task_completion"]),
        ("attendance", None, WEIGHTS["attendance"]),
        ("professionalism", None, WEIGHTS["professionalism"]),
        ("innovation", float(current.innovation_score), WEIGHTS["innovation"]),
        ("collaboration", float(current.collaboration_score), WEIGHTS["collaboration"]),
        ("digital", None, WEIGHTS["digital"]),
        ("engagement", float(current.engagement_score), WEIGHTS["engagement"]),
        ("wellbeing", float(current.wellbeing_score), WEIGHTS["wellbeing"]),
    ]
    missing_w = sum(w for _k, v, w in dims if v is None)
    active_w = max(0.0001, 1.0 - missing_w - WEIGHTS["wellbeing"])
    rows: list[dict] = []
    exact = 0.0
    for key, value, weight in dims:
        if value is None:
            rows.append(
                {
                    "id": key,
                    "value": None,
                    "weight": weight,
                    "weight_effective": None,
                    "contribution": None,
                    "measured": False,
                    "label_status": "not_collected",
                }
            )
            continue
        if weight == 0:
            rows.append(
                {
                    "id": key,
                    "value": round(value, 1),
                    "weight": weight,
                    "weight_effective": 0.0,
                    "contribution": None,
                    "measured": True,
                    "label_status": "not_scored",
                }
            )
            continue
        adj_w = weight / active_w
        contrib = round(value * adj_w, 2)
        exact += contrib
        rows.append(
            {
                "id": key,
                "value": round(value, 1),
                "weight": weight,
                "weight_effective": round(adj_w, 4),
                "contribution": contrib,
                "measured": True,
                "label_status": "scored",
            }
        )
    return rows, round(exact, 2)


def _dna_traits(emp, current: EmployeeCurrent | None) -> list[dict]:
    """
    Innovation DNA traits from own skills + idea metrics.
    Org-median bars are omitted (would need aggregate); mark as projected where needed.
    Never returns percentiles or ranks vs other people.
    """
    skills = list(emp.skills.values("skill", "category", "level"))
    by_cat: dict[str, list[int]] = {}
    for s in skills:
        by_cat.setdefault(s["category"].lower(), []).append(int(s["level"]))

    def cat_avg(*names: str) -> float | None:
        vals = []
        for n in names:
            vals.extend(by_cat.get(n, []))
        return round(mean(vals) * 20, 1) if vals else None  # level 1–5 → ~20–100

    ideas = list(
        Idea.objects.filter(employee=emp).values(
            "novelty_score",
            "feasibility_score",
            "business_value_score",
            "status",
            "realized_value_sar",
            "estimated_value_sar",
        )
    )
    novelty = (
        round(mean(i["novelty_score"] for i in ideas), 1) if ideas else None
    )
    feasibility = (
        round(mean(i["feasibility_score"] for i in ideas), 1) if ideas else None
    )
    biz = (
        round(mean(i["business_value_score"] for i in ideas), 1) if ideas else None
    )
    impl_ratio = None
    if current and current.ideas_submitted_12m:
        impl_ratio = round(
            current.ideas_implemented_12m / max(1, current.ideas_submitted_12m) * 100,
            1,
        )

    traits = [
        {
            "id": "idea_generation",
            "score": novelty if novelty is not None else cat_avg("innovation", "creative"),
            "source": "ideas" if novelty is not None else ("skills" if cat_avg("innovation", "creative") else None),
            "projected": novelty is None and cat_avg("innovation", "creative") is None,
        },
        {
            "id": "problem_solving",
            "score": feasibility
            if feasibility is not None
            else (
                round(float(current.task_quality_score), 1) if current else None
            ),
            "source": "ideas" if feasibility is not None else "task_quality",
            "projected": False,
        },
        {
            "id": "experimentation",
            "score": round(float(current.innovation_score), 1) if current else None,
            "source": "innovation_score",
            "projected": False,
        },
        {
            "id": "collaboration",
            "score": round(float(current.collaboration_score), 1) if current else None,
            "source": "collaboration_score",
            "projected": False,
        },
        {
            "id": "digital_innovation",
            "score": cat_avg("digital", "technology", "tech"),
            "source": "skills",
            "projected": cat_avg("digital", "technology", "tech") is None,
        },
        {
            "id": "implementation",
            "score": impl_ratio,
            "source": "ideas_implemented_ratio",
            "projected": impl_ratio is None,
        },
        {
            "id": "business_impact",
            "score": biz,
            "source": "ideas",
            "projected": biz is None,
        },
    ]
    for t in traits:
        if t["score"] is None:
            t["projected"] = True
    return traits


class MeOverviewView(APIView):
    """GET /api/me/overview/ — E01 own pulse, tier, changes, ideas, recognition."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        current = _current_or_none(emp)
        traj = _trajectory(emp, 26)
        cur = _serialize_current(current)
        if cur and traj:
            past = traj[0]
            cur["performance_delta"] = round(
                float(current.performance_score) - float(past["performance_score"]), 1
            )

        recognitions = list(
            Recognition.objects.filter(receiver=emp)
            .select_related("giver")
            .order_by("-created_at")[:6]
            .values(
                "id",
                "type",
                "message",
                "created_at",
                "giver__full_name",
            )
        )
        ideas = list(
            Idea.objects.filter(employee=emp)
            .order_by("-submitted_at")
            .values(
                "id",
                "title",
                "status",
                "category",
                "submitted_at",
                "estimated_value_sar",
                "realized_value_sar",
            )[:8]
        )

        # Balance: overtime/workload from DB; focus/meetings not collected
        hours_proxy = None
        if current:
            # Rough weekly hours from workload_index (same proxy as M06)
            hours_proxy = round(30 + float(current.workload_index) * 0.25, 1)

        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "first_name": emp.first_name,
                "job_title": emp.job_title,
                "department": emp.department.name,
                "team": emp.team.name if emp.team_id else None,
                "current": cur,
                "trajectory": traj,
                "changes": _changes_since(traj, current, weeks_ago=min(12, max(0, len(traj) - 1))),
                "recognitions": [
                    {
                        "id": r["id"],
                        "type": r["type"],
                        "message": r["message"],
                        "created_at": r["created_at"].isoformat(),
                        "giver_name": r["giver__full_name"],
                    }
                    for r in recognitions
                ],
                "ideas": [
                    {
                        **row,
                        "display_id": f"IDEA-{row['id']:03d}",
                        "submitted_at": row["submitted_at"].isoformat()
                        if row["submitted_at"]
                        else None,
                    }
                    for row in ideas
                ],
                "balance": {
                    "planned_hours": 40,
                    "work_hours": hours_proxy,
                    "work_hours_projected": True,
                    "recovery": None,
                    "focus_hours": None,
                    "meeting_hours": None,
                    "after_hours": round(float(current.overtime_hours_monthly) / 4, 1)
                    if current
                    else None,
                    "after_hours_note": "from_overtime_monthly",
                },
                "privacy": {
                    "own_data_only": True,
                    "checkins_private": True,
                },
            }
        )


class MePerformanceView(APIView):
    """GET /api/me/performance/ — E02 own tier + score journey; never rank/percentile."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        current = _current_or_none(emp)
        traj = _trajectory(emp, 28)
        cur = _serialize_current(current)
        formula = ([], None)
        if current:
            formula = _formula_rows(current)

        # Monthly score journey from weekly series (last point per month)
        monthly: dict[str, float] = {}
        for w in traj:
            key = w["week_start"][:7]  # YYYY-MM
            monthly[key] = float(w["performance_score"])
        journey = [
            {"month": k, "score": round(v, 1)} for k, v in sorted(monthly.items())[-7:]
        ]

        recognitions = list(
            Recognition.objects.filter(receiver=emp)
            .select_related("giver")
            .order_by("-created_at")[:8]
            .values(
                "id",
                "type",
                "message",
                "created_at",
                "is_public",
                "giver__first_name",
            )
        )
        # Own-trend vs first month in journey (never vs peers).
        own_trend = None
        if journey:
            first = journey[0]["score"]
            last = journey[-1]["score"]
            own_trend = {
                "from_month": journey[0]["month"],
                "to_month": journey[-1]["month"],
                "delta": round(last - first, 1),
                "personal_best": last >= max(m["score"] for m in journey),
            }

        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "first_name": emp.first_name,
                "job_title": emp.job_title,
                "team": emp.team.name if emp.team_id else None,
                "current": cur,
                "journey": journey,
                "own_trend": own_trend,
                "trajectory": traj,
                "formula_rows": formula[0],
                "formula_exact": formula[1],
                "recognitions": [
                    {
                        "id": r["id"],
                        "type": r["type"],
                        "message": r["message"],
                        "created_at": r["created_at"].isoformat(),
                        "is_public": r["is_public"],
                        "giver_first_name": r["giver__first_name"],
                    }
                    for r in recognitions
                ],
                "recognition_types": list(
                    dict.fromkeys(r["type"] for r in recognitions)
                ),
                "no_ranking": True,
                "tier_bands": TIER_BANDS,
            }
        )


class MeTwinView(APIView):
    """GET /api/me/twin/ — E03 digital twin; same shape as manager member profile, own only."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        current = _current_or_none(emp)
        traj = _trajectory(emp, 16)
        cur = _serialize_current(current)
        if cur and traj:
            past = traj[0]
            cur["performance_delta"] = round(
                float(current.performance_score) - float(past["performance_score"]), 1
            )

        skills = list(
            emp.skills.order_by("skill").values("skill", "category", "level")[:20]
        )
        ideas = list(
            emp.ideas.order_by("-submitted_at").values(
                "id", "title", "status", "category", "submitted_at"
            )[:8]
        )
        interventions = list(
            emp.interventions.order_by("-created_at").values(
                "id",
                "type",
                "status",
                "rationale",
                "expected_risk_reduction_pts",
                "baseline_risk_pct",
                "followup_risk_pct",
                "outcome",
                "human_approved",
                "created_at",
            )[:8]
        )
        formula = _formula_rows(current) if current else ([], None)
        recognitions = list(
            Recognition.objects.filter(receiver=emp)
            .order_by("-created_at")
            .values("type")[:4]
        )

        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "email": emp.email,
                "job_title": emp.job_title,
                "job_level": emp.job_level,
                "department": emp.department.name,
                "team": emp.team.name if emp.team_id else None,
                "manager_name": emp.manager.full_name if emp.manager_id else None,
                "hire_date": emp.hire_date.isoformat(),
                "tenure_years": emp.tenure_years,
                "work_location": emp.work_location,
                "work_mode": emp.work_mode,
                "current": cur,
                "skills": skills,
                "ideas": [
                    {
                        **row,
                        "submitted_at": row["submitted_at"].isoformat()
                        if row["submitted_at"]
                        else None,
                    }
                    for row in ideas
                ],
                "interventions": [
                    {
                        **row,
                        "created_at": row["created_at"].isoformat()
                        if row["created_at"]
                        else None,
                    }
                    for row in interventions
                ],
                "trajectory": traj,
                "formula_rows": formula[0],
                "formula_exact": formula[1],
                "recognition_types": [r["type"] for r in recognitions],
                "changes": _changes_since(traj, current, weeks_ago=min(12, max(0, len(traj) - 1))),
                "own": True,
            }
        )


class MeInnovationDnaView(APIView):
    """GET /api/me/innovation-dna/ — E04 own innovation traits + ideas; no people ranking."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        current = _current_or_none(emp)
        traits = _dna_traits(emp, current)
        ideas = list(
            Idea.objects.filter(employee=emp)
            .order_by("-submitted_at")
            .values(
                "id",
                "title",
                "status",
                "category",
                "submitted_at",
                "novelty_score",
                "feasibility_score",
                "business_value_score",
                "estimated_value_sar",
                "realized_value_sar",
            )
        )
        # Signature from strongest measured trait — never design copy as her result.
        measured = [t for t in traits if t["score"] is not None and not t["projected"]]
        strongest = max(measured, key=lambda t: t["score"]) if measured else None
        weakest = min(measured, key=lambda t: t["score"]) if measured else None
        skills = list(emp.skills.order_by("-level", "skill").values("skill", "level")[:4])
        is_example = strongest is None

        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "traits": traits,
                "strongest": strongest,
                "development": weakest,
                "signature": {
                    "is_example": is_example,
                    "trait_id": strongest["id"] if strongest else None,
                    "score": strongest["score"] if strongest else None,
                    "skills": [s["skill"] for s in skills],
                    "ideas_count": len(ideas),
                },
                "ideas": [
                    {
                        **row,
                        "display_id": f"IDEA-{row['id']:03d}",
                        "submitted_at": row["submitted_at"].isoformat()
                        if row["submitted_at"]
                        else None,
                    }
                    for row in ideas
                ],
                "innovation_score": float(current.innovation_score) if current else None,
                "ideas_submitted_12m": current.ideas_submitted_12m if current else 0,
                "no_ranking": True,
                "org_median_note": "not_shown",  # avoid percentile/leaderboard framing
            }
        )


class MeInnovationLabView(APIView):
    """
    GET /api/me/innovation-lab/ — draft context + own recent ideas.
    POST — submit an idea (status under_review); PulseAI scores are projected stubs.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        ideas = list(
            Idea.objects.filter(employee=emp)
            .order_by("-submitted_at")
            .values(
                "id",
                "title",
                "status",
                "category",
                "submitted_at",
                "novelty_score",
                "feasibility_score",
                "business_value_score",
                "estimated_value_sar",
                "realized_value_sar",
            )[:10]
        )
        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "ideas": [
                    {
                        **row,
                        "display_id": f"IDEA-{row['id']:03d}",
                        "submitted_at": row["submitted_at"].isoformat()
                        if row["submitted_at"]
                        else None,
                    }
                    for row in ideas
                ],
            }
        )

    @extend_schema(tags=["me"])
    def post(self, request):
        emp = _require_own_employee(request.user)
        title = str(request.data.get("title") or "").strip()
        if not title:
            raise ApiError("error.validation", status_code=400)

        cost = float(request.data.get("expected_cost_sar") or 0)
        savings = float(request.data.get("expected_savings_sar") or 0)
        roi = round(savings / cost, 2) if cost > 0 else None

        # Projected PulseAI scores (stub until Step 8) — clearly marked
        novelty = int(request.data.get("novelty_score") or 72)
        feasibility = int(request.data.get("feasibility_score") or 78)
        business_value = int(request.data.get("business_value_score") or 70)
        readiness = round((novelty + feasibility + business_value) / 3)

        next_id = (Idea.objects.order_by("-id").values_list("id", flat=True).first() or 0) + 1
        idea = Idea.objects.create(
            id=next_id,
            employee=emp,
            title=title[:255],
            category=str(request.data.get("category") or "Process")[:64],
            status="under_review",
            novelty_score=novelty,
            feasibility_score=feasibility,
            business_value_score=business_value,
            submitted_at=date.today(),
            estimated_value_sar=savings or None,
            is_public=False,
        )
        return Response(
            {
                "id": idea.id,
                "display_id": f"IDEA-{idea.id:03d}",
                "status": idea.status,
                "roi": roi,
                "pulseai": {
                    "projected": True,
                    "readiness": readiness,
                    "novelty": novelty,
                    "feasibility": feasibility,
                    "expected_value": business_value,
                    "potential_impact": max(50, readiness - 8),
                    "roi_estimate": round(roi * 0.85, 2) if roi else None,
                    "note": "projected_stub_step8",
                },
            },
            status=201,
        )


def _author_public(emp: Employee) -> dict:
    """Marketplace/wall author: first name + team only — never wellbeing/risk."""
    return {
        "first_name": emp.first_name,
        "team": emp.team.name if emp.team_id else None,
    }


class MeMarketplaceView(APIView):
    """GET /api/me/marketplace/ — public ideas only (is_public=1), date sort, no scores ranking."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        _require_own_employee(request.user)
        qs = (
            Idea.objects.filter(is_public=True)
            .select_related("employee", "employee__team", "employee__department")
            .order_by("-submitted_at", "id")
        )
        ideas = list(qs[:60])
        submitted = qs.count()
        approved = qs.filter(status="approved").count()
        implemented = qs.filter(status="implemented").count()
        in_build = qs.filter(status="approved").count()  # recruiting/build proxy
        realized = sum(float(i.realized_value_sar or 0) for i in ideas)

        return Response(
            {
                "metrics": {
                    "ideas_submitted": submitted,
                    "approved": approved,
                    "in_build": in_build,
                    "implemented": implemented,
                    "realized_savings_sar": round(realized, 0),
                },
                "ideas": [
                    {
                        "id": idea.id,
                        "display_id": f"IDEA-{idea.id:03d}",
                        "title": idea.title,
                        "category": idea.category,
                        "status": idea.status,
                        "submitted_at": idea.submitted_at.isoformat(),
                        "estimated_value_sar": idea.estimated_value_sar,
                        "realized_value_sar": idea.realized_value_sar,
                        "author": _author_public(idea.employee),
                        # Scores omitted from sort; included only as idea metadata (not wellbeing).
                        "novelty_score": idea.novelty_score,
                        "feasibility_score": idea.feasibility_score,
                        "business_value_score": idea.business_value_score,
                    }
                    for idea in ideas
                ],
                "sorted_by": "submitted_at",
                "public_only": True,
                "never_includes": ["wellbeing", "burnout_risk", "attrition"],
            }
        )


class MeGrowthView(APIView):
    """GET /api/me/growth/ — own skills + training; rule-based recommendations labelled."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        current = _current_or_none(emp)
        skills = list(
            Skill.objects.filter(employee=emp)
            .order_by("skill")
            .values("skill", "category", "level")
        )
        # Map level 1–5 → readiness score / target (target = max(level*20+10, 70) capped)
        readiness = []
        for s in skills:
            score = int(s["level"]) * 20
            target = min(100, max(70, score + 10))
            readiness.append(
                {
                    "skill": s["skill"],
                    "category": s["category"],
                    "level": s["level"],
                    "score": score,
                    "target": target,
                    "met": score >= target,
                }
            )
        # Rule-based recommendations (labelled) from lowest readiness skills.
        gaps = sorted(readiness, key=lambda r: (r["score"] - r["target"], r["skill"]))[:3]
        recommendations = [
            {
                "title": f"Practice: {g['skill']}",
                "reason": "rule_lowest_skill_gap",
                "labelled": True,
                "skill": g["skill"],
                "gap": g["target"] - g["score"],
            }
            for g in gaps
            if g["score"] < g["target"]
        ]
        if current and float(current.innovation_score) < 80:
            recommendations.append(
                {
                    "title": "Co-lead one Innovation Lab build",
                    "reason": "rule_innovation_below_80",
                    "labelled": True,
                    "skill": "implementation",
                    "gap": None,
                }
            )

        training_hours = None
        if current:
            # Proxy: training_times_last_year × ~7h (not in DB as hours).
            training_hours = int(current.training_times_last_year) * 7

        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "first_name": emp.first_name,
                "job_title": emp.job_title,
                "manager_name": emp.manager.full_name if emp.manager_id else None,
                "hire_date": emp.hire_date.isoformat(),
                "skills": skills,
                "readiness": readiness,
                "recommendations": recommendations,
                "recommendations_labelled": True,
                "training": {
                    "times_last_year": current.training_times_last_year if current else 0,
                    "hours_proxy": training_hours,
                    "hours_projected": True,
                },
                "ideas_implemented_12m": current.ideas_implemented_12m if current else 0,
            }
        )


class MeRecognitionWallView(APIView):
    """
    GET /api/me/recognition/ — public wall (newest first) + own received.
    POST — send recognition to a colleague (creates a row).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        public_qs = Recognition.objects.filter(is_public=True)
        public_count = public_qs.count()
        wall = list(
            public_qs.select_related(
                "giver", "receiver", "giver__team", "receiver__team"
            )
            .order_by("-created_at", "id")[:50]
        )
        mine = list(
            Recognition.objects.filter(receiver=emp)
            .select_related("giver")
            .order_by("-created_at")[:20]
        )
        colleagues = list(
            Employee.objects.exclude(id=emp.id)
            .select_related("team")
            .order_by("full_name")
            .values("id", "first_name", "full_name", "team__name")[:80]
        )
        return Response(
            {
                "wall": [
                    {
                        "id": r.id,
                        "type": r.type,
                        "message": r.message,
                        "created_at": r.created_at.isoformat(),
                        "is_public": True,
                        "giver": _author_public(r.giver),
                        "receiver": _author_public(r.receiver),
                    }
                    for r in wall
                ],
                "received": [
                    {
                        "id": r.id,
                        "type": r.type,
                        "message": r.message,
                        "created_at": r.created_at.isoformat(),
                        "is_public": r.is_public,
                        "giver_first_name": r.giver.first_name,
                    }
                    for r in mine
                ],
                "colleagues": [
                    {
                        "id": c["id"],
                        "first_name": c["first_name"],
                        "full_name": c["full_name"],
                        "team": c["team__name"],
                    }
                    for c in colleagues
                ],
                "public_count": public_count,
                "public_only": True,
                "sorted_by": "created_at",
                "no_leaderboard": True,
            }
        )

    @extend_schema(tags=["me"])
    def post(self, request):
        emp = _require_own_employee(request.user)
        receiver_id = request.data.get("receiver_id")
        try:
            receiver_id = int(receiver_id)
        except (TypeError, ValueError):
            raise ApiError("error.validation", status_code=400)
        if receiver_id == emp.id:
            raise ApiError("error.validation", status_code=400)
        if not Employee.objects.filter(id=receiver_id).exists():
            raise ApiError("error.not_found", status_code=404)

        next_id = (Recognition.objects.order_by("-id").values_list("id", flat=True).first() or 0) + 1
        rec = Recognition.objects.create(
            id=next_id,
            giver=emp,
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
                "is_public": rec.is_public,
            },
            status=201,
        )


class MePulseAIStubView(APIView):
    """POST /api/me/pulseai/ — stub answer from own data only (Step 8 wires LLM)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def post(self, request):
        emp = _require_own_employee(request.user)
        current = _current_or_none(emp)
        question = str(request.data.get("question") or "").strip()
        traj = _trajectory(emp, 8)

        eng = float(current.engagement_score) if current else None
        burn = float(current.burnout_risk_pct) if current else None
        perf = float(current.performance_score) if current else None
        ideas_n = current.ideas_submitted_12m if current else 0

        return Response(
            {
                "stub": True,
                "own_data_only": True,
                "question": question or "How am I doing this quarter?",
                "data_used": [
                    {"label": "Your engagement (current)", "value": eng},
                    {"label": "Your burnout risk (current)", "value": burn},
                    {"label": "Your EMPULSE score", "value": perf},
                    {"label": "Ideas submitted (12m)", "value": ideas_n},
                    {"label": "Weekly points in series", "value": len(traj)},
                ],
                "findings": [
                    f"Your EMPULSE score is {int(perf) if perf is not None else '—'} on your own series — never a rank.",
                    f"Burnout risk is {int(burn) if burn is not None else '—'}% (decision support, not a diagnosis).",
                    "Wellbeing stays outside the performance score.",
                ],
                "recommendation": {
                    "summary": "Protect focus blocks and pick one growth skill to practice this month.",
                    "actions": [
                        "Open My Growth Path for labelled skill recommendations",
                        "Submit or join one Innovation Lab idea if capacity allows",
                        "Send recognition to a colleague who unblocked you recently",
                    ],
                },
                "never_sees": [
                    "Other people's private scores",
                    "Private check-in free text from colleagues",
                    "Health or medical data",
                ],
            }
        )


class MeReportsView(APIView):
    """GET /api/me/reports/ — downloadable summary of own data only."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        current = _current_or_none(emp)
        traj = _trajectory(emp, 12)
        recognitions = Recognition.objects.filter(receiver=emp).count()
        ideas = Idea.objects.filter(employee=emp).count()
        skills = list(
            Skill.objects.filter(employee=emp)
            .order_by("skill")
            .values("skill", "category", "level")
        )
        rows = [
            {"section": "identity", "key": "full_name", "value": emp.full_name},
            {"section": "identity", "key": "job_title", "value": emp.job_title},
            {"section": "identity", "key": "team", "value": emp.team.name if emp.team_id else ""},
            {
                "section": "performance",
                "key": "performance_score",
                "value": current.performance_score if current else "",
            },
            {
                "section": "performance",
                "key": "performance_tier",
                "value": current.performance_tier if current else "",
            },
            {
                "section": "wellbeing",
                "key": "wellbeing_score",
                "value": current.wellbeing_score if current else "",
            },
            {
                "section": "wellbeing",
                "key": "burnout_risk_pct",
                "value": current.burnout_risk_pct if current else "",
            },
            {"section": "counts", "key": "recognitions_received", "value": recognitions},
            {"section": "counts", "key": "ideas", "value": ideas},
        ]
        for s in skills:
            rows.append(
                {
                    "section": "skill",
                    "key": s["skill"],
                    "value": s["level"],
                }
            )
        for w in traj:
            rows.append(
                {
                    "section": "week",
                    "key": w["week_start"],
                    "value": w["performance_score"],
                }
            )
        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "generated_at": date.today().isoformat(),
                "own_data_only": True,
                "rows": rows,
                "csv_header": ["section", "key", "value"],
            }
        )


class MeSettingsStubView(APIView):
    """GET/PATCH /api/me/settings/ — privacy toggles stub + visibility copy keys."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def get(self, request):
        emp = _require_own_employee(request.user)
        return Response(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "privacy_stub": {
                    "share_checkin_trend": True,
                    "show_on_recognition_wall": True,
                    "manager_may_see_wellbeing": True,
                },
                "stub": True,
                "visibility": {
                    "manager_can_see": [
                        "scores_and_tiers",
                        "wellbeing_shared_levels",
                        "innovation_ideas",
                        "recognition_public",
                    ],
                    "manager_cannot_see": [
                        "private_checkin_text",
                        "other_teams",
                    ],
                    "hr_can_see": [
                        "profile_via_audited_access",
                        "aggregates",
                    ],
                    "hr_cannot_see": [
                        "unaudited_individual_browsing",
                    ],
                    "executive_sees": ["aggregates_only"],
                },
            }
        )

    @extend_schema(tags=["me"])
    def patch(self, request):
        emp = _require_own_employee(request.user)
        # Stub: accept and echo — persistence is localStorage on the client for now.
        body = request.data if isinstance(request.data, dict) else {}
        return Response(
            {
                "id": emp.id,
                "stub": True,
                "saved": True,
                "privacy_stub": {
                    "share_checkin_trend": bool(
                        body.get("share_checkin_trend", True)
                    ),
                    "show_on_recognition_wall": bool(
                        body.get("show_on_recognition_wall", True)
                    ),
                    "manager_may_see_wellbeing": bool(
                        body.get("manager_may_see_wellbeing", True)
                    ),
                },
            }
        )
