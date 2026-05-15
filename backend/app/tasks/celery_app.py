"""Celery application configuration."""

from celery import Celery
from celery.schedules import crontab

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
celery_app.conf.beat_schedule = {
    "scrape-pracuj-daily": {
        "task": "app.tasks.scrape_tasks.scrape_pracuj_task",
        "schedule": crontab(hour=6, minute=0),
    },
    "scrape-rocketjobs-daily": {
        "task": "app.tasks.scrape_tasks.scrape_rocketjobs_task",
        "schedule": crontab(hour=6, minute=30),
    },
}
