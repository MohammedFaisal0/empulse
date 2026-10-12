"""Role-scoped PulseAI tools. Return aggregates only — never raw row dumps."""

from __future__ import annotations

from datetime import date, timedelta
from statistics import mean
from typing import Any, Callable

from django.conf import settings
from django.db.models import Count

from accounts.models import UserProfile
from accounts.permissions import get_user_employee, get_user_role
from analytics.aggregates import MIN_GROUP_SIZE
from analytics.models import EconomicImpactMonthly
from innovation.models import Idea, Recognition
from interventions.models import Intervention
from org.models import Department, Employee
from org.privacy import employees_visible_to
from pulse.models import EmployeeCurrent, Skill

DISCLAIMER = "Decision support, not a diagnosis."

ToolFn = Callable[..., dict[str, Any]]


def _avg(vals: list[float]) -> float | None:
    return round(mean(vals), 1) if vals else None


def _role(user) -> str | None:
    return get_user_role(user)


def _scoped_employee_ids(user) -> list[int]:
    role = _role(user)
    if role == UserProfile.Role.EXECUTIVE:
        return list(Employee.objects.values_list("id", flat=True))
    return list(employees_visible_to(user).values_list("id", flat=True))


def _currents_for(user):
    ids = _scoped_employee_ids(user)
    return list(
        EmployeeCurrent.objects.filter(employee_id__in=ids).select_related(
            "employee", "employee__department", "employee__team"
        )
    )


def my_summary(user, **_kwargs) -> dict[str, Any]:
    """Employee: own current metrics only."""
    emp = get_user_employee(user)
    if emp is None:
        return {"error": "no_employee", "tables": []}
    try:
        c = EmployeeCurrent.objects.get(employee_id=emp.id)
    except EmployeeCurrent.DoesNotExist:
        return {
            "tool": "my_summary",
            "tables": ["pulse_employeecurrent"],
            "own_data_only": True,
            "metrics": {},
        }
    ideas = Idea.objects.filter(employee=emp)
    return {
        "tool": "my_summary",
        "tables": ["pulse_employeecurrent", "innovation_idea"],
        "own_data_only": True,
        "metrics": {
            "performance_score": float(c.performance_score),
            "performance_tier": c.performance_tier,
            "engagement_score": float(c.engagement_score),
            "wellbeing_score": float(c.wellbeing_score),
            "burnout_risk_pct": float(c.burnout_risk_pct),
            "innovation_score": float(c.innovation_score),
            "task_completion_rate": float(c.task_completion_rate),
            "ideas_submitted_12m": c.ideas_submitted_12m,
            "ideas_total": ideas.count(),
            "ideas_shipped": ideas.filter(
                status__in=["shipped", "implemented", "done"]
            ).count(),
        },
    }


def my_growth(user, **_kwargs) -> dict[str, Any]:
    emp = get_user_employee(user)
    if emp is None:
        return {"error": "no_employee"}
    skills = list(
        Skill.objects.filter(employee=emp)
        .order_by("skill")
        .values("skill", "category", "level")[:12]
    )
    return {
        "tool": "my_growth",
        "tables": ["pulse_skill"],
        "own_data_only": True,
        "skills": skills,
        "skills_count": len(skills),
    }


def team_burnout_summary(user, **_kwargs) -> dict[str, Any]:
    role = _role(user)
    currents = _currents_for(user)
    n = len(currents)
    if role == UserProfile.Role.MANAGER and n < MIN_GROUP_SIZE:
        return {
            "tool": "team_burnout_summary",
            "tables": ["pulse_employeecurrent"],
            "suppressed": True,
            "code": "privacy.group_too_small",
            "n": n,
            "suppression_min": MIN_GROUP_SIZE,
        }
    burns = [float(c.burnout_risk_pct) for c in currents]
    high = sum(1 for b in burns if b >= 60)
    return {
        "tool": "team_burnout_summary",
        "tables": ["pulse_employeecurrent"],
        "n": n,
        "burnout_risk_avg_pct": _avg(burns),
        "high_risk_count": high,
        "individuals_included": False,
        "estimated": True,
    }


