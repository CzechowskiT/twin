"""Celery application configuration."""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "twin",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Warsaw",
    enable_utc=True,
    imports=("app.tasks.scrape_tasks", "app.tasks.reminder_tasks", "app.tasks.placement_tasks"),
)


def apply_celery_runtime_config() -> None:
    """Re-read Settings (e.g. after get_settings.cache_clear) and sync Celery eager mode."""
    s = get_settings()
    celery_app.conf.task_always_eager = s.celery_task_always_eager


# In-process tasks (no Redis): set CELERY_TASK_ALWAYS_EAGER=true on the API when no worker service exists.
apply_celery_runtime_config()
celery_app.conf.task_eager_propagates = True


def _configure_beat_schedule() -> None:
    """Optional daily scrape-all when SCRAPE_BEAT_ENABLED=true; placement retention sweep by default."""
    from celery.schedules import crontab

    s = get_settings()
    schedule: dict[str, dict] = {}
    if s.scrape_beat_enabled:
        hour = min(23, max(0, int(s.scrape_beat_hour_utc)))
        schedule["scrape-all-boards-daily"] = {
            "task": "app.tasks.scrape_tasks.scrape_all_boards_task",
            "schedule": crontab(hour=hour, minute=12),
        }
    if s.placement_retention_beat_enabled:
        ph = min(23, max(0, int(s.placement_retention_beat_hour_utc)))
        schedule["placement-retention-sweep-daily"] = {
            "task": "app.tasks.placement_tasks.placement_retention_sweep",
            "schedule": crontab(hour=ph, minute=15),
        }
    celery_app.conf.beat_schedule = schedule


_configure_beat_schedule()
