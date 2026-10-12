"""Shared individual twin/profile payload (M04b / H03b / me twin)."""

from __future__ import annotations

from pulse.models import EmployeeCurrent, WeeklyMetric
from pulse.serializers import parse_drivers


def member_profile_payload(emp) -> dict:
    try:
        current = emp.current
    except EmployeeCurrent.DoesNotExist:
        current = None

    skills = list(
        emp.skills.order_by("skill").values("skill", "category", "level")[:12]
    )
    ideas = list(
        emp.ideas.order_by("-submitted_at").values(
            "id", "title", "status", "category", "submitted_at"
        )[:5]
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
    weeks = list(
        WeeklyMetric.objects.filter(employee=emp)
        .order_by("-week_start")[:12]
        .values(
            "week_start",
            "burnout_risk_pct",
            "performance_score",
            "wellbeing_score",
            "engagement_score",
            "workload_index",
        )
    )
    weeks.reverse()

    return {
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
        "current": None
        if current is None
        else {
            "as_of": current.as_of.isoformat(),
            "performance_score": current.performance_score,
            "performance_tier": current.performance_tier,
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
            "drivers": parse_drivers(current.burnout_drivers),
        },
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
        "trajectory": [
            {
                "week_start": w["week_start"].isoformat(),
                "burnout_risk_pct": w["burnout_risk_pct"],
                "performance_score": w["performance_score"],
                "wellbeing_score": w["wellbeing_score"],
                "engagement_score": w["engagement_score"],
                "workload_index": w["workload_index"],
            }
            for w in weeks
        ],
        "audited_access": True,
    }
