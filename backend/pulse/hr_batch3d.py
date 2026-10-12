"""H02b, H12, H14–H16 HR endpoints (capability, economic, reports, governance, PulseAI stub)."""

from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean
from typing import Any

from django.db.models import Avg, Count, Sum
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import AuditLog, UserProfile
from accounts.permissions import get_user_role
from analytics.aggregates import MIN_GROUP_SIZE, aggregate_or_suppress
from analytics.models import EconomicImpactMonthly
from innovation.models import Idea, Recognition
from interventions.models import Intervention
from org.models import Department, Employee, Team
from org.privacy import assert_not_executive_individual
from pulse.agg_cache import cached_aggregate
from pulse.models import EmployeeCurrent, WeeklyMetric

AS_OF = date(2026, 10, 6)
ELEVATED = 60
FY_START = date(2026, 1, 1)
Q2_START = date(2026, 4, 1)
Q2_END = date(2026, 6, 30)
Q3_START = date(2026, 7, 1)
Q3_END = date(2026, 9, 30)

TIERS = ("gold", "silver", "bronze", "growth")
TIER_SCORE = {"gold": 90, "silver": 85, "bronze": 75, "growth": 64}

ASSUMPTIONS = [
    {
        "id": "attrition_baseline",
        "formula": "expected_exits_baseline = headcount × 13% / 12",
        "note": "Assumed yearly attrition 13%.",
        "estimated": True,
    },
    {
        "id": "exits_avoided",
        "formula": (
            "exits_avoided = baseline × min(3 × relative risk drop vs first 3 months, 0.5)"
        ),
        "note": "Capped at 50% of baseline exits.",
        "estimated": True,
    },
    {
        "id": "retention_savings",
        "formula": "retention_savings_sar = exits_avoided × avg annual salary × 1.0",
        "note": "Replacement cost multiplier = 1.0.",
        "estimated": True,
    },
    {
        "id": "productivity_gain",
        "formula": (
            "productivity_gain_sar = headcount × avg monthly salary × 0.5 "
            "× (burnout risk drop pts vs first 3 months) / 100"
        ),
        "note": "Fewer lost productive days when burnout falls.",
        "estimated": True,
    },
    {
        "id": "innovation_value",
        "formula": "innovation_value_sar = Σ realized_value_sar of ideas implemented that month",
        "note": "From ideas table realized value.",
        "estimated": True,
    },
    {
        "id": "program_cost",
        "formula": "program_cost_sar = intervention costs + platform running cost share",
        "note": "Allocated across departments.",
        "estimated": True,
    },
    {
        "id": "net_impact",
        "formula": (
            "net_impact_sar = retention + productivity + innovation − program_cost"
        ),
        "note": "ROI% = net / program_cost × 100.",
        "estimated": True,
    },
]

PRIVACY_RULES = [
    {
        "id": "no_leaderboards",
        "title_key": "no_leaderboards",
        "body_key": "no_leaderboards_body",
    },
    {
        "id": "suppress_under_5",
        "title_key": "suppress_under_5",
        "body_key": "suppress_under_5_body",
    },
    {
        "id": "human_in_the_loop",
        "title_key": "human_in_the_loop",
        "body_key": "human_in_the_loop_body",
    },
    {
        "id": "wellbeing_not_in_score",
        "title_key": "wellbeing_not_in_score",
        "body_key": "wellbeing_not_in_score_body",
    },
    {
        "id": "executive_aggregates",
        "title_key": "executive_aggregates",
        "body_key": "executive_aggregates_body",
    },
]


def _require_hr_org_viewer(user):
    role = get_user_role(user)
    if role not in (
        UserProfile.Role.HR,
        UserProfile.Role.EXECUTIVE,
        UserProfile.Role.ADMIN,
    ):
        raise ApiError("auth.permission_denied", status_code=403)
    return role


def _require_hr_admin(user):
    """H15 Governance — HR/admin only (not executive, not manager)."""
    role = get_user_role(user)
    if role not in (UserProfile.Role.HR, UserProfile.Role.ADMIN):
        raise ApiError("auth.permission_denied", status_code=403)
    return role


def _avg(vals: list[float]) -> float | None:
    return round(mean(vals), 1) if vals else None


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


def _tier_rank(t: str) -> int:
    order = {"growth": 0, "bronze": 1, "silver": 2, "gold": 3}
    return order.get((t or "").lower(), 0)


def _norm_tier(raw: str | None, score: float | None = None) -> str:
    t = (raw or "").lower().strip()
    if t in TIERS:
        return t
    if score is not None:
        return _tier_of(float(score))
    return "growth"


# ---------------------------------------------------------------------------
# H02b Professional Capability Distribution
# ---------------------------------------------------------------------------


