"""Thin role-scoped PulseAI HTTP endpoints — all call the shared engine."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import ApiError
from accounts.models import UserProfile
from accounts.permissions import get_user_role
from pulseai.engine import ask


def _require_roles(user, *roles: str) -> str:
    role = get_user_role(user)
    if role not in roles:
        raise ApiError("auth.permission_denied", status_code=403)
    return role


class MePulseAIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["me"])
    def post(self, request):
        _require_roles(request.user, UserProfile.Role.EMPLOYEE)
        return Response(
            ask(
                request.user,
                str(request.data.get("question") or ""),
                path=request.path,
                confirm_intervention=bool(request.data.get("confirm_intervention")),
                intervention_draft=request.data.get("intervention") or None,
            )
        )


class ManagerPulseAIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["manager"])
    def post(self, request):
        _require_roles(
            request.user,
            UserProfile.Role.MANAGER,
            UserProfile.Role.HR,
            UserProfile.Role.ADMIN,
        )
        return Response(
            ask(
                request.user,
                str(request.data.get("question") or ""),
                path=request.path,
                confirm_intervention=bool(request.data.get("confirm_intervention")),
                intervention_draft=request.data.get("intervention") or None,
            )
        )


class HrPulseAIView(APIView):
    permission_classes = [IsAuthenticated]
    executive_allowed = True

    @extend_schema(tags=["hr"])
    def post(self, request):
        _require_roles(
            request.user,
            UserProfile.Role.HR,
            UserProfile.Role.EXECUTIVE,
            UserProfile.Role.ADMIN,
        )
        return Response(
            ask(
                request.user,
                str(request.data.get("question") or ""),
                path=request.path,
                confirm_intervention=bool(request.data.get("confirm_intervention")),
                intervention_draft=request.data.get("intervention") or None,
            )
        )
