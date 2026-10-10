"""Aggregate helpers that enforce the small-group suppression rule."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any, TypeVar

MIN_GROUP_SIZE = 5

T = TypeVar("T")


def is_suppressed(count: int, *, min_size: int = MIN_GROUP_SIZE) -> bool:
    return count < min_size


def suppress_small_group(
    count: int,
    payload: dict[str, Any] | None = None,
    *,
    min_size: int = MIN_GROUP_SIZE,
) -> dict[str, Any]:
    """
    Return a suppressed marker when ``count`` is below the privacy threshold.

    Groups under 5 people are never shown in aggregates.
    """
    if is_suppressed(count, min_size=min_size):
        return {"suppressed": True}

    result: dict[str, Any] = {"suppressed": False, "n": count}
    if payload:
        result.update(payload)
    return result


def aggregate_or_suppress(
    items: Iterable[T] | int,
    compute: Callable[[list[T]], dict[str, Any]] | None = None,
    *,
    min_size: int = MIN_GROUP_SIZE,
) -> dict[str, Any]:
    """
    Compute an aggregate only when the group is large enough.

    ``items`` may be a countable iterable or a precomputed integer count
    (when ``compute`` is omitted and you only need the gate).
    """
    if isinstance(items, int):
        count = items
        if is_suppressed(count, min_size=min_size):
            return {"suppressed": True}
        payload = compute([]) if compute is not None else {}
        return suppress_small_group(count, payload, min_size=min_size)

    materialised = list(items)
    count = len(materialised)
    if is_suppressed(count, min_size=min_size):
        return {"suppressed": True}

    payload = compute(materialised) if compute is not None else {}
    return suppress_small_group(count, payload, min_size=min_size)
