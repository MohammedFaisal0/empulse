"""Manager team aggregate + directory payload for M01–M05 (direct reports only)."""

from __future__ import annotations

from collections import defaultdict
from statistics import mean

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import UserProfile
from accounts.permissions import get_user_role
from analytics.aggregates import aggregate_or_suppress, suppress_small_group
from innovation.models import Idea
from org.models import Employee
from org.privacy import employees_visible_to
from pulse.models import EmployeeCurrent, WeeklyMetric
from pulse.serializers import parse_drivers

M06_HIGH = 60
M06_WATCH = 45


def _tier_for_score(score: float) -> str:
    if score >= 90:
        return "gold"
    if score >= 80:
        return "silver"
    if score >= 70:
        return "bronze"
    return "growth"


def _status_band(risk: int, change: int) -> str:
    if risk >= M06_HIGH:
        return "at_risk"
    if risk >= M06_WATCH:
        return "watch"
    if change < 0:
        return "improving"
    return "healthy"


def _avg(values: list[float]) -> float | None:
    return round(mean(values), 1) if values else None


def _mean_team_drivers(driver_blobs: list[str]) -> list[dict]:
    """Mean Shapley impact_pts by feature across direct reports (M03, aligned with M06)."""
    by_feature: dict[str, dict] = {}
    for raw in driver_blobs:
        parsed = parse_drivers(raw)
        for item in parsed.get("increasing") or []:
            if not isinstance(item, dict):
                continue
            feature = str(item.get("feature") or item.get("label") or "")
            if not feature:
                continue
            bucket = by_feature.setdefault(
                feature,
                {
                    "feature": feature,
                    "label": str(item.get("label") or feature),
                    "impacts": [],
                    "values": [],
                },
            )
            try:
                bucket["impacts"].append(float(item.get("impact_pts") or 0))
            except (TypeError, ValueError):
                pass
            try:
                bucket["values"].append(float(item.get("value") or 0))
            except (TypeError, ValueError):
                pass
    rows = []
    for feature, bucket in by_feature.items():
        if not bucket["impacts"]:
            continue
        rows.append(
            {
                "feature": feature,
                "label": bucket["label"],
                "impact_pts": round(mean(bucket["impacts"]), 2),
                "value": round(mean(bucket["values"]), 2) if bucket["values"] else None,
                "n": len(bucket["impacts"]),
            }
        )
    rows.sort(key=lambda r: -abs(r["impact_pts"]))
    return rows


