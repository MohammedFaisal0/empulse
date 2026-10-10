"""DRF exception handling that surfaces stable error codes for i18n."""

from __future__ import annotations

from typing import Any

from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler


class ApiError(APIException):
    """Raise with a stable ``code`` the frontend can translate."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "error.unknown"
    default_code = "error.unknown"

    def __init__(
        self,
        code: str,
        status_code: int | None = None,
        detail: str | None = None,
    ) -> None:
        self.default_code = code
        self.detail = detail or code
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail=self.detail, code=code)


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return str(value)


def _code_from_exception(exc: Exception) -> str:
    if isinstance(exc, ApiError):
        return str(exc.default_code)

    detail_text = _as_text(getattr(exc, "detail", None))
    if (
        detail_text
        and "." in detail_text
        and " " not in detail_text
        and not detail_text.endswith(".")
    ):
        return detail_text

    default_code = getattr(exc, "default_code", None)
    if isinstance(default_code, str) and "." in default_code:
        return default_code

    if isinstance(exc, (AuthenticationFailed,)):
        return "auth.invalid_credentials"
    if isinstance(exc, NotAuthenticated):
        return "auth.not_authenticated"
    if isinstance(exc, PermissionDenied):
        return "auth.permission_denied"
    if isinstance(exc, (NotFound, Http404)):
        return "error.not_found"

    status_code = getattr(exc, "status_code", None)
    if status_code == status.HTTP_403_FORBIDDEN:
        return "auth.permission_denied"
    if status_code == status.HTTP_404_NOT_FOUND:
        return "error.not_found"
    if status_code == status.HTTP_401_UNAUTHORIZED:
        return "auth.not_authenticated"

    if isinstance(default_code, str):
        return f"error.{default_code}"
    return "error.unknown"


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None

    code = _code_from_exception(exc)
    if code == "error.unknown":
        if response.status_code == status.HTTP_404_NOT_FOUND:
            code = "error.not_found"
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            code = "auth.permission_denied"
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            code = "auth.not_authenticated"

    # ValidationError detail is a dict/list — keep fields, add code.
    if isinstance(response.data, dict) and any(
        key not in ("detail", "code") for key in response.data
    ):
        payload: dict[str, Any] = {"code": "error.validation"}
        payload.update(response.data)
        response.data = payload
        return response

    response.data = {"code": code}
    return response
