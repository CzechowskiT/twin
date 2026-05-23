"""Calendar OAuth redirect URI resolution (Google redirect_uri_mismatch prevention)."""

from urllib.parse import parse_qs, urlparse

import pytest

from app.config import Settings, get_settings
from app.services.calendar_oauth_redirect import (
    effective_google_calendar_redirect_uri,
    effective_microsoft_calendar_redirect_uri,
)
from app.services.google_calendar_oauth import build_google_calendar_authorize_url


def test_google_calendar_redirect_from_api_url_when_env_unset(monkeypatch) -> None:
    monkeypatch.delenv("GOOGLE_CALENDAR_REDIRECT_URI", raising=False)
    monkeypatch.setenv("API_URL", "https://twin-production-bcd9.up.railway.app")
    get_settings.cache_clear()
    try:
        s = Settings()
        uri = effective_google_calendar_redirect_uri(s)
        assert uri == "https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback"
        assert uri.endswith("/callback")
        assert not uri.endswith("/callback/")
    finally:
        get_settings.cache_clear()


def test_google_calendar_redirect_strips_trailing_slash(monkeypatch) -> None:
    monkeypatch.setenv(
        "GOOGLE_CALENDAR_REDIRECT_URI",
        "https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback/",
    )
    monkeypatch.setenv("API_URL", "https://twin-production-bcd9.up.railway.app")
    get_settings.cache_clear()
    try:
        uri = effective_google_calendar_redirect_uri(Settings())
        assert uri == "https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback"
    finally:
        get_settings.cache_clear()


def test_authorize_url_uses_resolved_redirect(monkeypatch) -> None:
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.delenv("GOOGLE_CALENDAR_REDIRECT_URI", raising=False)
    monkeypatch.setenv("API_URL", "https://api.example.com")
    get_settings.cache_clear()
    try:
        url = build_google_calendar_authorize_url("state-xyz")
        qs = parse_qs(urlparse(url).query)
        assert qs["redirect_uri"] == ["https://api.example.com/api/v1/calendar/google/callback"]
    finally:
        get_settings.cache_clear()


def test_microsoft_calendar_redirect_from_api_url(monkeypatch) -> None:
    monkeypatch.delenv("MICROSOFT_CALENDAR_REDIRECT_URI", raising=False)
    monkeypatch.setenv("API_URL", "https://api.example.com")
    get_settings.cache_clear()
    try:
        uri = effective_microsoft_calendar_redirect_uri(Settings())
        assert uri == "https://api.example.com/api/v1/calendar/microsoft/callback"
    finally:
        get_settings.cache_clear()


def test_calendar_oauth_config_endpoint() -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    c = TestClient(app)
    res = c.get("/api/v1/calendar/oauth-config")
    assert res.status_code == 200
    data = res.json()
    assert "google" in data and "redirect_uri" in data["google"]
    assert "microsoft" in data
    assert "dev_redirect_uris" in data
    assert "http://localhost:3000/api/v1/calendar/google/callback" in data["dev_redirect_uris"]["google"]
