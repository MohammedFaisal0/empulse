"""Privacy queryset filters and HR audit logging for employee records."""

from __future__ import annotations

from django.db.models import QuerySet

from accounts.models import AuditLog, UserProfile
from accounts.permissions import get_user_employee, get_user_role
from org.models import Employee


def employees_visible_to(user) -> QuerySet[Employee]:
    """
    Role-scoped employee queryset.
    - employee: own record only
    - manager: direct reports only
    - hr / admin: all
    - executive: none (aggregates only)
    """
    qs = Employee.objects.select_related("team", "department", "manager")
    role = get_user_role(user)

    if role is None:
        return qs.none()

    if role == UserProfile.Role.EMPLOYEE:
        employee = get_user_employee(user)
        if employee is None:
            return qs.none()
        return qs.filter(pk=employee.pk)

    if role == UserProfile.Role.MANAGER:
        employee = get_user_employee(user)
        if employee is None:
            return qs.none()
        return qs.filter(manager_id=employee.pk)

    if role in (UserProfile.Role.HR, UserProfile.Role.ADMIN):
        return qs.all()

    if role == UserProfile.Role.EXECUTIVE:
        return qs.none()

    return qs.none()


def log_employee_profile_read(*, actor, employee: Employee, path: str = "") -> AuditLog:
    return AuditLog.objects.create(
        actor=actor,
        action=AuditLog.Action.EMPLOYEE_PROFILE_READ,
        employee=employee,
        path=path,
        metadata={
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
        },
    )


def maybe_audit_profile_read(request, employee: Employee) -> None:
    """HR and admin individual profile reads must be audited."""
    role = get_user_role(request.user)
    if role in (UserProfile.Role.HR, UserProfile.Role.ADMIN):
        log_employee_profile_read(
            actor=request.user,
            employee=employee,
            path=request.path,
        )


def log_directory_export(*, actor, path: str = "", metadata: dict | None = None) -> AuditLog:
    return AuditLog.objects.create(
        actor=actor,
        action=AuditLog.Action.EXPORT,
        employee=None,
        path=path,
        metadata=metadata or {},
    )


def user_can_access_aggregates(user) -> bool:
    role = get_user_role(user)
    return role in (
        UserProfile.Role.MANAGER,
        UserProfile.Role.HR,
        UserProfile.Role.EXECUTIVE,
        UserProfile.Role.ADMIN,
    )


def assert_not_executive_individual(user) -> None:
    from rest_framework import status

    from accounts.exceptions import ApiError

    if get_user_role(user) == UserProfile.Role.EXECUTIVE:
        raise ApiError(
            "privacy.executive_aggregates_only",
            status_code=status.HTTP_403_FORBIDDEN,
        )
