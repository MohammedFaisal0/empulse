"""H04–H07 HR aggregate endpoints (teams drill-down, performance, burnout, morale)."""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean, median
from typing import Any

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncWeek
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import UserProfile
from accounts.permissions import DenyExecutiveIndividualAccess, get_user_role
from analytics.aggregates import aggregate_or_suppress, suppress_small_group
from innovation.models import Recognition
from interventions.models import Intervention
from org.models import Department, Employee, Team
from org.privacy import assert_not_executive_individual, employees_visible_to
from pulse.models import EmployeeCurrent, WeeklyMetric

AS_OF = date(2026, 10, 6)
ELEVATED = 60


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


def _tier_of(score: float) -> str:
    if score >= 90:
        return "gold"
    if score >= 80:
        return "silver"
    if score >= 70:
        return "bronze"
    return "growth"


def _quadrant(perf: float, burn: float) -> str:
    if burn >= 60 and perf >= 80:
        return "critical_support"
    if burn >= 60:
        return "burnout_risk"
    if burn >= 45:
        return "watch"
    return "thriving"


def _scope_employee_ids(
    department_id: int | None, team_id: int | None
) -> list[int]:
    qs = Employee.objects.all()
    if team_id:
        qs = qs.filter(team_id=team_id)
    elif department_id:
        qs = qs.filter(department_id=department_id)
    return list(qs.values_list("id", flat=True))


def _agg_currents(rows: list[EmployeeCurrent]) -> dict[str, Any]:
    return aggregate_or_suppress(
        rows,
        lambda rs: {
            "n": len(rs),
            "performance": _avg([float(r.performance_score) for r in rs]),
            "engagement": _avg([float(r.engagement_score) for r in rs]),
            "wellbeing": _avg([float(r.wellbeing_score) for r in rs]),
            "burnout_risk_pct": _avg([float(r.burnout_risk_pct) for r in rs]),
            "innovation": _avg([float(r.innovation_score) for r in rs]),
            "workload": _avg([float(r.workload_index) for r in rs]),
            "overtime": _avg([float(r.overtime_hours_monthly) for r in rs]),
            "mood": _avg([float(r.mood_score) for r in rs]),
            "elevated": sum(
                1
                for r in rs
                if (r.burnout_level or "").lower() == "high"
                or float(r.burnout_risk_pct) >= ELEVATED
            ),
            "empulse_score": round(
                _avg([float(r.performance_score) for r in rs]) or 0
            ),
            "empulse_tier": _tier_of(
                _avg([float(r.performance_score) for r in rs]) or 0
            ),
        },
    )


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 5 or len(xs) != len(ys):
        return None
    mx, my = mean(xs), mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    denx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    deny = math.sqrt(sum((y - my) ** 2 for y in ys))
    if denx == 0 or deny == 0:
        return None
    return round(num / (denx * deny), 2)


# ---------------------------------------------------------------------------
# H04 Teams drill-down
# ---------------------------------------------------------------------------


