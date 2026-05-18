"""Celery scrape tasks return structured errors (no uncaught exceptions from scrapers)."""

from unittest.mock import patch

from app.tasks.scrape_tasks import scrape_pracuj_task


def test_pracuj_task_returns_error_dict_when_scraper_raises() -> None:
    with patch("app.tasks.scrape_tasks.pracuj.scrape_pracuj", side_effect=RuntimeError("playwright down")):
        out = scrape_pracuj_task.run()
    assert out["scraped"] == 0
    assert out["saved"] == 0
    assert "error" in out
    assert "playwright" in str(out["error"]).lower()
