from django.apps import AppConfig


class PulseConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "pulse"

    def ready(self) -> None:
        # Warm ML bundles once at startup (skip during migrate/collectstatic if broken).
        import os

        if os.environ.get("SKIP_ML_WARM", "").lower() in ("1", "true", "yes"):
            return
        # Avoid double-ready under autoreload parent process.
        if os.environ.get("RUN_MAIN") == "false":
            return
        try:
            from pulse.ml_runtime import warm_ml_cache

            warm_ml_cache()
        except Exception:
            # First simulate request will raise with a clear error if models missing.
            pass
