"""Scrape ops allowlist and worker readiness flags."""

from app.config import Settings
from app.core.scrape_ops import scrape_worker_ready


def test_scrape_worker_ready_when_eager() -> None:
    s = Settings(celery_task_always_eager=True, scrape_worker_ready=False)
    assert scrape_worker_ready(s) is True


def test_scrape_worker_ready_when_declared() -> None:
    s = Settings(celery_task_always_eager=False, scrape_worker_ready=True)
    assert scrape_worker_ready(s) is True


def test_scrape_worker_not_ready_without_eager_or_flag() -> None:
    s = Settings(celery_task_always_eager=False, scrape_worker_ready=False)
    assert scrape_worker_ready(s) is False
