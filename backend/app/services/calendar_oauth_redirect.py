"""Resolve calendar OAuth redirect URIs (must match Google/Azure console exactly)."""

from __future__ import annotations

import os

from app.config import Settings, _strip_trailing_slash_url

_GOOGLE_CALENDAR_CALLBACK_PATH = "/api/v1/calendar/google/callback"
_MICROSOFT_CALENDAR_CALLBACK_PATH = "/api/v1/calendar/microsoft/callback"
_DEFAULT_API_BASE = "http://localhost:8000"


def _api_base(settings: Settings) -> str:
    return (settings.api_url or _DEFAULT_API_BASE).strip().rstrip("/") or _DEFAULT_API_BASE


def _explicit_env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def effective_google_calendar_redirect_uri(settings: Settings) -> str:
    """
    GOOGLE_CALENDAR_REDIRECT_URI when set; otherwise API_URL + calendar callback path.
    Never FRONTEND_URL — Google redirects to the API host.
    """
    explicit = _explicit_env("GOOGLE_CALENDAR_REDIRECT_URI")
    if explicit:
        return _strip_trailing_slash_url(explicit)
    return f"{_api_base(settings)}{_GOOGLE_CALENDAR_CALLBACK_PATH}"


def effective_microsoft_calendar_redirect_uri(settings: Settings) -> str:
    explicit = _explicit_env("MICROSOFT_CALENDAR_REDIRECT_URI")
    if explicit:
        return _strip_trailing_slash_url(explicit)
    return f"{_api_base(settings)}{_MICROSOFT_CALENDAR_CALLBACK_PATH}"


def dev_calendar_redirect_uri_hints() -> dict[str, list[str]]:
    """URIs to whitelist when testing locally (direct API vs Next.js proxy)."""
    return {
        "google": [
            f"{_DEFAULT_API_BASE}{_GOOGLE_CALENDAR_CALLBACK_PATH}",
            f"http://localhost:3000{_GOOGLE_CALENDAR_CALLBACK_PATH}",
        ],
        "microsoft": [
            f"{_DEFAULT_API_BASE}{_MICROSOFT_CALENDAR_CALLBACK_PATH}",
            f"http://localhost:3000{_MICROSOFT_CALENDAR_CALLBACK_PATH}",
        ],
    }
