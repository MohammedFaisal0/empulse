"""H13 What-if Simulator — real ML simulate() on scoped employee_current rows."""

from __future__ import annotations

from typing import Any

import pandas as pd
from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import AuditLog, UserProfile
from accounts.permissions import get_user_employee, get_user_role
from analytics.aggregates import MIN_GROUP_SIZE
from org.models import Department, Employee, Team
from pulse.agg_cache import cached_aggregate
from pulse.ml_runtime import get_bundles, get_empulse_ml
from pulse.models import EmployeeCurrent

DISCLAIMER = (
    "Decision support from a statistical model trained on synthetic data; "
    "not a prediction about any individual."
)

_CONTROL_SCHEMA = {
    "workload_pct": {"min": -20, "max": 10, "step": 5, "default": 0},
    "task_streams": {"min": 0, "max": 4, "step": 1, "default": 0},
    "recognition_pct": {
        "options": [0, 50, 100],
        "default": 0,
    },
    "training_hours_month": {
        "options": [0, 4, 8],
        "default": 0,
    },
    "shared_on_call": {"default": False},
}

FEATURE_COLS = [
    "workload_index",
    "overtime_hours_monthly",
    "work_life_balance",
    "job_satisfaction",
    "mood_score",
    "engagement_score",
    "absence_days_annual",
    "recognition_90d",
    "tenure_years",
    "job_level",
    "training_times_last_year",
    "income_ratio",
    "years_since_promotion",
    "monthly_income_sar",
]


def _controls_to_levers(controls: dict[str, Any] | None, levers: dict | None) -> tuple[dict, list[dict]]:
    """
    Map design UI controls → DEFAULT_LEVERS keys.

    Direct ``levers`` keys win; ``controls`` are additive on top of defaults.
    """
    E = get_empulse_ml()
    out = {**E.DEFAULT_LEVERS, **(levers or {})}
    assumptions: list[dict] = []

    if controls:
        # Workload slider: -20 … +10
        if "workload_pct" in controls and controls["workload_pct"] is not None:
            w = float(controls["workload_pct"])
            out["workload_change_pct"] = out.get("workload_change_pct", 0) + w
            assumptions.append(
                {
                    "control": "workload",
                    "ui": f"{w:+.0f}%",
                    "lever": "workload_change_pct",
                    "delta": w,
                    "mapping": "Workload −10%/−20%/+10% → workload_change_pct",
                }
            )

        # Task redistribution: N streams → −3 workload_pct and −5 overtime_pct per stream
        streams = int(controls.get("task_streams") or 0)
        if streams:
            wl = -3.0 * streams
            ot = -5.0 * streams
            out["workload_change_pct"] = out.get("workload_change_pct", 0) + wl
            out["overtime_change_pct"] = out.get("overtime_change_pct", 0) + ot
            assumptions.append(
                {
                    "control": "task_redistribution",
                    "ui": f"{streams} streams",
                    "lever": "workload_change_pct + overtime_change_pct",
                    "delta": {"workload_change_pct": wl, "overtime_change_pct": ot},
                    "mapping": (
                        "Task redistribution 2 streams → workload_change_pct "
                        "(−3 per stream) and overtime_change_pct (−5 per stream)"
                    ),
                }
            )

        # Recognition program: 0 / 50 / 100% → +0 / +1 / +2 per 90 days
        recog_pct = controls.get("recognition_pct")
        if recog_pct is not None:
            rp = float(recog_pct)
            plus = 0.0
            if rp >= 100:
                plus = 2.0
            elif rp >= 50:
                plus = 1.0
            out["recognition_plus"] = out.get("recognition_plus", 0) + plus
            assumptions.append(
                {
                    "control": "recognition_program",
                    "ui": f"+{rp:.0f}%",
                    "lever": "recognition_plus",
                    "delta": plus,
                    "mapping": (
                        "Recognition program +50%/+100% → recognition_plus "
                        "(+1 / +2 per person per 90 days)"
                    ),
                }
            )

        # Training: hours/month → +1 training event per 4h
        hours = controls.get("training_hours_month")
        if hours is not None:
            h = float(hours)
            plus = h / 4.0
            out["training_plus"] = out.get("training_plus", 0) + plus
            assumptions.append(
                {
                    "control": "training_program",
                    "ui": f"{h:.0f} h / month",
                    "lever": "training_plus",
                    "delta": plus,
                    "mapping": "Training 4h/8h per month → training_plus (+1 per 4h)",
                }
            )

        # Team structure: shared on-call → overtime −10%
        if controls.get("shared_on_call"):
            out["overtime_change_pct"] = out.get("overtime_change_pct", 0) - 10.0
            assumptions.append(
                {
                    "control": "team_structure",
                    "ui": "Shared on-call",
                    "lever": "overtime_change_pct",
                    "delta": -10.0,
                    "mapping": 'Team structure "Shared on-call" → overtime_change_pct −10',
                }
            )

        # Optional direct engagement / WLB from advanced controls
        for key, lever in (
            ("engagement_plus", "engagement_plus"),
            ("work_life_balance_plus", "work_life_balance_plus"),
        ):
            if controls.get(key) is not None:
                val = float(controls[key])
                out[lever] = out.get(lever, 0) + val
                assumptions.append(
                    {
                        "control": key,
                        "ui": str(val),
                        "lever": lever,
                        "delta": val,
                        "mapping": f"{key} → {lever}",
                    }
                )

    if not assumptions and levers:
        assumptions.append(
            {
                "control": "direct_levers",
                "ui": "API levers",
                "lever": "DEFAULT_LEVERS keys",
                "delta": levers,
                "mapping": "Passed levers merged onto DEFAULT_LEVERS",
            }
        )

    # Round numeric levers
    for k, v in list(out.items()):
        out[k] = round(float(v), 4)

    return out, assumptions