class HrCapabilityView(APIView):
    """GET /api/hr/capability/ — tier distribution by dept/level; no leaderboard."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        role = _require_hr_org_viewer(request.user)
        is_exec = role == UserProfile.Role.EXECUTIVE

        dept_id = request.query_params.get("department_id")
        try:
            department_id = int(dept_id) if dept_id else None
        except ValueError as exc:
            raise ApiError("error.validation", status_code=400) from exc

        qs = EmployeeCurrent.objects.select_related(
            "employee", "employee__department"
        )
        if department_id:
            qs = qs.filter(employee__department_id=department_id)
        currents = list(qs)
        n = len(currents)

        # Q2 tier mix from weekly averages.
        q2_weeks = WeeklyMetric.objects.filter(
            week_start__gte=Q2_START, week_start__lte=Q2_END
        )
        if department_id:
            q2_weeks = q2_weeks.filter(employee__department_id=department_id)
        q2_map = {
            r["employee_id"]: _tier_of(float(r["p"] or 0))
            for r in q2_weeks.values("employee_id").annotate(
                p=Avg("performance_score")
            )
        }
        q2_counts = {t: 0 for t in TIERS}
        for t in q2_map.values():
            q2_counts[t] = q2_counts.get(t, 0) + 1
        q2_total = max(1, sum(q2_counts.values()))

        tier_counts = {t: 0 for t in TIERS}
        alert_by_tier = {t: 0 for t in TIERS}
        for c in currents:
            t = _norm_tier(c.performance_tier, float(c.performance_score))
            tier_counts[t] += 1
            elev = (c.burnout_level or "").lower() == "high" or float(
                c.burnout_risk_pct
            ) >= ELEVATED
            if elev:
                alert_by_tier[t] += 1

        total = max(1, n)
        tiers_out = {}
        for t in TIERS:
            count = tier_counts[t]
            pct = round(100.0 * count / total, 1)
            q2_pct = round(100.0 * q2_counts.get(t, 0) / q2_total, 1)
            tiers_out[t] = {
                "count": count,
                "pct": pct,
                "delta_pp_vs_q2": round(pct - q2_pct, 1),
                "score_anchor": TIER_SCORE[t],
            }

        alerts_n = sum(alert_by_tier.values())
        gold_elevated = alert_by_tier["gold"]

        # By department (suppress <5) — always org-wide for the table.
        by_dept: list[dict[str, Any]] = []
        dept_groups: dict[int, list[EmployeeCurrent]] = defaultdict(list)
        for c in EmployeeCurrent.objects.select_related(
            "employee", "employee__department"
        ).all():
            dept_groups[c.employee.department_id].append(c)
        for dept in Department.objects.order_by("name"):
            rows = dept_groups.get(dept.id, [])
            counts = {t: 0 for t in TIERS}
            for c in rows:
                counts[_norm_tier(c.performance_tier, float(c.performance_score))] += 1
            payload = aggregate_or_suppress(
                rows,
                lambda _rs, counts=counts, dept=dept: {
                    "department_id": dept.id,
                    "department": dept.name,
                    "tiers": counts,
                },
            )
            if not payload.get("suppressed"):
                by_dept.append(payload)

        # By job level (1–5), suppress <5.
        by_level: list[dict[str, Any]] = []
        level_groups: dict[int, list[EmployeeCurrent]] = defaultdict(list)
        for c in currents:
            level_groups[int(c.employee.job_level or 0)].append(c)
        for level in sorted(level_groups.keys()):
            rows = level_groups[level]
            counts = {t: 0 for t in TIERS}
            for c in rows:
                counts[_norm_tier(c.performance_tier, float(c.performance_score))] += 1
            payload = aggregate_or_suppress(
                rows,
                lambda _rs, counts=counts, level=level: {
                    "job_level": level,
                    "tiers": counts,
                },
            )
            if not payload.get("suppressed"):
                by_level.append(payload)

        # Tier movement this quarter (Q2 → current).
        moved_up = moved_down = same = 0
        for c in currents:
            old = q2_map.get(c.employee_id)
            now = _norm_tier(c.performance_tier, float(c.performance_score))
            if old is None:
                continue
            if _tier_rank(now) > _tier_rank(old):
                moved_up += 1
            elif _tier_rank(now) < _tier_rank(old):
                moved_down += 1
            else:
                same += 1

        # Anonymous spectrum dots — HR only (no names). Executive: null.
        spectrum = None
        if not is_exec:
            spectrum = []
            for c in currents:
                t = _norm_tier(c.performance_tier, float(c.performance_score))
                elev = (c.burnout_level or "").lower() == "high" or float(
                    c.burnout_risk_pct
                ) >= ELEVATED
                spectrum.append(
                    {
                        "performance_score": round(float(c.performance_score), 1),
                        "tier": t,
                        "wellbeing_alert": elev,
                    }
                )
            # Cap payload size for UI
            spectrum = spectrum[:800]

        filters = {
            "departments": list(
                Department.objects.order_by("name").values("id", "name")
            )
        }

        return Response(
            {
                "as_of": AS_OF.isoformat(),
                "scope": {
                    "department_id": department_id,
                    "n": n,
                    "departments": Department.objects.count(),
                },
                "tiers": tiers_out,
                "alerts": {
                    "total": alerts_n,
                    "by_tier": alert_by_tier,
                    "gold_elevated": gold_elevated,
                },
                "by_department": by_dept,
                "by_job_level": by_level,
                "movement": {
                    "up": moved_up,
                    "down": moved_down,
                    "same": same,
                },
                "spectrum": spectrum,
                "filters": filters,
                "executive_individuals_hidden": is_exec,
                "no_people_ranking": True,
                "not_a_leaderboard": True,
                "suppression_min": MIN_GROUP_SIZE,
            }
        )


# ---------------------------------------------------------------------------
# H12 Economic Impact
# ---------------------------------------------------------------------------


class HrEconomicImpactView(APIView):
    """GET /api/hr/economic/ — economic_impact_monthly aggregates; estimates labelled."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        role = _require_hr_org_viewer(request.user)
        return Response(
            cached_aggregate(
                f"hr:economic:{role}",
                lambda: self._build_payload(role),
            )
        )

    def _build_payload(self, role: str) -> dict[str, Any]:
        fy_rows = EconomicImpactMonthly.objects.filter(
            month__gte=FY_START, month__lte=AS_OF
        ).select_related("department")

        totals = fy_rows.aggregate(
            retention=Sum("retention_savings_sar"),
            productivity=Sum("productivity_gain_sar"),
            innovation=Sum("innovation_value_sar"),
            cost=Sum("program_cost_sar"),
            net=Sum("net_impact_sar"),
            interventions=Sum("interventions_completed"),
            ideas=Sum("ideas_implemented"),
            exits_avoided=Sum("exits_avoided"),
        )
        retention = float(totals["retention"] or 0)
        productivity = float(totals["productivity"] or 0)
        innovation = float(totals["innovation"] or 0)
        cost = float(totals["cost"] or 0)
        net = float(totals["net"] or 0)
        gross = retention + productivity + innovation
        roi_multiple = round(gross / cost, 2) if cost > 0 else None
        realized_pct = _pct(int(round(net)), int(round(gross))) if gross else None

        # People helped = completed interventions with measured outcome this FY.
        measured = Intervention.objects.filter(
            created_at__gte=FY_START,
            outcome__in=["worked", "partial", "no_change"],
        )
        people_helped = measured.values("employee_id").distinct().count()
        improved_n = measured.filter(outcome__in=["worked", "partial"]).count()
        improved_pct = _pct(improved_n, measured.count())

        # Monthly series (org sum).
        monthly: list[dict[str, Any]] = []
        for row in (
            fy_rows.values("month")
            .annotate(
                retention=Sum("retention_savings_sar"),
                productivity=Sum("productivity_gain_sar"),
                innovation=Sum("innovation_value_sar"),
                cost=Sum("program_cost_sar"),
                net=Sum("net_impact_sar"),
            )
            .order_by("month")
        ):
            monthly.append(
                {
                    "month": row["month"].isoformat(),
                    "retention_savings_sar": round(float(row["retention"] or 0)),
                    "productivity_gain_sar": round(float(row["productivity"] or 0)),
                    "innovation_value_sar": round(float(row["innovation"] or 0)),
                    "program_cost_sar": round(float(row["cost"] or 0)),
                    "net_impact_sar": round(float(row["net"] or 0)),
                    "estimated": True,
                }
            )

        # By department (suppress headcount <5 using latest month headcount).
        by_dept: list[dict[str, Any]] = []
        for dept in Department.objects.order_by("name"):
            drows = fy_rows.filter(department=dept)
            hc = (
                drows.order_by("-month")
                .values_list("headcount", flat=True)
                .first()
                or Employee.objects.filter(department=dept).count()
            )
            agg = drows.aggregate(
                retention=Sum("retention_savings_sar"),
                productivity=Sum("productivity_gain_sar"),
                innovation=Sum("innovation_value_sar"),
                cost=Sum("program_cost_sar"),
                net=Sum("net_impact_sar"),
            )
            payload = aggregate_or_suppress(
                int(hc),
                lambda _i, agg=agg, dept=dept: {
                    "department_id": dept.id,
                    "department": dept.name,
                    "retention_savings_sar": round(float(agg["retention"] or 0)),
                    "productivity_gain_sar": round(float(agg["productivity"] or 0)),
                    "innovation_value_sar": round(float(agg["innovation"] or 0)),
                    "program_cost_sar": round(float(agg["cost"] or 0)),
                    "net_impact_sar": round(float(agg["net"] or 0)),
                    "estimated": True,
                },
            )
            if not payload.get("suppressed"):
                by_dept.append(payload)

        # Ribbon / source mix (estimated from totals).
        sources = [
            {
                "id": "retention",
                "label_key": "retention",
                "value_sar": round(retention),
                "estimated": True,
            },
            {
                "id": "productivity",
                "label_key": "productivity",
                "value_sar": round(productivity),
                "estimated": True,
            },
            {
                "id": "innovation",
                "label_key": "innovation",
                "value_sar": round(innovation),
                "estimated": True,
            },
        ]

        # Impact story — aggregate chain from a completed intervention (no inventing).
        feat = (
            Intervention.objects.filter(status="completed", outcome="worked")
            .select_related("employee", "employee__department", "employee__team")
            .order_by("-completed_at", "-id")
            .first()
        )
        story = None
        if feat:
            delta = None
            if feat.followup_risk_pct is not None:
                delta = round(
                    float(feat.baseline_risk_pct) - float(feat.followup_risk_pct), 1
                )
            story = {
                "display_id": f"INT-{feat.id:04d}",
                "type": feat.type,
                "driver": feat.driver,
                "department": feat.employee.department.name,
                "team": feat.employee.team.name if feat.employee.team_id else None,
                "baseline_risk_pct": feat.baseline_risk_pct,
                "followup_risk_pct": feat.followup_risk_pct,
                "risk_delta_pts": delta,
                "outcome": feat.outcome,
                # Financial attribution for a single case is not stored — projected.
                "financial_impact_sar": None,
                "financial_impact_projected": True,
                "employee_name": None,  # filled for HR only below
            }
            if role in (UserProfile.Role.HR, UserProfile.Role.ADMIN):
                story["employee_name"] = feat.employee.full_name

        return {
            "as_of": AS_OF.isoformat(),
            "period": {"start": FY_START.isoformat(), "label": "FY2026 YTD"},
            "kpis": {
                "expected_annual_impact_sar": round(gross),
                "net_impact_sar": round(net),
                "program_cost_sar": round(cost),
                "roi_multiple": roi_multiple,
                "realized_so_far_sar": round(net),
                "realized_pct_of_gross": realized_pct,
                "people_helped": people_helped,
                "improved_pct": improved_pct,
                "exits_avoided": round(float(totals["exits_avoided"] or 0), 2),
                "estimated": True,
            },
            "breakdown": {
                "retention_savings_sar": round(retention),
                "productivity_gain_sar": round(productivity),
                "innovation_value_sar": round(innovation),
                "program_cost_sar": round(cost),
                "gross_sar": round(gross),
                "net_sar": round(net),
                "estimated": True,
            },
            "sources": sources,
            "monthly": monthly,
            "by_department": by_dept,
            "assumptions": ASSUMPTIONS,
            "impact_story": story,
            "suppression_min": MIN_GROUP_SIZE,
            "no_people_ranking": True,
            "values_estimated": True,
        }


