"""Celery beat schedule wiring."""

from app.config import get_settings
from app.tasks.celery_app import celery_app


def test_placement_retention_on_beat_by_default(monkeypatch) -> None:
    monkeypatch.setenv("PLACEMENT_RETENTION_BEAT_ENABLED", "true")
    monkeypatch.setenv("SCRAPE_BEAT_ENABLED", "false")
    get_settings.cache_clear()
    try:
        from app.tasks import celery_app as mod

        mod._configure_beat_schedule()
        schedule = celery_app.conf.beat_schedule
        assert "placement-retention-sweep-daily" in schedule
        assert schedule["placement-retention-sweep-daily"]["task"] == (
            "app.tasks.placement_tasks.placement_retention_sweep"
        )
    finally:
        get_settings.cache_clear()
        from app.tasks import celery_app as mod

        mod._configure_beat_schedule()
