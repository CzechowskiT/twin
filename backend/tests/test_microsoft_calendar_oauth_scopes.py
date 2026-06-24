"""Microsoft calendar OAuth scopes — read-only authorize URL and env override sanitization."""

from urllib.parse import parse_qs, urlparse

import pytest

from app.config import Settings
from app.services.microsoft_calendar_oauth import (
    FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS,
    MS_CALENDAR_SCOPES,
    build_microsoft_calendar_authorize_url,
    effective_microsoft_calendar_scopes,
    is_microsoft_calendar_oauth_configured,
    sanitize_microsoft_calendar_scopes,
)


@pytest.fixture(autouse=True)
def _microsoft_oauth_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("MICROSOFT_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv(
        "MICROSOFT_CALENDAR_REDIRECT_URI",
        "http://localhost:8000/api/v1/calendar/microsoft/callback",
    )
    from app.config import get_settings

    get_settings.cache_clear()


def test_default_scopes_are_read_only() -> None:
    assert MS_CALENDAR_SCOPES == "offline_access User.Read Calendars.Read"
    assert "Calendars.ReadWrite" not in MS_CALENDAR_SCOPES.split()


def test_sanitize_strips_forbidden_write_scopes() -> None:
    raw = "offline_access User.Read Calendars.ReadWrite Mail.Send"
    sanitized = sanitize_microsoft_calendar_scopes(raw)
    assert "Calendars.ReadWrite" not in sanitized.split()
    assert "Mail.Send" not in sanitized.split()
    assert "Calendars.Read" in sanitized.split()


def test_effective_scopes_rejects_env_write_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "MICROSOFT_CALENDAR_SCOPES",
        "offline_access User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite",
    )
    from app.config import get_settings

    get_settings.cache_clear()
    scopes = effective_microsoft_calendar_scopes(get_settings())
    for forbidden in FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS:
        assert forbidden not in scopes.split()
    assert "Calendars.Read" in scopes.split()


def test_authorize_url_contains_read_not_readwrite() -> None:
    assert is_microsoft_calendar_oauth_configured()
    url = build_microsoft_calendar_authorize_url("state-test")
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    scope = params["scope"][0]
    assert "Calendars.Read" in scope.split()
    assert "Calendars.ReadWrite" not in scope.split()
    assert scope == MS_CALENDAR_SCOPES


def test_empty_override_uses_default() -> None:
    settings = Settings(microsoft_calendar_scopes="")
    assert effective_microsoft_calendar_scopes(settings) == MS_CALENDAR_SCOPES
