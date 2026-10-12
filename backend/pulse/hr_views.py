"""HR / Executive aggregate + audited individual endpoints (H01, H02, H03, H03b)."""

from __future__ import annotations

import csv
import io
from statistics import mean

from django.db.models import Avg, Count, Q
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import UserProfile
from accounts.permissions import (
    DenyExecutiveIndividualAccess,
    get_user_role,
)
from analytics.aggregates import aggregate_or_suppress
from innovation.models import Idea, Recognition
from org.models import Department, Employee, Team
from org.privacy import (
    assert_not_executive_individual,
    employees_visible_to,
    log_directory_export,
    maybe_audit_profile_read,
)
from pulse.agg_cache import cached_aggregate
from pulse.hr_executive import build_executive_pulse
from pulse.models import EmployeeCurrent
from pulse.profile_payload import member_profile_payload


def _require_hr_org_viewer(user):
    """HR, executive, or admin may view org aggregates."""
    role = get_user_role(user)
    if role not in (
        UserProfile.Role.HR,
        UserProfile.Role.EXECUTIVE,
        UserProfile.Role.ADMIN,
    ):
        raise ApiError("auth.permission_denied", status_code=403)
    return role


def _require_hr_individual(user):
    """Individuals: HR/admin only — executives get privacy.executive_aggregates_only."""
    assert_not_executive_individual(user)
    role = get_user_role(user)
    if role not in (UserProfile.Role.HR, UserProfile.Role.ADMIN):
        raise ApiError("auth.permission_denied", status_code=403)
    return role


def _avg(vals: list[float]) -> float | None:
    return round(mean(vals), 1) if vals else None


def _development_of(cur: EmployeeCurrent | None) -> str:
    """Directory development status (no separate plan model in seed)."""
    if cur is None:
        return "watch"
    tier = (cur.performance_tier or "").lower()
    if tier == "growth" or cur.training_times_last_year >= 2:
        return "active"
    if float(cur.burnout_risk_pct) >= 60 or float(cur.wellbeing_score) < 45:
        return "watch"
    return "on_track"


def _wellbeing_alert(cur: EmployeeCurrent | None) -> bool:
    if cur is None:
        return False
    return float(cur.burnout_risk_pct) >= 60 or float(cur.wellbeing_score) < 45


def _directory_queryset(request):
    q = (request.query_params.get("q") or "").strip()
    department = (request.query_params.get("department") or "").strip()
    tier = (request.query_params.get("tier") or "").strip().lower()
    alert = (request.query_params.get("alert") or "").strip().lower()
    development = (request.query_params.get("development") or "").strip().lower()

    qs = (
        employees_visible_to(request.user)
        .select_related("department", "team", "current")
        .order_by("full_name")
    )
    if q:
        qs = qs.filter(
            Q(full_name__icontains=q)
            | Q(team__name__icontains=q)
            | Q(department__name__icontains=q)
            | Q(job_title__icontains=q)
        )
    if department:
        qs = qs.filter(department__name__iexact=department)
    if tier:
        qs = qs.filter(current__performance_tier__iexact=tier)

    # Alert / development require python-side filter (derived fields).
    # Pull ids when filters set; for large orgs we annotate via ORM where possible.
    if alert in ("yes", "true", "1", "alert"):
        qs = qs.filter(
            Q(current__burnout_risk_pct__gte=60) | Q(current__wellbeing_score__lt=45)
        )
    elif alert in ("no", "false", "0", "none"):
        qs = qs.filter(current__burnout_risk_pct__lt=60, current__wellbeing_score__gte=45)

    if development in ("active", "on_track", "watch"):
        # Filter in Python after fetch would break pagination — approximate in ORM.
        if development == "active":
            qs = qs.filter(
                Q(current__performance_tier__iexact="growth")
                | Q(current__training_times_last_year__gte=2)
            )
        elif development == "watch":
            qs = qs.filter(
                Q(current__burnout_risk_pct__gte=60) | Q(current__wellbeing_score__lt=45)
            ).exclude(
                Q(current__performance_tier__iexact="growth")
                | Q(current__training_times_last_year__gte=2)
            )
        else:  # on_track
            qs = qs.exclude(
                Q(current__performance_tier__iexact="growth")
                | Q(current__training_times_last_year__gte=2)
                | Q(current__burnout_risk_pct__gte=60)
                | Q(current__wellbeing_score__lt=45)
            )

    return qs


