from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import UserProfile
from accounts.permissions import get_user_role
from org.privacy import employees_visible_to, maybe_audit_profile_read
from pulse.models import EmployeeCurrent, WeeklyMetric
from pulse.serializers import ManagerBurnoutResponseSerializer, parse_drivers


# M06 band rule (design): high >= 60, watch 45–59, healthy < 45
M06_HIGH = 60
M06_WATCH = 45


def _detect_high_risk_week(weeks: list[dict], high: int = M06_HIGH):
    """Earliest week in the series where risk crossed into the high band."""
    detected = None
    prev = None
    for w in weeks:
        r = float(w["burnout_risk_pct"])
        if prev is not None and prev < high <= r:
            detected = w["week_start"]
            break
        prev = r
    if detected is None:
        for w in weeks:
            if float(w["burnout_risk_pct"]) >= high:
                detected = w["week_start"]
                break
    return detected


class ManagerBurnoutView(APIView):
    """
    GET /api/manager/burnout/

    At-risk direct reports with precomputed risk + Shapley drivers from
    employee_current (no model inference in the request).
    """

    permission_classes = [IsAuthenticated]
    executive_allowed = False

    @extend_schema(responses={200: ManagerBurnoutResponseSerializer}, tags=["manager"])
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
            .select_related("current", "team", "manager")
            .order_by("full_name")
        )
        people_rows = []
        attention = watch = healthy = 0

        for emp in reports:
            try:
                current: EmployeeCurrent = emp.current
            except EmployeeCurrent.DoesNotExist:
                continue

            risk = current.burnout_risk_pct
            # M06-only banding (see module constants).
            if risk >= M06_HIGH:
                attention += 1
            elif risk >= M06_WATCH:
                watch += 1
            else:
                healthy += 1

            change = current.burnout_change_6w_pts
            ago = max(0, min(100, risk - change))

            weeks = list(
                WeeklyMetric.objects.filter(employee=emp)
                .order_by("-week_start")[:16]
                .values(
                    "week_start",
                    "burnout_risk_pct",
                    "engagement_score",
                    "workload_index",
                    "overtime_hours_monthly",
                    "wellbeing_score",
                    "performance_score",
                )
            )
            weeks.reverse()
            detected = _detect_high_risk_week(weeks)

            people_rows.append(
                {
                    "id": emp.id,
                    "full_name": emp.full_name,
                    "first_name": emp.first_name,
                    "last_name": emp.last_name,
                    "job_title": emp.job_title,
                    "team": emp.team.name if emp.team_id else None,
                    "manager_name": emp.manager.full_name if emp.manager_id else None,
                    "burnout_risk_pct": risk,
                    "burnout_level": current.burnout_level,
                    "burnout_change_6w_pts": change,
                    "burnout_6w_ago_pct": ago,
                    "performance_score": current.performance_score,
                    "performance_tier": current.performance_tier,
                    "wellbeing_score": current.wellbeing_score,
                    "detected_on": detected.isoformat() if detected else None,
                    "as_of": current.as_of.isoformat(),
                    "drivers": parse_drivers(current.burnout_drivers),
                    "trajectory": [
                        {
                            "week_start": w["week_start"].isoformat(),
                            "burnout_risk_pct": w["burnout_risk_pct"],
                            "engagement_score": w["engagement_score"],
                            "workload_index": w["workload_index"],
                            "overtime_hours_monthly": w["overtime_hours_monthly"],
                            "wellbeing_score": w["wellbeing_score"],
                            "performance_score": w["performance_score"],
                        }
                        for w in weeks
                    ],
                }
            )

        # Attention list first (highest risk), then alphabetical within bands — never a leaderboard of everyone by score for directories; this screen is an early-warning list ordered by risk severity.
        people_rows.sort(key=lambda p: (-p["burnout_risk_pct"], p["full_name"]))

        payload = {
            "attention_count": attention,
            "watch_count": watch,
            "healthy_count": healthy,
            "direct_reports": reports.count(),
            "people": people_rows,
        }
        return Response(ManagerBurnoutResponseSerializer(payload).data)


class ManagerMemberProfileView(APIView):
    """GET /api/manager/members/<id>/ — twin/profile for a direct report."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def get(self, request, pk: int):
        role = get_user_role(request.user)
        if role == UserProfile.Role.EXECUTIVE:
            raise ApiError("privacy.executive_aggregates_only", status_code=403)
        if role not in (
            UserProfile.Role.MANAGER,
            UserProfile.Role.HR,
            UserProfile.Role.ADMIN,
        ):
            raise ApiError("auth.permission_denied", status_code=403)

        qs = employees_visible_to(request.user).select_related(
            "current", "team", "department", "manager"
        )
        try:
            emp = qs.get(pk=pk)
        except qs.model.DoesNotExist:
            raise ApiError("error.not_found", status_code=404) from None

        maybe_audit_profile_read(request, emp)
        from pulse.profile_payload import member_profile_payload

        return Response(member_profile_payload(emp))


class InterventionStubView(APIView):
    """POST stubs for Start Intervention / Simulate Impact (wired later in Step 8)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def post(self, request, pk: int):
        role = get_user_role(request.user)
        if role not in (
            UserProfile.Role.MANAGER,
            UserProfile.Role.HR,
            UserProfile.Role.ADMIN,
        ):
            raise ApiError("auth.permission_denied", status_code=403)
        action = request.data.get("action", "start")
        return Response(
            {
                "ok": True,
                "stub": True,
                "action": action,
                "employee_id": pk,
                "code": "interventions.stub_accepted",
            }
        )
