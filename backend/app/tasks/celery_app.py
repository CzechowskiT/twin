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

# No periodic scraping — run from dashboard or POST /jobs/scrape/... when you want data.
celery_app.conf.beat_schedule = {}