def _person_row(emp: Employee) -> dict:
    try:
        cur = emp.current
    except EmployeeCurrent.DoesNotExist:
        cur = None
    return {
        "id": emp.id,
        "full_name": emp.full_name,
        "employee_code": emp.employee_code,
        "job_title": emp.job_title,
        "department": emp.department.name,
        "team": emp.team.name if emp.team_id else None,
        "performance_score": cur.performance_score if cur else None,
        "performance_tier": cur.performance_tier if cur else None,
        "wellbeing_alert": _wellbeing_alert(cur),
        "development": _development_of(cur),
    }


def _directory_summary(base_qs) -> dict:
    """Summary over the unfiltered org directory (or filtered set for strip)."""
    total = base_qs.count()
    alerts = base_qs.filter(
        Q(current__burnout_risk_pct__gte=60) | Q(current__wellbeing_score__lt=45)
    ).count()
    plans = base_qs.filter(
        Q(current__performance_tier__iexact="growth")
        | Q(current__training_times_last_year__gte=2)
    ).count()
    growth_tier = base_qs.filter(current__performance_tier__iexact="growth").count()
    tiers = {"gold": 0, "silver": 0, "bronze": 0, "growth": 0}
    for row in (
        base_qs.values("current__performance_tier")
        .annotate(n=Count("id"))
        .order_by()
    ):
        key = (row["current__performance_tier"] or "growth").lower()
        if key in tiers:
            tiers[key] = row["n"]
    depts = Department.objects.count()
    teams = Team.objects.count()
    return {
        "people": total,
        "departments": depts,
        "teams": teams,
        "wellbeing_alerts": alerts,
        "development_plans_active": plans,
        "growth_tier_count": growth_tier,
        "tier_mix": tiers,
    }


class HrEmployeesView(APIView):
    """
    GET /api/hr/employees/ — alphabetical directory (H03).
    Never sorted by score. Wellbeing shown only as alert flag.
    Executives: 403.
    """

    permission_classes = [IsAuthenticated, DenyExecutiveIndividualAccess]
    executive_allowed = False

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_individual(request.user)
        try:
            limit = min(100, max(1, int(request.query_params.get("limit") or 50)))
            offset = max(0, int(request.query_params.get("offset") or 0))
            page = max(1, int(request.query_params.get("page") or 0) or 0)
        except ValueError as exc:
            raise ApiError("error.validation", status_code=400) from exc
        if page:
            offset = (page - 1) * limit

        # Summary uses full visible directory (not search-filtered).
        summary_qs = (
            employees_visible_to(request.user)
            .select_related("current")
            .order_by("full_name")
        )
        summary = _directory_summary(summary_qs)

        qs = _directory_queryset(request)
        total = qs.count()
        page_rows = list(qs[offset : offset + limit])
        people = [_person_row(emp) for emp in page_rows]

        departments = list(
            Department.objects.order_by("name").values_list("name", flat=True)
        )

        return Response(
            {
                "total": total,
                "offset": offset,
                "limit": limit,
                "page": (offset // limit) + 1,
                "page_size": limit,
                "pages": max(1, (total + limit - 1) // limit),
                "sorted_by": "full_name",
                "no_score_sort": True,
                "people": people,
                "summary": summary,
                "filters": {
                    "departments": departments,
                    "tiers": ["gold", "silver", "bronze", "growth"],
                    "alerts": ["any", "alert", "none"],
                    "development": ["any", "active", "on_track", "watch"],
                },
                "audit_note": "every_profile_view_logged",
            }
        )


class HrEmployeesExportView(APIView):
    """GET /api/hr/employees/export/ — audited CSV of filtered directory columns."""

    permission_classes = [IsAuthenticated, DenyExecutiveIndividualAccess]
    executive_allowed = False

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_individual(request.user)
        qs = _directory_queryset(request)
        rows = [_person_row(emp) for emp in qs[:5000]]

        log_directory_export(
            actor=request.user,
            path=request.path,
            metadata={
                "count": len(rows),
                "q": request.query_params.get("q") or "",
                "department": request.query_params.get("department") or "",
                "tier": request.query_params.get("tier") or "",
                "alert": request.query_params.get("alert") or "",
                "development": request.query_params.get("development") or "",
            },
        )

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "full_name",
                "job_title",
                "department",
                "team",
                "performance_tier",
                "performance_score",
                "wellbeing_alert",
                "development",
            ]
        )
        for p in rows:
            writer.writerow(
                [
                    p["full_name"],
                    p["job_title"],
                    p["department"],
                    p["team"] or "",
                    p["performance_tier"] or "",
                    p["performance_score"] if p["performance_score"] is not None else "",
                    "alert" if p["wellbeing_alert"] else "",
                    p["development"],
                ]
            )

        response = HttpResponse(buf.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="empulse-employees-directory.csv"'
        )
        return response