def _scope_queryset(scope: str, scope_id: int | None):
    qs = EmployeeCurrent.objects.select_related(
        "employee", "employee__department", "employee__team"
    )
    label = "Organization"
    meta: dict[str, Any] = {"scope": scope, "scope_id": scope_id}

    if scope == "organization":
        meta["label"] = label
        return qs, meta
    if scope == "department":
        if not scope_id:
            raise ApiError("error.validation", status_code=400)
        try:
            dept = Department.objects.get(pk=scope_id)
        except Department.DoesNotExist as exc:
            raise ApiError("error.not_found", status_code=404) from exc
        meta["label"] = dept.name
        meta["department"] = dept.name
        return qs.filter(employee__department_id=scope_id), meta
    if scope == "team":
        if not scope_id:
            raise ApiError("error.validation", status_code=400)
        try:
            team = Team.objects.select_related("department").get(pk=scope_id)
        except Team.DoesNotExist as exc:
            raise ApiError("error.not_found", status_code=404) from exc
        meta["label"] = team.name
        meta["team"] = team.name
        meta["department"] = team.department.name
        return qs.filter(employee__team_id=scope_id), meta
    raise ApiError("error.validation", status_code=400)


def _dataframe(qs) -> pd.DataFrame:
    rows = []
    for c in qs:
        e = c.employee
        rows.append(
            {
                "workload_index": float(c.workload_index),
                "overtime_hours_monthly": float(c.overtime_hours_monthly),
                "work_life_balance": float(c.work_life_balance),
                "job_satisfaction": float(c.job_satisfaction),
                "mood_score": float(c.mood_score),
                "engagement_score": float(c.engagement_score),
                "absence_days_annual": float(c.absence_days_annual),
                "recognition_90d": int(c.recognition_90d),
                "tenure_years": float(e.tenure_years),
                "job_level": int(e.job_level),
                "training_times_last_year": int(c.training_times_last_year),
                "income_ratio": float(e.income_ratio),
                "years_since_promotion": float(e.years_since_promotion),
                "monthly_income_sar": int(e.monthly_income_sar),
                "performance_score": float(c.performance_score),
            }
        )
    if not rows:
        return pd.DataFrame(columns=FEATURE_COLS + ["performance_score"])
    return pd.DataFrame(rows)


def _authorize(user, scope: str, scope_id: int | None) -> str:
    """Return role. Enforce HR/admin, executive org/dept/team aggregates, manager gate."""
    role = get_user_role(user)
    if role in (UserProfile.Role.HR, UserProfile.Role.ADMIN):
        return role

    if role == UserProfile.Role.EXECUTIVE:
        if scope not in ("organization", "department", "team"):
            raise ApiError("auth.permission_denied", status_code=403)
        # Never individual — we have no employee scope.
        return role

    if role == UserProfile.Role.MANAGER:
        if not getattr(settings, "ALLOW_MANAGER_TEAM_SIMULATE", False):
            raise ApiError("auth.permission_denied", status_code=403)
        if scope != "team":
            raise ApiError("auth.permission_denied", status_code=403)
        emp = get_user_employee(user)
        if emp is None:
            raise ApiError("auth.permission_denied", status_code=403)
        # Manager may only simulate their own team (as team lead).
        own_team_id = emp.team_id
        # Prefer teams they manage: employees whose manager is this person.
        managed_team_ids = set(
            Employee.objects.filter(manager_id=emp.id)
            .exclude(team_id=None)
            .values_list("team_id", flat=True)
            .distinct()
        )
        if own_team_id:
            managed_team_ids.add(own_team_id)
        if scope_id not in managed_team_ids:
            raise ApiError("auth.permission_denied", status_code=403)
        return role

    raise ApiError("auth.permission_denied", status_code=403)


