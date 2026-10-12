"""H01 Executive Pulse aggregate payload (org-wide, suppress < 5)."""

from __future__ import annotations

from calendar import month_abbr
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncMonth

from analytics.aggregates import aggregate_or_suppress, suppress_small_group
from analytics.models import EconomicImpactMonthly
from innovation.models import Idea, Recognition
from interventions.models import Intervention
from org.models import Department
from pulse.models import EmployeeCurrent, WeeklyMetric

ELEVATED_BURNOUT = 60
AS_OF = date(2026, 10, 6)


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


def _tier_rank(tier: str) -> int:
    return {"growth": 0, "bronze": 1, "silver": 2, "gold": 3}.get(tier.lower(), 0)


def _month_label(d: date) -> str:
    return month_abbr[d.month]


def build_executive_pulse() -> dict:
    currents = list(
        EmployeeCurrent.objects.select_related(
            "employee", "employee__department", "employee__team"
        ).all()
    )
    n = len(currents)

    def org_metrics(rows: list[EmployeeCurrent]) -> dict:
        scores = [float(r.performance_score) for r in rows]
        eng = [float(r.engagement_score) for r in rows]
        innovators = sum(1 for r in rows if r.ideas_submitted_12m > 0)
        recognized = sum(1 for r in rows if r.recognition_90d > 0)
        high = sum(1 for r in rows if (r.burnout_level or "").lower() == "high")
        avg_score = _avg(scores) or 0
        return {
            "headcount": len(rows),
            "empulse_score": round(avg_score),
            "empulse_tier": _tier_of(avg_score),
            "engagement": _avg(eng),
            # Wellbeing beside — never folded into empulse_score.
            "wellbeing": _avg([float(r.wellbeing_score) for r in rows]),
            "innovation_participation_pct": round(
                100 * innovators / max(1, len(rows))
            ),
            "recognition_rate_pct": round(100 * recognized / max(1, len(rows))),
            "elevated_burnout_count": high,
            "elevated_burnout_pct": round(100 * high / max(1, len(rows)), 1),
        }

    org = aggregate_or_suppress(currents, org_metrics)

    # --- Monthly heartbeat (last 12 months) ---
    month_rows = list(
        WeeklyMetric.objects.annotate(month=TruncMonth("week_start"))
        .values("month")
        .annotate(
            n=Count("id"),
            performance=Avg("performance_score"),
            engagement=Avg("engagement_score"),
            burnout=Avg("burnout_risk_pct"),
            wellbeing=Avg("wellbeing_score"),
            elevated=Count(
                "employee_id",
                distinct=True,
                filter=Q(burnout_risk_pct__gte=ELEVATED_BURNOUT),
            ),
        )
        .order_by("month")
    )
    # Keep last 12 calendar months with enough people.
    heartbeat = []
    for w in month_rows[-12:]:
        cell = suppress_small_group(
            int(w["n"]),
            {
                "month": w["month"].isoformat()[:10],
                "label": _month_label(w["month"]),
                "performance_score": round(float(w["performance"] or 0), 1),
                "engagement_score": round(float(w["engagement"] or 0), 1),
                "burnout_risk_pct": round(float(w["burnout"] or 0), 1),
                "wellbeing_score": round(float(w["wellbeing"] or 0), 1),
                "elevated_count": int(w["elevated"]),
            },
        )
        if not cell.get("suppressed"):
            heartbeat.append(cell)

    # Annotations from weekly_metrics (design copy labels).
    annotations = []
    q2_months = [h for h in heartbeat if h["month"][5:7] in ("04", "05", "06")]
    if q2_months:
        surge = max(q2_months, key=lambda h: h["engagement_score"])
        annotations.append(
            {
                "month": surge["month"],
                "label": "Q2 DELIVERY SURGE",
                "kind": "surge",
            }
        )
    jul = next((h for h in heartbeat if h["month"][5:7] == "07"), None)
    if jul:
        annotations.append(
            {
                "month": jul["month"],
                "label": "REBALANCING · FROM 7 JUL",
                "kind": "rebalance",
            }
        )

    # --- Quarter deltas (Q3 vs Q2) from weekly performance/engagement ---
    def quarter_avgs(months: set[str]) -> tuple[float | None, float | None]:
        pts = [h for h in heartbeat if h["month"][5:7] in months]
        if not pts:
            return None, None
        return (
            _avg([h["performance_score"] for h in pts]),
            _avg([h["engagement_score"] for h in pts]),
        )

    q2_perf, q2_eng = quarter_avgs({"04", "05", "06"})
    q3_perf, q3_eng = quarter_avgs({"07", "08", "09"})
    org_pulse_delta = None
    eng_delta = None
    if q2_perf is not None and q3_perf is not None:
        org_pulse_delta = round(q3_perf - q2_perf)
    if q2_eng is not None and q3_eng is not None:
        eng_delta = round(q3_eng - q2_eng)

    # Innovation / recognition QoQ via Idea / Recognition dates.
    def participation_in(start: date, end: date) -> int:
        submitters = (
            Idea.objects.filter(submitted_at__gte=start, submitted_at__lt=end)
            .values("employee_id")
            .distinct()
            .count()
        )
        return round(100 * submitters / max(1, n)) if n else 0

    def recognition_in(start: date, end: date) -> int:
        people = (
            Recognition.objects.filter(created_at__gte=start, created_at__lt=end)
            .values("receiver_id")
            .distinct()
            .count()
        )
        return round(100 * people / max(1, n)) if n else 0

    innov_q2 = participation_in(date(2026, 4, 1), date(2026, 7, 1))
    innov_q3 = participation_in(date(2026, 7, 1), date(2026, 10, 1))
    recog_q2 = recognition_in(date(2026, 4, 1), date(2026, 7, 1))
    recog_q3 = recognition_in(date(2026, 7, 1), date(2026, 10, 1))

    # July elevated count for delta.
    jul_elevated = next(
        (h["elevated_count"] for h in heartbeat if h["month"][5:7] == "07"),
        None,
    )
    elevated_now = org.get("elevated_burnout_count") if not org.get("suppressed") else None
    elevated_delta = None
    if elevated_now is not None and jul_elevated is not None:
        elevated_delta = elevated_now - jul_elevated

    # --- Interventions KPI ---
    interventions = list(Intervention.objects.all())
    active = [
        i
        for i in interventions
        if i.status in ("in_progress", "approved", "proposed")
    ]
    completed = [i for i in interventions if i.status == "completed"]
    success = [i for i in completed if (i.outcome or "").lower() == "worked"]
    partial = [i for i in completed if (i.outcome or "").lower() == "partial"]
    on_track_n = len(success) + len(partial)
    # Follow-up due: in_progress with no followup date and started > 14d ago.
    cutoff = AS_OF - timedelta(days=14)
    followup_due = [
        i
        for i in interventions
        if i.status == "in_progress"
        and (
            (i.followup_at is not None and i.followup_at < AS_OF)
            or (i.followup_at is None and i.started_at and i.started_at <= cutoff)
        )
    ]
    this_month_start = date(AS_OF.year, AS_OF.month, 1)
    started_this_month = sum(
        1
        for i in interventions
        if i.started_at and i.started_at >= this_month_start
    )
    success_pct = (
        round(100 * len(success) / max(1, len(completed))) if completed else None
    )
    intervention_block = suppress_small_group(
        max(len(completed), len(active), 5 if interventions else 0),
        {
            "active": len(active),
            "completed": len(completed),
            "in_progress": sum(1 for i in interventions if i.status == "in_progress"),
            "success_pct": success_pct,
            "on_track_pct": round(100 * on_track_n / max(1, len(completed)))
            if completed
            else None,
            "followup_due": len(followup_due),
            "started_this_month": started_this_month,
        },
    )

    # Prior-quarter intervention success for delta.
    q2_completed = [
        i
        for i in completed
        if i.completed_at
        and date(2026, 4, 1) <= i.completed_at < date(2026, 7, 1)
    ]
    q2_success = sum(
        1 for i in q2_completed if (i.outcome or "").lower() == "worked"
    )
    q2_success_pct = (
        round(100 * q2_success / len(q2_completed)) if len(q2_completed) >= 5 else None
    )
    intervention_success_delta = None
    if success_pct is not None and q2_success_pct is not None:
        intervention_success_delta = success_pct - q2_success_pct

    # --- Economic impact last 12 months ---
    econ_since = AS_OF - timedelta(days=365)
    econ = EconomicImpactMonthly.objects.filter(month__gte=econ_since).aggregate(
        net=Sum("net_impact_sar"),
        interventions=Sum("interventions_completed"),
        ideas=Sum("ideas_implemented"),
    )
    net_sar = float(econ["net"] or 0)
    impact = {
        "net_impact_sar": round(net_sar),
        "net_impact_sar_m": round(net_sar / 1_000_000, 1),
        "interventions_completed": int(econ["interventions"] or 0),
        "ideas_implemented": int(econ["ideas"] or 0),
    }

    # --- Department rings + support list ---
    by_dept: dict[int, list[EmployeeCurrent]] = defaultdict(list)
    for row in currents:
        by_dept[row.employee.department_id].append(row)

    rings = []
    support = []
    for dept in Department.objects.order_by("name"):
        rows = by_dept.get(dept.id, [])
        agg = aggregate_or_suppress(
            rows,
            lambda rs: {
                "performance": _avg([float(r.performance_score) for r in rs]),
                "engagement": _avg([float(r.engagement_score) for r in rs]),
                "wellbeing": _avg([float(r.wellbeing_score) for r in rs]),
                "innovation": _avg([float(r.innovation_score) for r in rs]),
                "burnout_risk_pct": _avg([float(r.burnout_risk_pct) for r in rs]),
                "at_risk": sum(
                    1
                    for r in rs
                    if (r.burnout_level or "").lower() == "high"
                    or float(r.burnout_risk_pct) >= ELEVATED_BURNOUT
                ),
            },
        )
        if agg.get("suppressed"):
            rings.append(
                {
                    "id": dept.id,
                    "name": dept.name,
                    "headcount": dept.headcount,
                    "suppressed": True,
                }
            )
            continue
        # Pulse excludes wellbeing from the centre number.
        perf_dims = [
            agg["performance"] or 0,
            agg["engagement"] or 0,
            agg["innovation"] or 0,
        ]
        pulse = round(mean(perf_dims))
        needs = (agg["burnout_risk_pct"] or 0) >= 45
        note = (
            f"Burnout {round(agg['burnout_risk_pct'] or 0)}"
            if needs
            else f"Engagement {round(agg['engagement'] or 0)} · burnout {round(agg['burnout_risk_pct'] or 0)}"
        )
        # Wellbeing shown beside the ring metrics.
        entry = {
            "id": dept.id,
            "name": dept.name,
            "headcount": dept.headcount or len(rows),
            "suppressed": False,
            "n": agg.get("n"),
            "pulse": pulse,
            "performance": agg["performance"],
            "engagement": agg["engagement"],
            "wellbeing": agg["wellbeing"],
            "innovation": agg["innovation"],
            "burnout_risk_pct": agg["burnout_risk_pct"],
            "at_risk": agg["at_risk"],
            "status": "needs_support" if needs else "healthy",
            "note": note,
        }
        rings.append(entry)
        support.append(
            {
                "id": dept.id,
                "name": dept.name,
                "burnout_risk_pct": agg["burnout_risk_pct"],
                "at_risk": agg["at_risk"],
                "n": agg.get("n"),
                "status": entry["status"],
            }
        )
    # Support priority (not a people leaderboard): highest burnout first.
    support.sort(key=lambda d: (-(d["burnout_risk_pct"] or 0), d["name"]))
    support = support[:6]

    # --- Burnout heatmap: department × month ---
    heatmap_raw = (
        WeeklyMetric.objects.filter(
            week_start__gte=date(2025, 10, 1),
            week_start__lt=date(2026, 10, 1),
        )
        .annotate(month=TruncMonth("week_start"))
        .values("employee__department_id", "employee__department__name", "month")
        .annotate(n=Count("id"), burnout=Avg("burnout_risk_pct"))
        .order_by("employee__department__name", "month")
    )
    months_ordered: list[str] = []
    seen_m: set[str] = set()
    cells = []
    for row in heatmap_raw:
        m = row["month"].isoformat()[:10]
        if m not in seen_m:
            seen_m.add(m)
            months_ordered.append(m)
        cell = suppress_small_group(
            int(row["n"]),
            {
                "department_id": row["employee__department_id"],
                "department": row["employee__department__name"],
                "month": m,
                "label": _month_label(row["month"]),
                "burnout_risk_pct": round(float(row["burnout"] or 0), 1),
            },
        )
        cells.append(cell)
    months_ordered = months_ordered[-12:]

    # --- Capability tiers Q3 vs Q2 ---
    # Per-employee avg performance in each quarter → tier.
    q2_weeks = WeeklyMetric.objects.filter(
        week_start__gte=date(2026, 4, 1), week_start__lt=date(2026, 7, 1)
    )
    q3_weeks = WeeklyMetric.objects.filter(
        week_start__gte=date(2026, 7, 1), week_start__lt=date(2026, 10, 1)
    )

    def tier_counts(qs) -> dict[str, int]:
        per_emp = qs.values("employee_id").annotate(p=Avg("performance_score"))
        counts = {"gold": 0, "silver": 0, "bronze": 0, "growth": 0}
        for row in per_emp:
            counts[_tier_of(float(row["p"] or 0))] += 1
        return counts

    q2_tiers = tier_counts(q2_weeks)
    q3_tiers = tier_counts(q3_weeks)
    # Fallback to current snapshot if weekly sparse.
    if sum(q3_tiers.values()) < 5:
        q3_tiers = {"gold": 0, "silver": 0, "bronze": 0, "growth": 0}
        for r in currents:
            q3_tiers[(r.performance_tier or "growth").lower()] = (
                q3_tiers.get((r.performance_tier or "growth").lower(), 0) + 1
            )

    moved_up = 0
    q2_map = {
        r["employee_id"]: _tier_of(float(r["p"] or 0))
        for r in q2_weeks.values("employee_id").annotate(p=Avg("performance_score"))
    }
    q3_map = {
        r["employee_id"]: _tier_of(float(r["p"] or 0))
        for r in q3_weeks.values("employee_id").annotate(p=Avg("performance_score"))
    }
    for emp_id, t3 in q3_map.items():
        t2 = q2_map.get(emp_id)
        if t2 is not None and _tier_rank(t3) > _tier_rank(t2):
            moved_up += 1

    total_tier = max(1, sum(q3_tiers.values()))
    gold_elevated = sum(
        1
        for r in currents
        if (r.performance_tier or "").lower() == "gold"
        and (
            (r.burnout_level or "").lower() == "high"
            or float(r.burnout_risk_pct) >= ELEVATED_BURNOUT
        )
    )

    capability = {
        "q3": {
            k: {
                "count": q3_tiers[k],
                "pct": round(100 * q3_tiers[k] / total_tier),
                "delta_pp": round(
                    100 * q3_tiers[k] / total_tier
                    - 100 * q2_tiers.get(k, 0) / max(1, sum(q2_tiers.values()))
                ),
            }
            for k in ("gold", "silver", "bronze", "growth")
        },
        "q2": {
            k: {
                "count": q2_tiers.get(k, 0),
                "pct": round(
                    100 * q2_tiers.get(k, 0) / max(1, sum(q2_tiers.values()))
                ),
            }
            for k in ("gold", "silver", "bronze", "growth")
        },
        "moved_up": moved_up,
        "gold_elevated_burnout": gold_elevated,
        "headcount": n,
    }

    # --- Signals (rule-based, max 3) ---
    signals: list[dict] = []

    # 1) Department burnout rising across quarters.
    rising = []
    q_avgs: dict[tuple[int, str], dict[str, list[float]]] = defaultdict(
        lambda: {"q1": [], "q2": [], "q3": []}
    )
    for row in (
        WeeklyMetric.objects.filter(
            week_start__gte=date(2026, 1, 1), week_start__lt=date(2026, 10, 1)
        )
        .annotate(month=TruncMonth("week_start"))
        .values("employee__department_id", "employee__department__name", "month")
        .annotate(n=Count("id"), burnout=Avg("burnout_risk_pct"))
    ):
        if int(row["n"]) < 5:
            continue
        m = row["month"].month
        q = "q1" if m <= 3 else "q2" if m <= 6 else "q3"
        q_avgs[(row["employee__department_id"], row["employee__department__name"])][
            q
        ].append(float(row["burnout"] or 0))

    for (dept_id, name), buckets in q_avgs.items():
        vals = {q: mean(v) for q, v in buckets.items() if v}
        if "q1" in vals and "q2" in vals and "q3" in vals:
            if vals["q3"] > vals["q2"] > vals["q1"]:
                rising.append((vals["q3"] - vals["q1"], dept_id, name, vals))
    rising.sort(reverse=True)
    if rising:
        _, dept_id, name, vals = rising[0]
        signals.append(
            {
                "id": "burnout_rising",
                "title": f"{name}: burnout rising",
                "detail": (
                    f"Avg burnout risk climbed across Q1→Q3 "
                    f"({round(vals['q1'])}% → {round(vals['q3'])}%). "
                    "Support priority — not a ranking of people."
                ),
                "href": "/hr/burnout",
                "cta": "view_root_causes",
                "tone": "coral",
            }
        )
    elif support:
        # Fallback: highest-burnout department as support signal.
        s0 = support[0]
        signals.append(
            {
                "id": "burnout_priority",
                "title": f"{s0['name']}: needs support first",
                "detail": (
                    f"Avg burnout risk {round(s0['burnout_risk_pct'] or 0)}% · "
                    f"{s0.get('at_risk', 0)} people at elevated risk. "
                    "Department priority — not a ranking of people."
                ),
                "href": "/hr/burnout",
                "cta": "view_root_causes",
                "tone": "coral",
            }
        )

    # 2) Intervention follow-up overdue / due.
    if len(followup_due) >= 1:
        signals.append(
            {
                "id": "followup_due",
                "title": f"{len(followup_due)} interventions need follow-up",
                "detail": (
                    "In-progress cases with a follow-up date past or missing "
                    "after two weeks. Human approval still required."
                ),
                "href": "/hr/interventions",
                "cta": "start_intervention",
                "tone": "amber",
            }
        )

    # 3) Innovation participation falling.
    if innov_q3 < innov_q2 and (innov_q2 - innov_q3) >= 1:
        signals.append(
            {
                "id": "innovation_falling",
                "title": "Innovation participation falling",
                "detail": (
                    f"Distinct idea submitters dropped from {innov_q2}% in Q2 "
                    f"to {innov_q3}% in Q3."
                ),
                "href": "/hr/innovation",
                "cta": "explore_innovation",
                "tone": "violet",
            }
        )

    # Fill remaining with recognition gap if needed.
    if len(signals) < 3 and recog_q3 < recog_q2:
        signals.append(
            {
                "id": "recognition_gap",
                "title": "Recognition rate softened vs Q2",
                "detail": (
                    f"People recognized fell from {recog_q2}% (Q2) to "
                    f"{recog_q3}% (Q3). Engagement often tracks with a lag."
                ),
                "href": "/hr/recognition",
                "cta": "start_intervention",
                "tone": "amber",
            }
        )

    if len(signals) < 3 and gold_elevated > 0:
        signals.append(
            {
                "id": "gold_wellbeing",
                "title": f"{gold_elevated} Gold-tier people need wellbeing attention",
                "detail": (
                    "A high professional tier never hides a wellbeing alert. "
                    "Open the matrix to review performance beside wellbeing."
                ),
                "href": "/hr/matrix",
                "cta": "view_root_causes",
                "tone": "coral",
            }
        )
    elif len(signals) < 3 and innov_q3 <= innov_q2:
        signals.append(
            {
                "id": "innovation_watch",
                "title": "Innovation participation needs a push",
                "detail": (
                    f"Distinct idea submitters are at {innov_q3}% this quarter "
                    f"(Q2 was {innov_q2}%)."
                ),
                "href": "/hr/innovation",
                "cta": "explore_innovation",
                "tone": "violet",
            }
        )

    signals = signals[:3]

    # Top department for elevated burnout note.
    top_dept_note = None
    if support:
        s0 = support[0]
        top_dept_note = f"{s0.get('at_risk', 0)} in {s0['name']}"

    highest_note = None
    if heartbeat:
        best = max(heartbeat, key=lambda h: h["performance_score"])
        if q3_perf is not None and abs(best["performance_score"] - q3_perf) < 0.5:
            highest_note = "highest_since_tracking"

    return {
        "organization": {
            **org,
            "pulse_vs_q2": org_pulse_delta,
            "engagement_vs_q2": eng_delta,
            "innovation_vs_q2": innov_q3 - innov_q2,
            "recognition_vs_q2": recog_q3 - recog_q2,
            "elevated_vs_jul": elevated_delta,
            "elevated_top_dept": top_dept_note,
            "intervention_success_vs_q2": intervention_success_delta,
            "highest_note": highest_note,
        },
        "interventions": intervention_block,
        "impact": impact,
        "heartbeat": heartbeat,
        "annotations": annotations,
        "department_rings": rings,
        "needing_support": support,
        "burnout_heatmap": {
            "months": months_ordered,
            "cells": cells,
            "footnote": "privacy_under_5",
        },
        "capability": capability,
        "signals": signals,
        "no_people_ranking": True,
        "scope": "organization",
        "suppression_min": 5,
    }