class HrEmployeeProfileView(APIView):
    """
    GET /api/hr/employees/<id>/ — H03b twin profile.
    Writes AuditLog for HR/admin. Executive: 403.
    """

    permission_classes = [IsAuthenticated, DenyExecutiveIndividualAccess]
    executive_allowed = False

    @extend_schema(tags=["hr"])
    def get(self, request, pk: int):
        _require_hr_individual(request.user)
        qs = employees_visible_to(request.user).select_related(
            "current", "team", "department", "manager"
        )
        try:
            emp = qs.get(pk=pk)
        except qs.model.DoesNotExist:
            raise ApiError("error.not_found", status_code=404) from None

        maybe_audit_profile_read(request, emp)
        payload = member_profile_payload(emp)
        return Response(payload)


def build_organization_payload() -> dict:
    """H02 dept/team pulse map aggregates."""
    currents = list(
        EmployeeCurrent.objects.select_related(
            "employee", "employee__department", "employee__team"
        ).all()
    )

    depts = []
    for dept in Department.objects.order_by("name"):
        rows = [r for r in currents if r.employee.department_id == dept.id]
        agg = aggregate_or_suppress(
            rows,
            lambda rs: {
                "performance": _avg([float(x.performance_score) for x in rs]),
                "engagement": _avg([float(x.engagement_score) for x in rs]),
                "wellbeing": _avg([float(x.wellbeing_score) for x in rs]),
                "burnout_risk_pct": _avg(
                    [float(x.burnout_risk_pct) for x in rs]
                ),
                "innovation": _avg([float(x.innovation_score) for x in rs]),
            },
        )
        teams_out = []
        for team in Team.objects.filter(department=dept).order_by("name"):
            trows = [r for r in rows if r.employee.team_id == team.id]
            tagg = aggregate_or_suppress(
                trows,
                lambda rs: {
                    "performance": _avg(
                        [float(x.performance_score) for x in rs]
                    ),
                    "engagement": _avg(
                        [float(x.engagement_score) for x in rs]
                    ),
                    "wellbeing": _avg([float(x.wellbeing_score) for x in rs]),
                    "burnout_risk_pct": _avg(
                        [float(x.burnout_risk_pct) for x in rs]
                    ),
                },
            )
            teams_out.append(
                {
                    "id": team.id,
                    "name": team.name,
                    "headcount": team.headcount,
                    **tagg,
                }
            )
        depts.append(
            {
                "id": dept.id,
                "name": dept.name,
                "headcount": dept.headcount,
                **agg,
                "teams": teams_out,
            }
        )

    needing_support = [
        {
            "id": d["id"],
            "name": d["name"],
            "burnout_risk_pct": d.get("burnout_risk_pct"),
            "n": d.get("n"),
        }
        for d in depts
        if not d.get("suppressed") and (d.get("burnout_risk_pct") or 0) >= 45
    ]
    needing_support.sort(key=lambda d: (-(d["burnout_risk_pct"] or 0), d["name"]))

    return {
        "departments": depts,
        "needing_support": needing_support,
        "counts": {
            "departments": Department.objects.count(),
            "teams": Team.objects.count(),
            "employees": Employee.objects.count(),
            "public_ideas": Idea.objects.filter(is_public=True).count(),
            "public_recognitions": Recognition.objects.filter(
                is_public=True
            ).count(),
        },
        "no_people_ranking": True,
        "suppression_min": 5,
    }


class HrExecutivePulseView(APIView):
    """GET /api/hr/executive-pulse/ — H01 org aggregates (executive allowed)."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)
        return Response(
            cached_aggregate("hr:executive-pulse", build_executive_pulse)
        )


class HrOrganizationView(APIView):
    """GET /api/hr/organization/ — H02 dept/team pulse map (executive allowed)."""

    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def get(self, request):
        _require_hr_org_viewer(request.user)
        return Response(
            cached_aggregate("hr:organization", build_organization_payload)
        )
