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
    imports=("app.tasks.scrape_tasks",),
)
# In-process tasks (no Redis): set CELERY_TASK_ALWAYS_EAGER=true on the API when no worker service exists.
celery_app.conf.task_always_eager = settings.celery_task_always_eager
celery_app.conf.task_eager_propagates = True


def _configure_beat_schedule() -> None:
    """Optional daily scrape-all when SCRAPE_BEAT_ENABLED=true (run `celery -A app.tasks.celery_app beat`)."""
    from celery.schedules import crontab

    s = get_settings()
    if not s.scrape_beat_enabled:
        celery_app.conf.beat_schedule = {}
        return
    hour = min(23, max(0, int(s.scrape_beat_hour_utc)))
    celery_app.conf.beat_schedule = {
        "scrape-all-boards-daily": {
            "task": "app.tasks.scrape_tasks.scrape_all_boards_task",
            "schedule": crontab(hour=hour, minute=12),
        },
    }


_configure_beat_schedule()
