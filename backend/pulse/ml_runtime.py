"""Load EMPULSE ML bundles once at process startup — never retrain in requests."""

from __future__ import annotations

import logging
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)


def _ensure_ml_on_path() -> Path:
    ml_dir = Path(getattr(settings, "ML_DIR", ""))
    if not ml_dir.is_dir():
        raise RuntimeError(f"ML_DIR is not a directory: {ml_dir}")
    path_str = str(ml_dir.resolve())
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
    return ml_dir


@lru_cache(maxsize=1)
def get_empulse_ml():
    """Import empulse_ml after ML_DIR is on sys.path."""
    _ensure_ml_on_path()
    import empulse_ml  # noqa: WPS433 — path set above

    return empulse_ml


@lru_cache(maxsize=1)
def get_bundles() -> tuple[dict[str, Any], dict[str, Any]]:
    """Return (burnout_bundle, attrition_bundle), loaded once."""
    E = get_empulse_ml()
    # Point MODELS_DIR at settings in case the module was imported elsewhere.
    models_dir = Path(settings.ML_DIR) / "models"
    E.MODELS_DIR = models_dir
    burnout = E.load_bundle("burnout")
    attrition = E.load_bundle("attrition")
    logger.info(
        "Loaded EMPULSE ML bundles from %s (burnout features=%s)",
        models_dir,
        len(burnout.get("features", [])),
    )
    return burnout, attrition


def warm_ml_cache() -> None:
    """Call from AppConfig.ready() so first request is fast."""
    try:
        get_bundles()
    except Exception:  # pragma: no cover — log and let first request surface
        logger.exception("Failed to warm ML model cache")