class HrTeamsView(APIView):
    """GET /api/hr/teams/ — org → department → team aggregates (executive OK)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)
        dept_id = request.query_params.get("department_id")
        team_id = request.query_params.get("team_id")
        try:
            department_id = int(dept_id) if dept_id else None
            selected_team_id = int(team_id) if team_id else None
        except ValueError as exc:
            raise ApiError("error.validation", status_code=400) from exc

        currents = list(
            EmployeeCurrent.objects.select_related(
                "employee", "employee__department", "employee__team"
            ).all()
        )
        org = _agg_currents(currents)

        by_dept: dict[int, list[EmployeeCurrent]] = defaultdict(list)
        by_team: dict[int, list[EmployeeCurrent]] = defaultdict(list)
        for row in currents:
            by_dept[row.employee.department_id].append(row)
            if row.employee.team_id:
                by_team[row.employee.team_id].append(row)

        departments = []
        for dept in Department.objects.order_by("name"):
            rows = by_dept.get(dept.id, [])
            agg = _agg_currents(rows)
            departments.append(
                {
                    "id": dept.id,
                    "name": dept.name,
                    "headcount": dept.headcount or len(rows),
                    **agg,
                }
            )

        teams = []
        if department_id:
            for team in Team.objects.filter(department_id=department_id).order_by(
                "name"
            ):
                rows = by_team.get(team.id, [])
                agg = _agg_currents(rows)
                teams.append(
                    {
                        "id": team.id,
                        "name": team.name,
                        "department_id": department_id,
                        "headcount": team.headcount or len(rows),
                        **agg,
                    }
                )

        selected = None
        if selected_team_id and selected_team_id in by_team:
            team = Team.objects.filter(pk=selected_team_id).select_related(
                "department"
            ).first()
            rows = by_team[selected_team_id]
            agg = _agg_currents(rows)
            note = None
            if not agg.get("suppressed") and (agg.get("burnout_risk_pct") or 0) >= 45:
                note = "burnout_hotspot"
            selected = {
                "id": selected_team_id,
                "name": team.name if team else "",
                "department": team.department.name if team else "",
                "department_id": team.department_id if team else None,
                **agg,
                "note": note,
            }
        elif department_id:
            dept = Department.objects.filter(pk=department_id).first()
            rows = by_dept.get(department_id, [])
            agg = _agg_currents(rows)
            selected = {
                "id": None,
                "name": dept.name if dept else "",
                "department": dept.name if dept else "",
                "department_id": department_id,
                **agg,
                "note": None,
            }

        return Response(
            {
                "organization": {
                    "name": "Horizon Group",
                    "headcount": Employee.objects.count(),
                    **org,
                },
                "departments": departments,
                "teams": teams,
                "selected": selected,
                "path": {
                    "department_id": department_id,
                    "team_id": selected_team_id,
                },
                "no_people_ranking": True,
                "suppression_min": 5,
                "individuals_via": "/api/hr/teams/<id>/members/",
            }
        )


class HrTeamMembersView(APIView):
    """GET /api/hr/teams/<id>/members/ — alphabetical people (HR only)."""

    permission_classes = [IsAuthenticated, DenyExecutiveIndividualAccess]
    executive_allowed = False

    @extend_schema(tags=["hr"])
    def get(self, request, pk: int):
        _require_hr_individual(request.user)
        try:
            team = Team.objects.select_related("department").get(pk=pk)
        except Team.DoesNotExist as exc:
            raise ApiError("error.not_found", status_code=404) from exc

        people_qs = (
            employees_visible_to(request.user)
            .filter(team_id=pk)
            .select_related("current")
            .order_by("full_name")
        )
        people = []
        for emp in people_qs:
            try:
                cur = emp.current
            except EmployeeCurrent.DoesNotExist:
                cur = None
            alert = False
            if cur:
                alert = (
                    float(cur.burnout_risk_pct) >= ELEVATED
                    or float(cur.wellbeing_score) < 45
                )
            people.append(
                {
                    "id": emp.id,
                    "full_name": emp.full_name,
                    "job_title": emp.job_title,
                    "performance_score": cur.performance_score if cur else None,
                    "performance_tier": cur.performance_tier if cur else None,
                    "wellbeing_alert": alert,
                    # Score shown but list is alphabetical — never ranked by score.
                }
            )

        return Response(
            {
                "team": {
                    "id": team.id,
                    "name": team.name,
                    "department": team.department.name,
                    "headcount": team.headcount,
                },
                "sorted_by": "full_name",
                "no_score_sort": True,
                "people": people,
                "n": len(people),
                "audit_note": "profile_open_writes_audit_log",
            }
        )


# ---------------------------------------------------------------------------
# H05 Performance Intelligence
# ---------------------------------------------------------------------------


class HrPerformanceView(APIView):
    """GET /api/hr/performance/ — cause chain, linked series, correlations."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def get(self, request):
        role = _require_hr_org_viewer(request.user)
        try:
            department_id = (
                int(request.query_params["department_id"])
                if request.query_params.get("department_id")
                else None
            )
            team_id = (
                int(request.query_params["team_id"])
                if request.query_params.get("team_id")
                else None
            )
            weeks = min(52, max(8, int(request.query_params.get("weeks") or 26)))
        except ValueError as exc:
            raise ApiError("error.validation", status_code=400) from exc

        ids = _scope_employee_ids(department_id, team_id)
        n = len(ids)
        label = "Horizon Group"
        if team_id:
            t = Team.objects.filter(pk=team_id).first()
            label = t.name if t else label
        elif department_id:
            d = Department.objects.filter(pk=department_id).first()
            label = d.name if d else label

        since = AS_OF - timedelta(weeks=weeks)
        week_rows = (
            WeeklyMetric.objects.filter(employee_id__in=ids, week_start__gte=since)
            .values("week_start")
            .annotate(
                cnt=Count("id"),
                performance=Avg("performance_score"),
                engagement=Avg("engagement_score"),
                workload=Avg("workload_index"),
                overtime=Avg("overtime_hours_monthly"),
                burnout=Avg("burnout_risk_pct"),
            )
            .order_by("week_start")
        )
        series = []
        for w in week_rows:
            cell = suppress_small_group(
                int(w["cnt"]),
                {
                    "week_start": w["week_start"].isoformat(),
                    "performance": round(float(w["performance"] or 0), 1),
                    "engagement": round(float(w["engagement"] or 0), 1),
                    "workload": round(float(w["workload"] or 0), 1),
                    "overtime": round(float(w["overtime"] or 0), 1),
                    "burnout_risk_pct": round(float(w["burnout"] or 0), 1),
                },
            )
            if not cell.get("suppressed"):
                series.append(cell)

        # Cause chain: early window vs late window.
        chain = None
        if len(series) >= 8:
            early = series[: max(3, len(series) // 4)]
            late = series[-max(3, len(series) // 4) :]

            def mavg(key: str, rows: list) -> float:
                return mean(r[key] for r in rows)

            chain = {
                "workload": {
                    "from": round(mavg("workload", early), 1),
                    "to": round(mavg("workload", late), 1),
                    "delta_pct": round(
                        100
                        * (mavg("workload", late) - mavg("workload", early))
                        / max(1, mavg("workload", early))
                    ),
                },
                "overtime": {
                    "from": round(mavg("overtime", early), 1),
                    "to": round(mavg("overtime", late), 1),
                    "delta_h": round(mavg("overtime", late) - mavg("overtime", early), 1),
                },
                "engagement": {
                    "from": round(mavg("engagement", early), 1),
                    "to": round(mavg("engagement", late), 1),
                    "delta": round(mavg("engagement", late) - mavg("engagement", early)),
                },
                "burnout_risk_pct": {
                    "from": round(mavg("burnout_risk_pct", early), 1),
                    "to": round(mavg("burnout_risk_pct", late), 1),
                },
                "performance": {
                    "from": round(mavg("performance", early), 1),
                    "to": round(mavg("performance", late), 1),
                },
                "annotation": "WORKLOAD RAMP",
                "annotation_note": "not_collected_roles",
            }

        # Correlations from org-week averages (guide attention, not proof).
        correlations = []
        if len(series) >= 8:
            pairs = [
                ("workload", "burnout_risk_pct", "Workload → Burnout risk", 3),
                ("overtime", "engagement", "Overtime → Engagement", 2),
                ("burnout_risk_pct", "performance", "Burnout → Performance", 5),
            ]
            for a, b, title, lag in pairs:
                r = _pearson([s[a] for s in series], [s[b] for s in series])
                if r is not None:
                    correlations.append(
                        {
                            "title": title,
                            "r": r,
                            "lag_weeks": lag,
                            "lag_note": "same_week" if lag == 0 else f"leads_{lag}",
                        }
                    )
            # Recognition → engagement: recognition has no weekly series — mark TODO.
            correlations.append(
                {
                    "title": "Recognition → Engagement",
                    "r": None,
                    "lag_weeks": 0,
                    "lag_note": "not_collected",
                    "todo": True,
                }
            )

        # People table: HR/admin only, alphabetical (never by score).
        people = None
        if role in (UserProfile.Role.HR, UserProfile.Role.ADMIN) and team_id:
            people = []
            for emp in (
                employees_visible_to(request.user)
                .filter(team_id=team_id)
                .select_related("current")
                .order_by("full_name")
            ):
                try:
                    cur = emp.current
                except EmployeeCurrent.DoesNotExist:
                    cur = None
                if cur is None:
                    continue
                traj = list(
                    WeeklyMetric.objects.filter(employee=emp)
                    .order_by("-week_start")[:12]
                    .values_list("performance_score", flat=True)
                )
                traj.reverse()
                people.append(
                    {
                        "id": emp.id,
                        "full_name": emp.full_name,
                        "job_title": emp.job_title,
                        "performance_score": cur.performance_score,
                        "performance_tier": cur.performance_tier,
                        "burnout_risk_pct": cur.burnout_risk_pct,
                        "quadrant": _quadrant(
                            float(cur.performance_score), float(cur.burnout_risk_pct)
                        ),
                        "trend_12w": [round(float(x), 1) for x in traj],
                    }
                )

        depts = list(
            Department.objects.order_by("name").values("id", "name")
        )
        teams_out = []
        if department_id:
            teams_out = list(
                Team.objects.filter(department_id=department_id)
                .order_by("name")
                .values("id", "name")
            )

        return Response(
            {
                "scope": {
                    "label": label,
                    "department_id": department_id,
                    "team_id": team_id,
                    "n": n,
                    "weeks": weeks,
                },
                "filters": {"departments": depts, "teams": teams_out},
                "chain": chain,
                "series": series,
                "correlations": correlations,
                "people": people,
                "people_sorted_by": "full_name" if people is not None else None,
                "no_score_sort": True,
                "executive_individuals_hidden": role == UserProfile.Role.EXECUTIVE,
                "suppression_min": 5,
                "no_people_ranking": True,
            }
        )


# ---------------------------------------------------------------------------
# H06 Burnout Intelligence
# ---------------------------------------------------------------------------


class HrBurnoutIntelligenceView(APIView):
    """GET /api/hr/burnout-intelligence/ — org burnout aggregates."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)
        currents = list(
            EmployeeCurrent.objects.select_related(
                "employee", "employee__department", "employee__team"
            ).all()
        )
        n = len(currents)
        elevated = [
            r
            for r in currents
            if (r.burnout_level or "").lower() == "high"
            or float(r.burnout_risk_pct) >= ELEVATED
        ]
        elevated_n = len(elevated)

        # July elevated from weekly distinct employees.
        jul_elevated = (
            WeeklyMetric.objects.filter(
                week_start__gte=date(2026, 7, 1),
                week_start__lt=date(2026, 8, 1),
                burnout_risk_pct__gte=ELEVATED,
            )
            .values("employee_id")
            .distinct()
            .count()
        )

        completed = list(Intervention.objects.filter(status="completed"))
        success = [i for i in completed if (i.outcome or "").lower() == "worked"]
        success_pct = (
            round(100 * len(success) / len(completed)) if len(completed) >= 5 else None
        )
        risk_drop = []
        for i in completed:
            if i.followup_risk_pct is not None:
                risk_drop.append(
                    float(i.baseline_risk_pct) - float(i.followup_risk_pct)
                )
        avg_drop = round(mean(risk_drop), 1) if len(risk_drop) >= 5 else None

        # Forecast Q4: simple from recent trend (projected).
        recent = list(
            WeeklyMetric.objects.filter(week_start__gte=date(2026, 7, 1))
            .values("week_start")
            .annotate(
                cnt=Count("employee_id", distinct=True, filter=Q(burnout_risk_pct__gte=ELEVATED))
            )
            .order_by("week_start")
        )
        forecast = {"low": None, "high": None, "projected": True}
        if recent:
            vals = [int(r["cnt"]) for r in recent[-8:]]
            if vals:
                lo = max(0, round(min(vals) * 0.85))
                hi = round(max(vals) * 1.05)
                forecast = {"low": lo, "high": hi, "projected": True}

        # Heatmap: department × last 12 weeks
        since = AS_OF - timedelta(weeks=12)
        heat_raw = (
            WeeklyMetric.objects.filter(week_start__gte=since)
            .annotate(week=TruncWeek("week_start"))
            .values("employee__department_id", "employee__department__name", "week")
            .annotate(cnt=Count("id"), burnout=Avg("burnout_risk_pct"))
            .order_by("week", "employee__department__name")
        )
        weeks_ordered: list[str] = []
        seen_w: set[str] = set()
        cells = []
        for row in heat_raw:
            w = row["week"].isoformat()[:10]
            if w not in seen_w:
                seen_w.add(w)
                weeks_ordered.append(w)
            cells.append(
                suppress_small_group(
                    int(row["cnt"]),
                    {
                        "department_id": row["employee__department_id"],
                        "department": row["employee__department__name"],
                        "week": w,
                        "burnout_risk_pct": round(float(row["burnout"] or 0), 1),
                    },
                )
            )
        weeks_ordered = weeks_ordered[-12:]

        # Systemic drivers from elevated cases' SHAP-ish burnout_drivers JSON if present.
        driver_counts: dict[str, int] = defaultdict(int)
        for r in elevated:
            raw = (r.burnout_drivers or "").strip()
            if not raw or raw == "[]":
                # Fallback heuristics from current metrics.
                if float(r.workload_index) >= 100:
                    driver_counts["workload"] += 1
                elif float(r.overtime_hours_monthly) >= 12:
                    driver_counts["overtime"] += 1
                elif r.recognition_90d == 0:
                    driver_counts["recognition"] += 1
                else:
                    driver_counts["workload"] += 1
                continue
            try:
                import json

                items = json.loads(raw)
                if isinstance(items, list) and items:
                    top = items[0]
                    feat = (
                        top.get("feature")
                        or top.get("label")
                        or top.get("driver")
                        or "workload"
                    )
                    feat_l = str(feat).lower()
                    if "overtime" in feat_l or "on_call" in feat_l or "on-call" in feat_l:
                        driver_counts["overtime"] += 1
                    elif "recog" in feat_l:
                        driver_counts["recognition"] += 1
                    elif "role" in feat_l or "ambigu" in feat_l:
                        driver_counts["role_ambiguity"] += 1
                    elif "unfill" in feat_l or "headcount" in feat_l or "vacan" in feat_l:
                        driver_counts["unfilled_roles"] += 1
                    else:
                        driver_counts["workload"] += 1
                else:
                    driver_counts["workload"] += 1
            except Exception:
                driver_counts["workload"] += 1

        total_drv = max(1, sum(driver_counts.values()))
        driver_order = [
            ("workload", "Workload above baseline"),
            ("overtime", "Overtime & on-call"),
            ("recognition", "Recognition gap"),
            ("unfilled_roles", "Unfilled roles"),
            ("role_ambiguity", "Role ambiguity"),
        ]
        drivers = [
            {
                "id": key,
                "label": label,
                "pct": round(100 * driver_counts.get(key, 0) / total_drv),
                "count": driver_counts.get(key, 0),
            }
            for key, label in driver_order
        ]

        # Elevated by tier
        elevated_ids = {r.employee_id for r in elevated}
        by_tier = {"gold": [0, 0], "silver": [0, 0], "bronze": [0, 0], "growth": [0, 0]}
        for r in currents:
            tier = (r.performance_tier or "growth").lower()
            if tier not in by_tier:
                tier = "growth"
            by_tier[tier][1] += 1
            if r.employee_id in elevated_ids:
                by_tier[tier][0] += 1
        tier_elevated = {
            k: {"at_risk": v[0], "total": v[1]} for k, v in by_tier.items()
        }

        # Hotspots: teams with n>=5 and burnout >= 45, alphabetically secondary
        by_team: dict[int, list[EmployeeCurrent]] = defaultdict(list)
        for r in currents:
            if r.employee.team_id:
                by_team[r.employee.team_id].append(r)
        hotspots = []
        for team in Team.objects.select_related("department").order_by("name"):
            rows = by_team.get(team.id, [])
            agg = _agg_currents(rows)
            if agg.get("suppressed"):
                continue
            # Dominant driver label
            top_driver = "workload"
            if rows:
                if mean(float(r.overtime_hours_monthly) for r in rows) >= 12:
                    top_driver = "overtime"
                elif mean(float(r.recognition_90d) for r in rows) < 1:
                    top_driver = "recognition"
            hotspots.append(
                {
                    "team_id": team.id,
                    "team": team.name,
                    "department": team.department.name,
                    "burnout_risk_pct": agg["burnout_risk_pct"],
                    "elevated": agg.get("elevated") or 0,
                    "n": agg.get("n"),
                    "driver": top_driver,
                    "action": {
                        "workload": "headcount_approval",
                        "overtime": "shift_policy",
                        "recognition": "recognition_program",
                    }.get(top_driver, "policy_review"),
                }
            )
        # Support priority: elevated count, then avg burnout — not a people leaderboard.
        hotspots.sort(
            key=lambda h: (-(h.get("elevated") or 0), -(h["burnout_risk_pct"] or 0), h["team"])
        )
        hotspots = [
            h
            for h in hotspots
            if (h.get("elevated") or 0) > 0 or (h["burnout_risk_pct"] or 0) >= 40
        ][:8]

        return Response(
            {
                "kpis": {
                    "elevated_count": elevated_n,
                    "elevated_was_july": jul_elevated,
                    "share_pct": round(100 * elevated_n / max(1, n), 1),
                    "target_pct": 3.0,
                    "forecast_q4": forecast,
                    "intervention_success_pct": success_pct,
                    "avg_risk_drop_pts": avg_drop,
                },
                "heatmap": {"weeks": weeks_ordered, "cells": cells},
                "drivers": drivers,
                "tier_elevated": tier_elevated,
                "hotspots": hotspots,
                "headcount": n,
                "suppression_min": 5,
                "no_people_ranking": True,
            }
        )


# ---------------------------------------------------------------------------
# H07 Organization Morale
# ---------------------------------------------------------------------------


class HrMoraleView(APIView):
    """GET /api/hr/morale/ — team morale spectrum + signal grid (n≥5)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)
        currents = list(
            EmployeeCurrent.objects.select_related(
                "employee", "employee__department", "employee__team"
            ).all()
        )
        by_team: dict[int, list[EmployeeCurrent]] = defaultdict(list)
        for r in currents:
            if r.employee.team_id:
                by_team[r.employee.team_id].append(r)

        # August median mood per team from weekly metrics.
        aug_medians: dict[int, float] = {}
        for row in (
            WeeklyMetric.objects.filter(
                week_start__gte=date(2026, 8, 1),
                week_start__lt=date(2026, 9, 1),
            )
            .values("employee__team_id")
            .annotate(cnt=Count("id"), mood=Avg("mood_score"))
        ):
            tid = row["employee__team_id"]
            if tid and int(row["cnt"]) >= 5:
                aug_medians[tid] = float(row["mood"] or 0)

        spectrum = []
        grid = []
        needing = []
        for team in Team.objects.select_related("department").order_by("name"):
            rows = by_team.get(team.id, [])
            agg = _agg_currents(rows)
            if agg.get("suppressed"):
                continue
            moods = [float(r.mood_score) for r in rows]
            med = round(median(moods), 1) if moods else None
            aug = aug_medians.get(team.id)
            delta = round(med - aug) if med is not None and aug is not None else None
            status = "healthy"
            if med is not None:
                if med < 45:
                    status = "needs_support"
                elif med < 65:
                    status = "watch"
            # Anonymous dots — values only, no identities.
            dots = sorted(round(m, 1) for m in moods)
            recog_rate = round(
                100
                * sum(1 for r in rows if r.recognition_90d > 0)
                / max(1, len(rows))
            )
            innov_part = round(
                100
                * sum(1 for r in rows if r.ideas_submitted_12m > 0)
                / max(1, len(rows))
            )
            entry = {
                "team_id": team.id,
                "team": team.name,
                "department": team.department.name,
                "n": len(rows),
                "morale_median": med,
                "morale_delta_vs_aug": delta,
                "status": status,
                "dots": dots,
                "engagement": agg.get("engagement"),
                "burnout_risk_pct": agg.get("burnout_risk_pct"),
                "recognition_pct": recog_rate,
                "innovation_pct": innov_part,
                "performance": agg.get("performance"),
            }
            spectrum.append(entry)
            grid.append(
                {
                    "team_id": team.id,
                    "team": team.name,
                    "morale": med,
                    "engagement": agg.get("engagement"),
                    "burnout_risk_pct": agg.get("burnout_risk_pct"),
                    "recognition": recog_rate,
                    "innovation": innov_part,
                    "performance": agg.get("performance"),
                }
            )
            if status in ("needs_support", "watch"):
                needing.append(
                    {
                        "team_id": team.id,
                        "team": team.name,
                        "morale": med,
                        "status": status,
                        "detail_key": (
                            "burnout_load"
                            if (agg.get("burnout_risk_pct") or 0) >= 45
                            else "recognition_gap"
                        ),
                        "elevated": agg.get("elevated"),
                        "burnout_risk_pct": agg.get("burnout_risk_pct"),
                        "recognition_pct": recog_rate,
                    }
                )

        # Sort spectrum by morale median ascending (support-first), not people rank.
        spectrum.sort(key=lambda e: (e["morale_median"] is None, e["morale_median"] or 0))
        needing.sort(key=lambda e: (e["morale"] is None, e["morale"] or 0))

        return Response(
            {
                "spectrum": spectrum,
                "grid": grid,
                "needing_support": needing[:6],
                "privacy_note": "groups_under_5_hidden_individuals_never_shown",
                "suppression_min": 5,
                "no_people_ranking": True,
                "morale_source": "mood_score",
            }
        )