class ManagerTeamView(APIView):
    """
    GET /api/manager/team/

    Direct-report directory (alphabetical) plus team aggregates for M01–M05.
    Aggregates suppress when n < 5. Wellbeing is returned beside performance, never
    folded into the EMPULSE/performance average.
    """

    permission_classes = [IsAuthenticated]
    executive_allowed = False

    @extend_schema(tags=["manager"])
    def get(self, request):
        role = get_user_role(request.user)
        if role not in (
            UserProfile.Role.MANAGER,
            UserProfile.Role.HR,
            UserProfile.Role.ADMIN,
        ):
            raise ApiError("auth.permission_denied", status_code=403)

        reports = (
            employees_visible_to(request.user)
            .select_related("current", "team", "department")
            .order_by("full_name")
        )
        people_rows: list[dict] = []
        team_name = None
        department_id = None
        department_name = None

        perf: list[float] = []
        eng: list[float] = []
        well: list[float] = []
        innov: list[float] = []
        burn: list[float] = []
        collab: list[float] = []
        quality: list[float] = []
        completion: list[float] = []
        driver_blobs: list[str] = []
        tier_counts = {"gold": 0, "silver": 0, "bronze": 0, "growth": 0}
        attention = 0

        for emp in reports:
            if team_name is None and emp.team_id:
                team_name = emp.team.name
            if department_id is None:
                department_id = emp.department_id
                department_name = emp.department.name
            try:
                current: EmployeeCurrent = emp.current
            except EmployeeCurrent.DoesNotExist:
                continue

            risk = current.burnout_risk_pct
            change = current.burnout_change_6w_pts
            if risk >= M06_HIGH:
                attention += 1

            tier = (current.performance_tier or _tier_for_score(current.performance_score)).lower()
            if tier not in tier_counts:
                tier = _tier_for_score(current.performance_score)
            tier_counts[tier] = tier_counts.get(tier, 0) + 1

            perf.append(float(current.performance_score))
            eng.append(float(current.engagement_score))
            well.append(float(current.wellbeing_score))
            innov.append(float(current.innovation_score))
            burn.append(float(risk))
            collab.append(float(current.collaboration_score))
            quality.append(float(current.task_quality_score))
            completion.append(float(current.task_completion_rate))
            driver_blobs.append(current.burnout_drivers or "")

            people_rows.append(
                {
                    "id": emp.id,
                    "full_name": emp.full_name,
                    "first_name": emp.first_name,
                    "last_name": emp.last_name,
                    "job_title": emp.job_title,
                    "performance_score": current.performance_score,
                    "performance_tier": tier,
                    "engagement_score": round(current.engagement_score, 1),
                    "wellbeing_score": current.wellbeing_score,
                    "burnout_risk_pct": risk,
                    "burnout_change_6w_pts": change,
                    "burnout_level": current.burnout_level,
                    "innovation_score": round(current.innovation_score, 1),
                    "collaboration_score": round(current.collaboration_score, 1),
                    "task_completion_rate": round(current.task_completion_rate, 1),
                    "task_quality_score": round(current.task_quality_score, 1),
                    "workload_index": round(current.workload_index, 1),
                    "overtime_hours_monthly": round(current.overtime_hours_monthly, 1),
                    "status_band": _status_band(risk, change),
                    "prior_quarter": {
                        "performance_score": None,
                        "wellbeing_score": None,
                    },
                }
            )

        n = len(people_rows)
        people_rows.sort(key=lambda p: p["full_name"])

        emp_ids = [p["id"] for p in people_rows]
        prior_avgs = {
            "performance": None,
            "engagement": None,
            "wellbeing": None,
            "burnout": None,
            "workload": None,
            "overtime": None,
        }
        now_avgs = {
            "workload": None,
            "overtime": None,
            "engagement": None,
        }
        trend: list[dict] = []
        changes: list[dict] = []

        if emp_ids:
            weeks = list(
                WeeklyMetric.objects.filter(employee_id__in=emp_ids)
                .order_by("-week_start")
                .values(
                    "employee_id",
                    "week_start",
                    "performance_score",
                    "engagement_score",
                    "wellbeing_score",
                    "burnout_risk_pct",
                    "workload_index",
                    "overtime_hours_monthly",
                )[: max(1, n) * 28]
            )

            # Per-person week series for prior-quarter ghosts (13 weeks earlier).
            by_emp_weeks: dict[int, list] = defaultdict(list)
            by_week: dict = defaultdict(
                lambda: {
                    "performance": [],
                    "engagement": [],
                    "wellbeing": [],
                    "burnout": [],
                    "workload": [],
                    "overtime": [],
                }
            )
            for w in weeks:
                by_emp_weeks[w["employee_id"]].append(w)
                key = w["week_start"].isoformat()
                by_week[key]["performance"].append(float(w["performance_score"]))
                by_week[key]["engagement"].append(float(w["engagement_score"]))
                by_week[key]["wellbeing"].append(float(w["wellbeing_score"]))
                by_week[key]["burnout"].append(float(w["burnout_risk_pct"]))
                by_week[key]["workload"].append(float(w["workload_index"]))
                by_week[key]["overtime"].append(float(w["overtime_hours_monthly"]))

            for emp_id, series in by_emp_weeks.items():
                series.sort(key=lambda row: row["week_start"])
                # Latest week = current; 13 weeks earlier ≈ index -14 if weekly.
                if len(series) >= 14:
                    prior = series[-14]
                elif len(series) >= 2:
                    prior = series[0]
                else:
                    prior = None
                if prior is None:
                    continue
                for p in people_rows:
                    if p["id"] == emp_id:
                        p["prior_quarter"] = {
                            "performance_score": round(float(prior["performance_score"]), 1),
                            "wellbeing_score": round(float(prior["wellbeing_score"]), 1),
                        }
                        break

            ordered_weeks = sorted(by_week.keys())
            for key in ordered_weeks[-16:]:
                bucket = by_week[key]
                trend.append(
                    {
                        "week_start": key,
                        "performance_score": _avg(bucket["performance"]),
                        "engagement_score": _avg(bucket["engagement"]),
                        "wellbeing_score": _avg(bucket["wellbeing"]),
                        "burnout_risk_pct": _avg(bucket["burnout"]),
                        "workload_index": _avg(bucket["workload"]),
                        "overtime_hours_monthly": _avg(bucket["overtime"]),
                        "collaboration_score": None,
                        "innovation_score": None,
                    }
                )
            if ordered_weeks:
                latest = by_week[ordered_weeks[-1]]
                now_avgs = {
                    "workload": _avg(latest["workload"]),
                    "overtime": _avg(latest["overtime"]),
                    "engagement": _avg(latest["engagement"]),
                }
            if len(ordered_weeks) >= 7:
                prior_key = ordered_weeks[-7]
                pb = by_week[prior_key]
                prior_avgs = {
                    "performance": _avg(pb["performance"]),
                    "engagement": _avg(pb["engagement"]),
                    "wellbeing": _avg(pb["wellbeing"]),
                    "burnout": _avg(pb["burnout"]),
                    "workload": _avg(pb["workload"]),
                    "overtime": _avg(pb["overtime"]),
                }

            # M01 "What's changing" cards from series deltas.
            def pct_change(now: float | None, then: float | None) -> float | None:
                if now is None or then is None or then == 0:
                    return None
                return round(((now - then) / abs(then)) * 100, 1)

            wl_pct = pct_change(now_avgs["workload"], prior_avgs["workload"])
            if wl_pct is not None:
                changes.append(
                    {
                        "id": "workload",
                        "metric": "workload",
                        "delta": wl_pct,
                        "unit": "pct",
                        "tone": "coral" if wl_pct > 0 else "teal",
                    }
                )
            ot_delta = None
            if now_avgs["overtime"] is not None and prior_avgs["overtime"] is not None:
                # Monthly hours → approximate weekly hours delta for the copy shape.
                ot_delta = round((now_avgs["overtime"] - prior_avgs["overtime"]) / 4, 1)
                high_ot = sum(
                    1
                    for p in people_rows
                    if p["overtime_hours_monthly"]
                    > (now_avgs["overtime"] or 0)
                )
                changes.append(
                    {
                        "id": "overtime",
                        "metric": "overtime",
                        "delta": ot_delta,
                        "unit": "h_week",
                        "people_count": max(1, high_ot),
                        "tone": "amber" if ot_delta > 0 else "teal",
                    }
                )
            eng_delta = None
            if now_avgs["engagement"] is not None and prior_avgs["engagement"] is not None:
                eng_delta = round(now_avgs["engagement"] - prior_avgs["engagement"], 1)
                changes.append(
                    {
                        "id": "engagement",
                        "metric": "engagement",
                        "delta": eng_delta,
                        "unit": "pts",
                        "tone": "coral" if eng_delta < 0 else "teal",
                    }
                )

            ideas_month = Idea.objects.filter(
                employee_id__in=emp_ids,
                status__icontains="approv",
            ).count()
            # Also count decided approved-ish statuses if present.
            if ideas_month == 0:
                ideas_month = Idea.objects.filter(
                    employee_id__in=emp_ids,
                    status__in=["approved", "Approved", "implemented", "Implemented"],
                ).count()
            changes.append(
                {
                    "id": "innovation",
                    "metric": "innovation",
                    "delta": ideas_month,
                    "unit": "ideas_approved",
                    "tone": "teal",
                }
            )

        def delta(now: float | None, then: float | None) -> float | None:
            if now is None or then is None:
                return None
            return round(now - then, 1)

        empulse = _avg(perf)
        team_drivers = _mean_team_drivers(driver_blobs)

        aggregates = aggregate_or_suppress(
            n,
            lambda _items: {
                "performance_score": _avg(perf),
                "performance_delta": delta(_avg(perf), prior_avgs["performance"]),
                "engagement_score": _avg(eng),
                "engagement_delta": delta(_avg(eng), prior_avgs["engagement"]),
                "wellbeing_score": _avg(well),
                "wellbeing_delta": delta(_avg(well), prior_avgs["wellbeing"]),
                "morale_score": _avg(eng),
                "morale_delta": delta(_avg(eng), prior_avgs["engagement"]),
                "innovation_score": _avg(innov),
                "innovation_delta": None,
                "burnout_risk_pct": _avg(burn),
                "burnout_delta": delta(_avg(burn), prior_avgs["burnout"]),
                "collaboration_score": _avg(collab),
                "task_completion_rate": _avg(completion),
                "task_quality_score": _avg(quality),
                "empulse_score": empulse,
                "empulse_tier": _tier_for_score(empulse or 0),
                "points_to_gold": max(0, round(90 - (empulse or 0), 1)),
                "tier_mix": tier_counts,
                "attention_count": attention,
                "dimensions": {
                    "task_completion": _avg(completion),
                    "collaboration": _avg(collab),
                    "innovation": _avg(innov),
                    "engagement": _avg(eng),
                    "wellbeing": _avg(well),
                    "attendance": None,
                    "professionalism": None,
                    "digital": None,
                },
            },
        )

        dept_bench: dict = {"suppressed": True}
        if department_id is not None:
            dept_qs = Employee.objects.filter(department_id=department_id).select_related(
                "current"
            )
            dept_n = 0
            d_perf: list[float] = []
            d_eng: list[float] = []
            d_well: list[float] = []
            d_innov: list[float] = []
            d_collab: list[float] = []
            for e in dept_qs:
                try:
                    c = e.current
                except EmployeeCurrent.DoesNotExist:
                    continue
                dept_n += 1
                d_perf.append(float(c.performance_score))
                d_eng.append(float(c.engagement_score))
                d_well.append(float(c.wellbeing_score))
                d_innov.append(float(c.innovation_score))
                d_collab.append(float(c.collaboration_score))
            dept_bench = suppress_small_group(
                dept_n,
                {
                    "department": department_name,
                    "performance_score": _avg(d_perf),
                    "engagement_score": _avg(d_eng),
                    "wellbeing_score": _avg(d_well),
                    "innovation_score": _avg(d_innov),
                    "collaboration_score": _avg(d_collab),
                },
            )

        band_counts = {
            "at_risk": sum(1 for p in people_rows if p["status_band"] == "at_risk"),
            "watch": sum(1 for p in people_rows if p["status_band"] == "watch"),
            "improving": sum(1 for p in people_rows if p["status_band"] == "improving"),
            "healthy": sum(1 for p in people_rows if p["status_band"] == "healthy"),
        }

        quadrants = {
            "thriving": [],
            "burnout_risk": [],
            "development": [],
            "critical_support": [],
        }
        for p in people_rows:
            high_p = p["performance_score"] >= 70
            high_w = p["wellbeing_score"] >= 55
            if high_p and high_w:
                quadrants["thriving"].append(p["id"])
            elif high_p and not high_w:
                quadrants["burnout_risk"].append(p["id"])
            elif not high_p and high_w:
                quadrants["development"].append(p["id"])
            else:
                quadrants["critical_support"].append(p["id"])

        return Response(
            {
                "team": team_name,
                "department": department_name,
                "direct_reports": reports.count(),
                "attention_count": attention,
                "band_counts": band_counts,
                "aggregates": aggregates,
                "people": people_rows,
                "trend": trend,
                "changes": changes,
                "team_drivers": team_drivers,
                "department_benchmark": dept_bench,
                "quadrants": {
                    "thriving": len(quadrants["thriving"]),
                    "burnout_risk": len(quadrants["burnout_risk"]),
                    "development": len(quadrants["development"]),
                    "critical_support": len(quadrants["critical_support"]),
                    "member_ids": quadrants,
                },
            }
        )