def _run_sim(
    *,
    user,
    scope: str,
    scope_id: int | None,
    levers_in: dict | None,
    controls: dict | None,
    write_audit: bool = True,
) -> dict[str, Any]:
    role = _authorize(user, scope, scope_id)
    qs, meta = _scope_queryset(scope, scope_id)
    df = _dataframe(qs)
    n = len(df)
    if n < MIN_GROUP_SIZE:
        raise ApiError("privacy.group_too_small", status_code=403)

    levers, map_assumptions = _controls_to_levers(controls, levers_in)
    burnout, attrition = get_bundles()
    E = get_empulse_ml()
    result = E.simulate(df, levers, burnout=burnout, attrition=attrition)

    # Supplementary signal averages (estimated) — never per-person.
    after = E.apply_levers(df, levers)
    signals = {
        "engagement_avg": [
            round(float(df["engagement_score"].mean()), 1),
            round(float(after["engagement_score"].mean()), 1),
        ],
        "workload_avg": [
            round(float(df["workload_index"].mean()), 1),
            round(float(after["workload_index"].mean()), 1),
        ],
        "performance_avg": [
            round(float(df["performance_score"].mean()), 1),
            round(float(df["performance_score"].mean()), 1),  # levers do not move performance
        ],
        "performance_note": "Performance score is not adjusted by these levers — shown equal.",
        "estimated": True,
    }

    assumptions = {
        "lever_mapping": map_assumptions,
        "default_levers": E.DEFAULT_LEVERS,
        "applied_levers": levers,
        "replacement_cost_multiplier": E.REPLACEMENT_COST_MULTIPLIER,
        "high_risk_pct": E.HIGH_RISK_PCT,
        "model": "HistGradientBoosting + calibrated sigmoid (empulse_ml.simulate)",
        "data": "Synthetic EMPULSE dataset · employee_current + employees features",
        "estimated": True,
    }

    payload = {
        "scope": meta,
        "people": n,
        "levers": levers,
        "controls": controls or {},
        "burnout_risk_avg_pct": result["burnout_risk_avg_pct"],
        "high_risk_count": result["high_risk_count"],
        "attrition_risk_avg_pct": result["attrition_risk_avg_pct"],
        "expected_exits_12m": result["expected_exits_12m"],
        "expected_exit_cost_sar": result["expected_exit_cost_sar"],
        "estimated_saving_sar": result["estimated_saving_sar"],
        "signals": signals,
        "assumptions": assumptions,
        "disclaimer": DISCLAIMER,
        "estimated": True,
        "no_people_ranking": True,
        "individuals_included": False,
        "executive_aggregates_only": role == UserProfile.Role.EXECUTIVE,
        "suppression_min": MIN_GROUP_SIZE,
        "manager_simulate_allowed": bool(
            getattr(settings, "ALLOW_MANAGER_TEAM_SIMULATE", False)
        ),
    }

    if write_audit:
        AuditLog.objects.create(
            actor=user,
            action=AuditLog.Action.SIMULATE,
            employee=None,
            path="/api/hr/simulate/",
            metadata={
                "scope": scope,
                "scope_id": scope_id,
                "levers": levers,
                "controls": controls or {},
                "people": n,
                "estimated_saving_sar": result["estimated_saving_sar"],
            },
        )

    return payload