# ---------------------------------------------------------------------------
# H14 Executive Reports
# ---------------------------------------------------------------------------

REPORT_CATALOG = [
    {
        "id": "economic_impact",
        "title_key": "economic_impact",
        "cadence": "quarterly",
        "audience": "board",
    },
    {
        "id": "interventions_outcomes",
        "title_key": "interventions_outcomes",
        "cadence": "monthly",
        "audience": "hr_leadership",
    },
    {
        "id": "burnout_trends",
        "title_key": "burnout_trends",
        "cadence": "monthly",
        "audience": "hr_managers",
    },
    {
        "id": "team_performance",
        "title_key": "team_performance",
        "cadence": "monthly",
        "audience": "department_heads",
    },
    {
        "id": "innovation_pipeline",
        "title_key": "innovation_pipeline",
        "cadence": "quarterly",
        "audience": "innovation_council",
    },
    {
        "id": "wellbeing_morale",
        "title_key": "wellbeing_morale",
        "cadence": "quarterly",
        "audience": "aggregated_only",
    },
]


def _report_aggregates() -> dict[str, Any]:
    """Org-level aggregates only — never individuals."""
    n = Employee.objects.count()
    currents = list(
        EmployeeCurrent.objects.select_related("employee", "employee__department")
    )
    elevated = sum(
        1
        for c in currents
        if (c.burnout_level or "").lower() == "high"
        or float(c.burnout_risk_pct) >= ELEVATED
    )
    eng = _avg([float(c.engagement_score) for c in currents])
    perf = _avg([float(c.performance_score) for c in currents])
    well = _avg([float(c.wellbeing_score) for c in currents])
    burn = _avg([float(c.burnout_risk_pct) for c in currents])

    tiers = {t: 0 for t in TIERS}
    for c in currents:
        tiers[_norm_tier(c.performance_tier, float(c.performance_score))] += 1

    # Monthly elevated counts Jul–Sep from weekly metrics.
    burnout_months = []
    for month_start in (date(2026, 7, 1), date(2026, 8, 1), date(2026, 9, 1)):
        month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(
            day=1
        ) - timedelta(days=1)
        # Approximate: distinct people with avg burnout >= 60 that month.
        rows = (
            WeeklyMetric.objects.filter(
                week_start__gte=month_start, week_start__lte=month_end
            )
            .values("employee_id")
            .annotate(b=Avg("burnout_risk_pct"))
        )
        elev = sum(1 for r in rows if float(r["b"] or 0) >= ELEVATED)
        burnout_months.append(
            {"month": month_start.isoformat(), "elevated": elev}
        )

    econ = EconomicImpactMonthly.objects.filter(
        month__gte=FY_START, month__lte=AS_OF
    ).aggregate(
        retention=Sum("retention_savings_sar"),
        productivity=Sum("productivity_gain_sar"),
        innovation=Sum("innovation_value_sar"),
        cost=Sum("program_cost_sar"),
        net=Sum("net_impact_sar"),
    )
    gross = (
        float(econ["retention"] or 0)
        + float(econ["productivity"] or 0)
        + float(econ["innovation"] or 0)
    )
    cost = float(econ["cost"] or 0)

    measured = Intervention.objects.filter(
        created_at__gte=FY_START,
        outcome__in=["worked", "partial", "no_change"],
    )
    ideas_year = Idea.objects.filter(submitted_at__gte=FY_START)

    # Department performance aggregates (suppress <5).
    depts = []
    for dept in Department.objects.order_by("name"):
        rows = [c for c in currents if c.employee.department_id == dept.id]
        payload = aggregate_or_suppress(
            rows,
            lambda rs, dept=dept: {
                "department": dept.name,
                "n": len(rs),
                "performance": _avg([float(r.performance_score) for r in rs]),
                "engagement": _avg([float(r.engagement_score) for r in rs]),
                "burnout_risk_pct": _avg([float(r.burnout_risk_pct) for r in rs]),
            },
        )
        if not payload.get("suppressed"):
            depts.append(payload)

    return {
        "as_of": AS_OF.isoformat(),
        "confidential": True,
        "individuals_included": False,
        "suppression_min": MIN_GROUP_SIZE,
        "headcount": n,
        "elevated_burnout": elevated,
        "org_pulse": {
            "engagement": eng,
            "performance": perf,
            "wellbeing": well,
            "burnout_risk_pct": burn,
        },
        "capability_tiers": {
            t: {
                "count": tiers[t],
                "pct": _pct(tiers[t], n),
            }
            for t in TIERS
        },
        "burnout_trend_months": burnout_months,
        "economic": {
            "gross_impact_sar": round(gross),
            "net_impact_sar": round(float(econ["net"] or 0)),
            "program_cost_sar": round(cost),
            "roi_multiple": round(gross / cost, 2) if cost > 0 else None,
            "estimated": True,
        },
        "interventions": {
            "measured": measured.count(),
            "improved": measured.filter(
                outcome__in=["worked", "partial"]
            ).count(),
            "proposed": Intervention.objects.filter(status="proposed").count(),
            "active": Intervention.objects.filter(
                status__in=["approved", "in_progress"]
            ).count(),
        },
        "innovation": {
            "ideas_this_year": ideas_year.count(),
            "implemented": ideas_year.filter(status="implemented").count(),
            "realized_value_sar": round(
                float(
                    ideas_year.aggregate(s=Sum("realized_value_sar"))["s"] or 0
                )
            ),
        },
        "departments": depts,
        "narrative": {
            "what_happened_key": "what_happened",
            "what_we_did_key": "what_we_did",
            "what_changed_key": "what_changed",
            "next_key": "what_next",
        },
    }


