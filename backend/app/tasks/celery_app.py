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
    imports=("app.tasks.scrape_tasks", "app.tasks.reminder_tasks"),
)


def apply_celery_runtime_config() -> None:
    """Re-read Settings (e.g. after get_settings.cache_clear) and sync Celery eager mode."""
    s = get_settings()
    celery_app.conf.task_always_eager = s.celery_task_always_eager


# In-process tasks (no Redis): set CELERY_TASK_ALWAYS_EAGER=true on the API when no worker service exists.
apply_celery_runtime_config()
celery_app.conf.task_eager_propagates = True


def _configure_beat_schedule() -> None:
    """Optional daily scrape-all when SCRAPE_BEAT_ENABLED=true (run `celery -A app.tasks.celery_app beat`).

    Interview reminder email (`app.tasks.reminder_tasks.send_interview_reminder_email`) is not on the
    default beat schedule: add an entry only after batching which interviews to nudge (args/kwargs).
    """
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
    # Example only — uncomment after wiring batch selection (never pass a stale hard-coded id):
    # celery_app.conf.beat_schedule["interview-reminder-email"] = {
    #     "task": "app.tasks.reminder_tasks.send_interview_reminder_email",
    #     "schedule": crontab(minute=30),
    #     "args": (0,),
    # }


_configure_beat_schedule()