def team_drivers(user, **_kwargs) -> dict[str, Any]:
    currents = _currents_for(user)
    n = len(currents)
    if _role(user) == UserProfile.Role.MANAGER and n < MIN_GROUP_SIZE:
        return {
            "tool": "team_drivers",
            "suppressed": True,
            "code": "privacy.group_too_small",
            "n": n,
        }
    wl = [float(c.workload_index) for c in currents]
    ot = [float(c.overtime_hours_monthly) for c in currents]
    eng = [float(c.engagement_score) for c in currents]
    recog = [float(c.recognition_90d) for c in currents]
    drivers = []
    if wl and mean(wl) >= 110:
        drivers.append({"driver": "workload", "avg": _avg(wl)})
    if ot and mean(ot) >= 20:
        drivers.append({"driver": "overtime", "avg": _avg(ot)})
    if eng and mean(eng) < 55:
        drivers.append({"driver": "engagement", "avg": _avg(eng)})
    if recog and mean(recog) < 2:
        drivers.append({"driver": "recognition", "avg": _avg(recog)})
    if not drivers:
        drivers.append({"driver": "mixed", "avg": None})
    return {
        "tool": "team_drivers",
        "tables": ["pulse_employeecurrent"],
        "n": n,
        "drivers": drivers,
        "individuals_included": False,
    }


def team_performance_summary(user, **_kwargs) -> dict[str, Any]:
    currents = _currents_for(user)
    n = len(currents)
    if _role(user) == UserProfile.Role.MANAGER and n < MIN_GROUP_SIZE:
        return {
            "tool": "team_performance_summary",
            "suppressed": True,
            "code": "privacy.group_too_small",
            "n": n,
        }
    return {
        "tool": "team_performance_summary",
        "tables": ["pulse_employeecurrent"],
        "n": n,
        "performance_avg": _avg([float(c.performance_score) for c in currents]),
        "engagement_avg": _avg([float(c.engagement_score) for c in currents]),
        "individuals_included": False,
        "note": "Wellbeing is never part of the performance score.",
    }


def org_burnout_by_department(user, **_kwargs) -> dict[str, Any]:
    """HR / executive: department aggregates; teams/groups < 5 suppressed."""
    rows = []
    for dept in Department.objects.order_by("name"):
        ids = list(
            Employee.objects.filter(department=dept).values_list("id", flat=True)
        )
        if len(ids) < MIN_GROUP_SIZE:
            continue
        burns = list(
            EmployeeCurrent.objects.filter(employee_id__in=ids).values_list(
                "burnout_risk_pct", flat=True
            )
        )
        if not burns:
            continue
        vals = [float(b) for b in burns]
        rows.append(
            {
                "department": dept.name,
                "n": len(ids),
                "burnout_risk_avg_pct": _avg(vals),
                "high_risk_count": sum(1 for b in vals if b >= 60),
            }
        )
    return {
        "tool": "org_burnout_by_department",
        "tables": ["org_department", "pulse_employeecurrent"],
        "departments": rows,
        "suppression_min": MIN_GROUP_SIZE,
        "individuals_included": False,
    }


def intervention_status(user, **_kwargs) -> dict[str, Any]:
    role = _role(user)
    if role == UserProfile.Role.EMPLOYEE:
        emp = get_user_employee(user)
        qs = Intervention.objects.filter(employee=emp) if emp else Intervention.objects.none()
    elif role == UserProfile.Role.MANAGER:
        ids = _scoped_employee_ids(user)
        qs = Intervention.objects.filter(employee_id__in=ids)
    else:
        qs = Intervention.objects.all()
    by_status = dict(
        qs.values("status").annotate(c=Count("id")).values_list("status", "c")
    )
    return {
        "tool": "intervention_status",
        "tables": ["interventions_intervention"],
        "counts_by_status": by_status,
        "total": sum(by_status.values()),
        "individuals_included": False,
        "note": "AI proposes; a person must approve before start.",
    }


