"""Role helpers and DRF permission classes for EMPULSE privacy rules."""

from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import UserProfile


def get_user_profile(user) -> UserProfile | None:
    if user is None or not user.is_authenticated:
        return None
    try:
        return user.profile
    except UserProfile.DoesNotExist:
        return None


def get_user_role(user) -> str | None:
    profile = get_user_profile(user)
    return profile.role if profile else None


def get_user_employee(user):
    profile = get_user_profile(user)
    return profile.employee if profile else None


class IsAuthenticatedWithProfile(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and get_user_profile(request.user) is not None
        )


class DenyExecutiveIndividualAccess(BasePermission):
    """Executives may only use aggregate endpoints — never individual records."""

    message = "privacy.executive_aggregates_only"

    def has_permission(self, request, view) -> bool:
        role = get_user_role(request.user)
        if role == UserProfile.Role.EXECUTIVE:
            # Views opt in via `executive_allowed = True` (aggregates).
            if getattr(view, "executive_allowed", False):
                return True
            return False
        return True

    def has_object_permission(self, request, view, obj) -> bool:
        return self.has_permission(request, view)


class IsHROrAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return get_user_role(request.user) in (
            UserProfile.Role.HR,
            UserProfile.Role.ADMIN,
        )


class IsManagerOrAbove(BasePermission):
    def has_permission(self, request, view) -> bool:
        return get_user_role(request.user) in (
            UserProfile.Role.MANAGER,
            UserProfile.Role.HR,
            UserProfile.Role.ADMIN,
            UserProfile.Role.EXECUTIVE,
        )


class ReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        return request.method in SAFE_METHODS