class HrReportsView(APIView):
    """GET /api/hr/reports/ — report library + aggregate snapshot (no individuals)."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)
        report_id = request.query_params.get("report") or "economic_impact"
        catalog_ids = {c["id"] for c in REPORT_CATALOG}
        if report_id not in catalog_ids:
            raise ApiError("error.validation", status_code=400)

        data = _report_aggregates()
        return Response(
            {
                "catalog": REPORT_CATALOG,
                "selected": report_id,
                "report": data,
                "no_people_ranking": True,
                "executive_safe": True,
            }
        )


class HrReportsExportView(APIView):
    """
    GET /api/hr/reports/export/?report=&export_format=csv|html
    Aggregates only. Every export writes AuditLog(EXPORT).
    Note: query key is export_format — DRF reserves ``format`` for renderers.
    """

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)
        report_id = request.query_params.get("report") or "economic_impact"
        fmt = (
            request.query_params.get("export_format")
            or request.query_params.get("fmt")
            or "csv"
        ).lower()
        catalog_ids = {c["id"] for c in REPORT_CATALOG}
        if report_id not in catalog_ids:
            raise ApiError("error.validation", status_code=400)
        if fmt not in ("csv", "html"):
            raise ApiError("error.validation", status_code=400)

        data = _report_aggregates()
        AuditLog.objects.create(
            actor=request.user,
            action=AuditLog.Action.EXPORT,
            employee=None,
            path=request.path,
            metadata={
                "report": report_id,
                "format": fmt,
                "individuals_included": False,
            },
        )

        if fmt == "csv":
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(["section", "key", "value"])
            writer.writerow(["meta", "report", report_id])
            writer.writerow(["meta", "as_of", data["as_of"]])
            writer.writerow(["meta", "individuals_included", "false"])
            writer.writerow(["meta", "estimated_economic", "true"])
            writer.writerow(["org", "headcount", data["headcount"]])
            writer.writerow(["org", "elevated_burnout", data["elevated_burnout"]])
            for k, v in data["org_pulse"].items():
                writer.writerow(["org_pulse", k, v if v is not None else ""])
            for t, info in data["capability_tiers"].items():
                writer.writerow(["capability", f"{t}_count", info["count"]])
                writer.writerow(["capability", f"{t}_pct", info["pct"]])
            for k, v in data["economic"].items():
                writer.writerow(["economic", k, v if v is not None else ""])
            for k, v in data["interventions"].items():
                writer.writerow(["interventions", k, v])
            for k, v in data["innovation"].items():
                writer.writerow(["innovation", k, v])
            for d in data["departments"]:
                writer.writerow(
                    [
                        "department",
                        d["department"],
                        f"n={d['n']};perf={d.get('performance')};eng={d.get('engagement')};burn={d.get('burnout_risk_pct')}",
                    ]
                )
            for m in data["burnout_trend_months"]:
                writer.writerow(["burnout_trend", m["month"], m["elevated"]])
            resp = HttpResponse(buf.getvalue(), content_type="text/csv")
            resp["Content-Disposition"] = (
                f'attachment; filename="empulse_{report_id}_{AS_OF.isoformat()}.csv"'
            )
            return resp

        # HTML print view
        econ = data["economic"]
        tiers = data["capability_tiers"]
        html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>EMPULSE · {report_id}</title>
<style>
body{{font-family:DM Sans,system-ui,sans-serif;color:#0f172a;margin:32px;}}
h1{{font-size:22px;margin:0 0 4px}} .meta{{color:#64748b;font-size:12px}}
.badge{{display:inline-block;background:#0e2944;color:#fff;padding:4px 8px;
border-radius:6px;font-size:11px;letter-spacing:.04em;margin-bottom:16px}}
table{{border-collapse:collapse;width:100%;margin:16px 0;font-size:13px}}
th,td{{border-bottom:1px solid #e2e8f0;padding:8px;text-align:start}}
th{{font-family:DM Mono,monospace;font-size:10px;text-transform:uppercase;color:#64748b}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}}
.card{{border:1px solid #e2e8f0;border-radius:12px;padding:12px}}
.num{{font-size:22px;font-weight:600}}
.note{{font-size:12px;color:#64748b;margin-top:24px}}
@media print{{body{{margin:16px}}}}
</style></head><body>
<span class="badge">CONFIDENTIAL · EXECUTIVE · AGGREGATES ONLY</span>
<h1>People Impact Report · {report_id.replace('_',' ').title()}</h1>
<p class="meta">As of {data['as_of']} · headcount {data['headcount']} ·
groups under {data['suppression_min']} suppressed · no individuals</p>
<div class="grid">
<div class="card"><div class="meta">Elevated burnout</div>
<div class="num">{data['elevated_burnout']}</div></div>
<div class="card"><div class="meta">Org engagement</div>
<div class="num">{data['org_pulse']['engagement'] or '—'}</div></div>
<div class="card"><div class="meta">Expected annual impact (estimated)</div>
<div class="num">SAR {econ['gross_impact_sar']:,}</div></div>
<div class="card"><div class="meta">Net impact (estimated)</div>
<div class="num">SAR {econ['net_impact_sar']:,}</div></div>
</div>
<h2>Professional capability</h2>
<table><thead><tr><th>Tier</th><th>Count</th><th>%</th></tr></thead><tbody>
"""
        for t in TIERS:
            info = tiers[t]
            html += (
                f"<tr><td>{t.title()}</td><td>{info['count']}</td>"
                f"<td>{info['pct']}%</td></tr>"
            )
        html += "</tbody></table>"
        html += "<h2>Departments (n≥5)</h2><table><thead><tr>"
        html += "<th>Department</th><th>N</th><th>Perf</th><th>Eng</th><th>Burnout</th>"
        html += "</tr></thead><tbody>"
        for d in data["departments"]:
            html += (
                f"<tr><td>{d['department']}</td><td>{d['n']}</td>"
                f"<td>{d.get('performance') or '—'}</td>"
                f"<td>{d.get('engagement') or '—'}</td>"
                f"<td>{d.get('burnout_risk_pct') or '—'}</td></tr>"
            )
        html += "</tbody></table>"
        html += (
            "<p class='note'>Economic figures are estimated from "
            "economic_impact_monthly assumptions. Wellbeing is never part of "
            "the performance score. Burnout risk is decision support, not a diagnosis.</p>"
            "<script>window.onload=function(){window.print()}</script>"
            "</body></html>"
        )
        resp = HttpResponse(html, content_type="text/html; charset=utf-8")
        resp["Content-Disposition"] = (
            f'inline; filename="empulse_{report_id}_{AS_OF.isoformat()}.html"'
        )
        return resp