def recognition_gaps(user, **_kwargs) -> dict[str, Any]:
    role = _role(user)
    since = date.today() - timedelta(days=90)
    if role == UserProfile.Role.EMPLOYEE:
        emp = get_user_employee(user)
        received = (
            Recognition.objects.filter(receiver=emp, created_at__gte=since).count()
            if emp
            else 0
        )
        sent = (
            Recognition.objects.filter(giver=emp, created_at__gte=since).count()
            if emp
            else 0
        )
        return {
            "tool": "recognition_gaps",
            "tables": ["innovation_recognition"],
            "own_data_only": True,
            "received_90d": received,
            "sent_90d": sent,
        }

    ids = _scoped_employee_ids(user)
    n = len(ids)
    if role == UserProfile.Role.MANAGER and n < MIN_GROUP_SIZE:
        return {
            "tool": "recognition_gaps",
            "suppressed": True,
            "code": "privacy.group_too_small",
            "n": n,
        }
    # Aggregate: share of people with zero recognition — no names.
    received_ids = set(
        Recognition.objects.filter(
            receiver_id__in=ids, created_at__gte=since
        ).values_list("receiver_id", flat=True)
    )
    zero = n - len(received_ids)
    total_recog = Recognition.objects.filter(
        receiver_id__in=ids, created_at__gte=since
    ).count()
    return {
        "tool": "recognition_gaps",
        "tables": ["innovation_recognition"],
        "n": n,
        "recognitions_90d": total_recog,
        "people_with_zero_recognition_90d": zero,
        "individuals_included": False,
    }


def economic_impact_summary(user, **_kwargs) -> dict[str, Any]:
    latest_month = (
        EconomicImpactMonthly.objects.order_by("-month")
        .values_list("month", flat=True)
        .first()
    )
    if latest_month is None:
        return {
            "tool": "economic_impact_summary",
            "tables": ["analytics_economicimpactmonthly"],
            "available": False,
            "estimated": True,
        }
    rows = list(EconomicImpactMonthly.objects.filter(month=latest_month))
    net = sum(float(r.net_impact_sar) for r in rows)
    retention = sum(float(r.retention_savings_sar) for r in rows)
    return {
        "tool": "economic_impact_summary",
        "tables": ["analytics_economicimpactmonthly"],
        "available": True,
        "month": latest_month.isoformat(),
        "departments_n": len(rows),
        "net_impact_sar": round(net, 0),
        "retention_savings_sar": round(retention, 0),
        "individuals_included": False,
        "estimated": True,
    }


def what_if(user, levers: dict | None = None, controls: dict | None = None, **_kwargs) -> dict[str, Any]:
    """Call the same simulate path used by H13; role-scoped."""
    from pulse.hr_simulate import _run_sim

    role = _role(user)
    levers = levers or {}
    controls = controls or {}

    if role == UserProfile.Role.EMPLOYEE:
        return {
            "tool": "what_if",
            "allowed": False,
            "message": "Organization what-if simulation is an HR tool. Ask your manager or HR.",
        }

    if role == UserProfile.Role.MANAGER:
        if not getattr(settings, "ALLOW_MANAGER_TEAM_SIMULATE", False):
            return {
                "tool": "what_if",
                "allowed": False,
                "ask_hr": True,
                "message": "Team simulation is not enabled for managers. Ask HR.",
            }
        emp = get_user_employee(user)
        team_id = emp.team_id if emp else None
        if not team_id:
            # pick first managed report's team
            report = employees_visible_to(user).exclude(team_id=None).first()
            team_id = report.team_id if report else None
        if not team_id:
            return {"tool": "what_if", "allowed": False, "message": "No team scope."}
        try:
            payload = _run_sim(
                user=user,
                scope="team",
                scope_id=team_id,
                levers_in=levers,
                controls=controls,
                write_audit=False,
            )
        except Exception as exc:  # ApiError etc.
            return {
                "tool": "what_if",
                "allowed": False,
                "error": getattr(exc, "detail", str(exc)),
            }
        return {
            "tool": "what_if",
            "allowed": True,
            "tables": ["pulse_employeecurrent", "ml.simulate"],
            "result": {
                "burnout_risk_avg_pct": payload["burnout_risk_avg_pct"],
                "high_risk_count": payload["high_risk_count"],
                "estimated_saving_sar": payload["estimated_saving_sar"],
                "people": payload["people"],
            },
            "individuals_included": False,
            "estimated": True,
        }

    # HR / executive / admin — organization scope aggregates
    try:
        payload = _run_sim(
            user=user,
            scope="organization",
            scope_id=None,
            levers_in=levers,
            controls=controls or {"workload_pct": -10},
            write_audit=False,
        )
    except Exception as exc:
        return {
            "tool": "what_if",
            "allowed": False,
            "error": getattr(exc, "detail", str(exc)),
        }
    return {
        "tool": "what_if",
        "allowed": True,
        "tables": ["pulse_employeecurrent", "ml.simulate"],
        "result": {
            "burnout_risk_avg_pct": payload["burnout_risk_avg_pct"],
            "high_risk_count": payload["high_risk_count"],
            "estimated_saving_sar": payload["estimated_saving_sar"],
            "people": payload["people"],
            "controls": controls or {"workload_pct": -10},
        },
        "individuals_included": False,
        "estimated": True,
    }


