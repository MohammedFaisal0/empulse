"""In-memory TTL cache for heavy HR aggregate payloads (60s default)."""

from __future__ import annotations

import time
from typing import Any, Callable, TypeVar

T = TypeVar("T")

_STORE: dict[str, tuple[float, Any]] = {}
DEFAULT_TTL = 60.0


def cached_aggregate(
    key: str,
    builder: Callable[[], T],
    ttl: float = DEFAULT_TTL,
) -> T:
    """Return cached value for *key* if fresh; otherwise build and store."""
    now = time.monotonic()
    hit = _STORE.get(key)
    if hit is not None and hit[0] > now:
        return hit[1]  # type: ignore[no-any-return]
    value = builder()
    _STORE[key] = (now + ttl, value)
    return value


def clear_agg_cache() -> None:
    """Drop all cached aggregates (tests / admin)."""
    _STORE.clear()