# ---------------------------------------------------------------------------
# H15 Governance (HR/admin only)
# ---------------------------------------------------------------------------


class HrGovernanceView(APIView):
    """GET /api/hr/governance/ — AuditLog + privacy rules. HR/admin only."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_admin(request.user)

        action = (request.query_params.get("action") or "").strip()
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")

        qs = AuditLog.objects.select_related(
            "actor", "employee"
        ).order_by("-created_at", "-id")

        if action:
            qs = qs.filter(action=action)
        if date_from:
            try:
                d0 = date.fromisoformat(date_from)
                qs = qs.filter(created_at__date__gte=d0)
            except ValueError as exc:
                raise ApiError("error.validation", status_code=400) from exc
        if date_to:
            try:
                d1 = date.fromisoformat(date_to)
                qs = qs.filter(created_at__date__lte=d1)
            except ValueError as exc:
                raise ApiError("error.validation", status_code=400) from exc

        limit = min(int(request.query_params.get("limit") or 100), 500)
        rows = list(qs[:limit])
        logs = [
            {
                "id": row.id,
                "action": row.action,
                "actor_email": row.actor.email if row.actor_id else None,
                "actor_id": row.actor_id,
                "employee_id": row.employee_id,
                "employee_name": row.employee.full_name if row.employee_id else None,
                "path": row.path,
                "metadata": row.metadata or {},
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]

        # HITL: % of interventions that were human-approved among non-declined.
        ints = Intervention.objects.exclude(status="cancelled")
        approved_n = ints.filter(human_approved=True).count()
        hitl_pct = _pct(approved_n, ints.count()) if ints.exists() else None

        # Fairness: elevated burnout rate ratios (groups ≥5).
        employees = list(
            Employee.objects.values("id", "gender", "age", "work_mode")
        )
        elev_ids = {
            c.employee_id
            for c in EmployeeCurrent.objects.all()
            if (c.burnout_level or "").lower() == "high"
            or float(c.burnout_risk_pct) >= ELEVATED
        }

        def group_rate(pred) -> float | None:
            ids = [e["id"] for e in employees if pred(e)]
            if len(ids) < MIN_GROUP_SIZE:
                return None
            return _pct(sum(1 for i in ids if i in elev_ids), len(ids))

        def ratio(a: float | None, b: float | None) -> float | None:
            if a is None or b is None or b == 0:
                return None
            return round(a / b, 2)

        women = group_rate(
            lambda e: (e["gender"] or "").upper().startswith("F")
        )
        men = group_rate(lambda e: (e["gender"] or "").upper().startswith("M"))
        remote = group_rate(
            lambda e: (e["work_mode"] or "").lower() == "remote"
        )
        onsite = group_rate(
            lambda e: (e["work_mode"] or "").lower() in ("on-site", "onsite")
        )
        under30 = group_rate(lambda e: (e["age"] or 99) < 30)
        mid = group_rate(lambda e: 30 <= (e["age"] or 0) <= 45)
        over45 = group_rate(lambda e: (e["age"] or 0) > 45)

        fairness = [
            {
                "id": "women_men",
                "ratio": ratio(women, men),
                "band": [0.80, 1.25],
            },
            {
                "id": "under30_mid",
                "ratio": ratio(under30, mid),
                "band": [0.80, 1.25],
            },
            {
                "id": "over45_mid",
                "ratio": ratio(over45, mid),
                "band": [0.80, 1.25],
            },
            {
                "id": "remote_onsite",
                "ratio": ratio(remote, onsite),
                "band": [0.80, 1.25],
            },
            {
                "id": "saudi_expat",
                "ratio": None,
                "band": [0.80, 1.25],
                "not_collected": True,
            },
        ]

        action_counts = {
            r["action"]: r["c"]
            for r in AuditLog.objects.values("action").annotate(c=Count("id"))
        }

        return Response(
            {
                "as_of": AS_OF.isoformat(),
                "principles": {
                    "human_in_the_loop": True,
                    "hitl_approval_pct": hitl_pct,
                    "explainable": True,
                    "minimal_data": True,
                },
                "privacy_rules": PRIVACY_RULES,
                "data_uses": {
                    "uses": [
                        "work_outcomes",
                        "workload",
                        "calendar_load",
                        "voluntary_checkins",
                        "learning_recognition_ideas",
                    ],
                    "never_uses": [
                        "email_chat_content",
                        "keystrokes_screenshots",
                        "location",
                        "health_medical_family",
                        "wellbeing_in_performance",
                    ],
                },
                "fairness": {
                    "band": [0.80, 1.25],
                    "metric": "elevated_burnout_flag_rate_ratio",
                    "ratios": fairness,
                    "last_audit_date": None,
                    "last_audit_projected": True,
                },
                "audit_log": {
                    "total": AuditLog.objects.count(),
                    "action_counts": action_counts,
                    "actions": [c[0] for c in AuditLog.Action.choices],
                    "rows": logs,
                    "limit": limit,
                    "filters": {
                        "action": action or None,
                        "from": date_from,
                        "to": date_to,
                    },
                },
                "hr_admin_only": True,
                "suppression_min": MIN_GROUP_SIZE,
                "no_people_ranking": True,
            }
        )


# ---------------------------------------------------------------------------
# H16 PulseAI Organization stub
# ---------------------------------------------------------------------------


class HrPulseAIStubView(APIView):
    """POST /api/hr/pulseai/ — org aggregates stub (Step 8 wires LLM)."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def post(self, request):
        _require_hr_org_viewer(request.user)
        question = str(request.data.get("question") or "").strip()

        n = Employee.objects.count()
        currents = list(
            EmployeeCurrent.objects.select_related(
                "employee", "employee__department", "employee__team"
            )
        )
        elevated = [
            c
            for c in currents
            if (c.burnout_level or "").lower() == "high"
            or float(c.burnout_risk_pct) >= ELEVATED
        ]
        elev_n = len(elevated)
        workload_high = sum(
            1 for c in currents if float(c.workload_index) >= 115
        )

        # Top teams by elevated count (only n≥5 teams, alphabetical within).
        team_elev: dict[int, list] = defaultdict(list)
        for c in elevated:
            if c.employee.team_id:
                team_elev[c.employee.team_id].append(c)
        hotspot_teams = []
        for team in Team.objects.filter(id__in=team_elev.keys()).order_by("name"):
            members = Employee.objects.filter(team=team).count()
            if members < MIN_GROUP_SIZE:
                continue
            hotspot_teams.append(
                {
                    "team": team.name,
                    "department": team.department.name,
                    "elevated": len(team_elev[team.id]),
                    "n": members,
                }
            )
        hotspot_teams.sort(key=lambda r: (-r["elevated"], r["team"]))
        top3 = hotspot_teams[:3]
        top3_share = (
            _pct(sum(t["elevated"] for t in top3), elev_n) if elev_n else None
        )

        wl = Intervention.objects.filter(
            created_at__gte=FY_START,
            type__icontains="workload",
            outcome__in=["worked", "partial", "no_change"],
            followup_risk_pct__isnull=False,
        )
        wl_strong = sum(
            1
            for i in wl
            if float(i.baseline_risk_pct) - float(i.followup_risk_pct) >= 15
        )
        recog = Intervention.objects.filter(
            created_at__gte=FY_START,
            type__icontains="recognition",
            outcome__in=["worked", "partial", "no_change"],
        )
        gold_elev = sum(
            1
            for c in elevated
            if _norm_tier(c.performance_tier, float(c.performance_score)) == "gold"
        )

        q3_recog = Recognition.objects.filter(
            created_at__gte=Q3_START, created_at__lte=Q3_END
        ).count()
        measured_n = Intervention.objects.filter(
            created_at__gte=FY_START,
            outcome__in=["worked", "partial", "no_change"],
        ).count()

        team_names = ", ".join(t["team"] for t in top3) if top3 else "—"

        return Response(
            {
                "stub": True,
                "step8_llm": False,
                "question": question
                or "What are the systemic burnout drivers across the organization?",
                "data_used": [
                    {
                        "label": "Burnout risk (people)",
                        "value": n,
                        "detail": f"{elev_n} elevated (≥{ELEVATED}%)",
                    },
                    {
                        "label": "Workload index ≥115%",
                        "value": workload_high,
                        "detail": "people",
                    },
                    {
                        "label": "Recognition log Q3",
                        "value": q3_recog,
                    },
                    {
                        "label": "Intervention outcomes (FY)",
                        "value": measured_n,
                    },
                    {
                        "label": "Teams scored (n≥5)",
                        "value": len(hotspot_teams),
                    },
                ],
                "findings": [
                    (
                        f"Burnout is concentrated: top teams hold {top3_share}% of "
                        f"elevated cases ({team_names})."
                        if top3_share is not None
                        else "Elevated burnout distribution needs more teams with n≥5."
                    ),
                    (
                        f"Workload rebalancing cut risk 15+ pts in {wl_strong} of "
                        f"{wl.count()} measured cases; recognition-only in "
                        f"{recog.filter(outcome__in=['worked','partial']).count()} of "
                        f"{recog.count()}."
                    ),
                    (
                        f"{gold_elev} elevated cases are Gold-tier — high output can mask risk."
                    ),
                ],
                "recommendation": {
                    "summary": (
                        "Extend workload-rebalancing playbooks to hotspot teams, "
                        "pair with recognition only after load relief, and keep "
                        "human approval on every intervention."
                    ),
                    "actions": [
                        "Open Burnout Intelligence for suppressed-safe hotspots",
                        "Approve proposed interventions (nothing auto-starts)",
                        "Simulate policy options in What-if (when available)",
                    ],
                },
                "scope": {
                    "organization_wide": True,
                    "aggregated": True,
                    "suppression_min": MIN_GROUP_SIZE,
                    "no_private_checkin_text": True,
                    "query_logged": False,
                    "query_logged_note": "Audit logging of PulseAI queries lands with Step 8.",
                },
                "never_sees": [
                    "Private check-in free text",
                    "Email / chat content",
                    "Health or medical data",
                    "Groups under 5 people",
                    "Individual rankings",
                ],
                "no_people_ranking": True,
            }
        )