# Registry: name → (fn, roles allowed)
TOOLS: dict[str, tuple[ToolFn, frozenset[str]]] = {
    "my_summary": (
        my_summary,
        frozenset({UserProfile.Role.EMPLOYEE}),
    ),
    "my_growth": (
        my_growth,
        frozenset({UserProfile.Role.EMPLOYEE}),
    ),
    "team_burnout_summary": (
        team_burnout_summary,
        frozenset(
            {
                UserProfile.Role.MANAGER,
                UserProfile.Role.HR,
                UserProfile.Role.EXECUTIVE,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
    "team_drivers": (
        team_drivers,
        frozenset(
            {
                UserProfile.Role.MANAGER,
                UserProfile.Role.HR,
                UserProfile.Role.EXECUTIVE,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
    "team_performance_summary": (
        team_performance_summary,
        frozenset(
            {
                UserProfile.Role.MANAGER,
                UserProfile.Role.HR,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
    "org_burnout_by_department": (
        org_burnout_by_department,
        frozenset(
            {
                UserProfile.Role.HR,
                UserProfile.Role.EXECUTIVE,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
    "intervention_status": (
        intervention_status,
        frozenset(
            {
                UserProfile.Role.EMPLOYEE,
                UserProfile.Role.MANAGER,
                UserProfile.Role.HR,
                UserProfile.Role.EXECUTIVE,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
    "recognition_gaps": (
        recognition_gaps,
        frozenset(
            {
                UserProfile.Role.EMPLOYEE,
                UserProfile.Role.MANAGER,
                UserProfile.Role.HR,
                UserProfile.Role.EXECUTIVE,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
    "economic_impact_summary": (
        economic_impact_summary,
        frozenset(
            {
                UserProfile.Role.HR,
                UserProfile.Role.EXECUTIVE,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
    "what_if": (
        what_if,
        frozenset(
            {
                UserProfile.Role.MANAGER,
                UserProfile.Role.HR,
                UserProfile.Role.EXECUTIVE,
                UserProfile.Role.ADMIN,
            }
        ),
    ),
}


def allowed_tools_for(role: str | None) -> list[str]:
    if not role:
        return []
    return [name for name, (_fn, roles) in TOOLS.items() if role in roles]


def run_tool(name: str, user, **kwargs) -> dict[str, Any]:
    role = _role(user)
    entry = TOOLS.get(name)
    if entry is None:
        return {"error": "unknown_tool", "tool": name}
    fn, roles = entry
    if role not in roles:
        return {
            "error": "tool_not_allowed",
            "tool": name,
            "code": "auth.permission_denied",
        }
    return fn(user, **kwargs)
