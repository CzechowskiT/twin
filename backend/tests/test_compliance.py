"""Tests for scraper compliance helpers (User-Agent, settings wiring)."""

from app.config import get_settings
from app.scrapers.compliance import get_scrape_user_agent


def test_scrape_user_agent_identifies_twin() -> None:
    get_settings.cache_clear()
    ua = get_scrape_user_agent()
    assert "TWIN-CareerAgent" in ua
    assert "/privacy" in ua
    assert "Chrome/" in ua


def test_scrape_user_agent_uses_frontend_url(monkeypatch) -> None:
    monkeypatch.setenv("FRONTEND_URL", "https://example.com")
    get_settings.cache_clear()
    try:
        ua = get_scrape_user_agent()
        assert "https://example.com/privacy" in ua
    finally:
        get_settings.cache_clear()
