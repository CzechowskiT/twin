"""Beat schedule includes autonomous market scrape windows."""

from app.config import Settings, get_settings
from app.tasks.celery_app import celery_app, _configure_beat_schedule


def test_market_scrape_beat_entries_when_enabled(monkeypatch) -> None:
    monkeypatch.setenv("SCRAPE_BEAT_ENABLED", "true")
    monkeypatch.setenv("SCRAPE_BEAT_LEGACY_SCRAPE_ALL", "false")
    get_settings.cache_clear()
    _configure_beat_schedule()
    schedule = celery_app.conf.beat_schedule or {}
    assert "market-scrape-pl-daily" in schedule
    assert "market-scrape-greenhouse-daily" in schedule
    assert "market-scrape-global-html" in schedule
    assert "market-scrape-linkedin-daily" in schedule
    assert schedule["market-scrape-pl-daily"]["task"].endswith("daily_pl_market_scrape_task")
    get_settings.cache_clear()


def test_legacy_scrape_all_optional(monkeypatch) -> None:
    monkeypatch.setenv("SCRAPE_BEAT_ENABLED", "true")
    monkeypatch.setenv("SCRAPE_BEAT_LEGACY_SCRAPE_ALL", "true")
    get_settings.cache_clear()
    _configure_beat_schedule()
    schedule = celery_app.conf.beat_schedule or {}
    assert "scrape-all-boards-daily-legacy" in schedule
    get_settings.cache_clear()


def test_default_pl_beat_hour_is_four_utc() -> None:
    s = Settings()
    assert s.scrape_beat_pl_hour_utc == 4