class HrSimulateMetaView(APIView):
    """GET /api/hr/simulate/meta/ — scopes list + lever defaults + manager gate flag."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def get(self, request):
        role = get_user_role(request.user)
        if role not in (
            UserProfile.Role.HR,
            UserProfile.Role.ADMIN,
            UserProfile.Role.EXECUTIVE,
            UserProfile.Role.MANAGER,
        ):
            raise ApiError("auth.permission_denied", status_code=403)

        E = get_empulse_ml()
        manager_allowed = bool(
            getattr(settings, "ALLOW_MANAGER_TEAM_SIMULATE", False)
        )
        # Manager scopes differ per user — do not share the org-wide cache.
        if role == UserProfile.Role.MANAGER:
            if not manager_allowed:
                return Response(
                    {
                        "allowed": False,
                        "ask_hr": True,
                        "manager_simulate_allowed": False,
                        "default_levers": E.DEFAULT_LEVERS,
                        "disclaimer": DISCLAIMER,
                    }
                )
            emp = get_user_employee(request.user)
            managed = set(
                Employee.objects.filter(manager_id=emp.id if emp else -1)
                .exclude(team_id=None)
                .values_list("team_id", flat=True)
            )
            if emp and emp.team_id:
                managed.add(emp.team_id)
            teams = list(
                Team.objects.select_related("department")
                .filter(id__in=managed)
                .order_by("name")
                .values("id", "name", "department_id", "department__name")
            )
            return Response(
                {
                    "allowed": True,
                    "ask_hr": False,
                    "manager_simulate_allowed": manager_allowed,
                    "role": role,
                    "default_levers": E.DEFAULT_LEVERS,
                    "control_schema": _CONTROL_SCHEMA,
                    "departments": [],
                    "teams": [
                        {
                            "id": t["id"],
                            "name": t["name"],
                            "department_id": t["department_id"],
                            "department": t.get("department__name"),
                        }
                        for t in teams
                    ],
                    "disclaimer": DISCLAIMER,
                    "suppression_min": MIN_GROUP_SIZE,
                    "estimated": True,
                }
            )

        def _build_org_meta() -> dict[str, Any]:
            depts = list(Department.objects.order_by("name").values("id", "name"))
            teams = list(
                Team.objects.select_related("department")
                .order_by("name")
                .values("id", "name", "department_id", "department__name")
            )
            return {
                "allowed": True,
                "ask_hr": False,
                "manager_simulate_allowed": manager_allowed,
                "role": role,
                "default_levers": E.DEFAULT_LEVERS,
                "control_schema": _CONTROL_SCHEMA,
                "departments": depts,
                "teams": [
                    {
                        "id": t["id"],
                        "name": t["name"],
                        "department_id": t["department_id"],
                        "department": t.get("department__name"),
                    }
                    for t in teams
                ],
                "disclaimer": DISCLAIMER,
                "suppression_min": MIN_GROUP_SIZE,
                "estimated": True,
            }

        return Response(
            cached_aggregate(f"hr:simulate-meta:{role}", _build_org_meta)
        )


class HrSimulateView(APIView):
    """POST /api/hr/simulate/ — run empulse_ml.simulate on a scoped group."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def post(self, request):
        scope = str(request.data.get("scope") or "organization").lower()
        scope_id = request.data.get("scope_id")
        try:
            scope_id = int(scope_id) if scope_id is not None else None
        except (TypeError, ValueError) as exc:
            raise ApiError("error.validation", status_code=400) from exc

        levers = request.data.get("levers") or {}
        controls = request.data.get("controls") or {}
        if not isinstance(levers, dict) or not isinstance(controls, dict):
            raise ApiError("error.validation", status_code=400)

        payload = _run_sim(
            user=request.user,
            scope=scope,
            scope_id=scope_id,
            levers_in=levers,
            controls=controls,
            write_audit=True,
        )
        return Response(payload)


class HrSimulateCompareView(APIView):
    """POST /api/hr/simulate/compare/ — up to 3 lever/control sets."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["hr"])
    def post(self, request):
        scope = str(request.data.get("scope") or "organization").lower()
        scope_id = request.data.get("scope_id")
        try:
            scope_id = int(scope_id) if scope_id is not None else None
        except (TypeError, ValueError) as exc:
            raise ApiError("error.validation", status_code=400) from exc

        scenarios = request.data.get("scenarios") or []
        if not isinstance(scenarios, list) or not scenarios:
            raise ApiError("error.validation", status_code=400)
        if len(scenarios) > 3:
            raise ApiError("error.validation", status_code=400)

        results = []
        for i, sc in enumerate(scenarios):
            if not isinstance(sc, dict):
                raise ApiError("error.validation", status_code=400)
            payload = _run_sim(
                user=request.user,
                scope=scope,
                scope_id=scope_id,
                levers_in=sc.get("levers") or {},
                controls=sc.get("controls") or {},
                write_audit=True,
            )
            payload["scenario_label"] = sc.get("label") or f"Scenario {i + 1}"
            results.append(payload)

        return Response(
            {
                "scope": results[0]["scope"] if results else {},
                "scenarios": results,
                "disclaimer": DISCLAIMER,
                "estimated": True,
                "no_people_ranking": True,
                "individuals_included": False,
            }
        )
