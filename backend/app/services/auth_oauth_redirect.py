"""Resolve web sign-in OAuth redirect URIs (must match provider console exactly)."""

from __future__ import annotations

import os

from app.config import Settings, _strip_trailing_slash_url

_GOOGLE_CALLBACK_PATH = "/api/v1/auth/google/callback"
_GITHUB_CALLBACK_PATH = "/api/v1/auth/github/callback"
_APPLE_CALLBACK_PATH = "/api/v1/auth/apple/callback"
_DEFAULT_API_BASE = "http://localhost:8000"


def _api_base(settings: Settings) -> str:
    return (settings.api_url or _DEFAULT_API_BASE).strip().rstrip("/") or _DEFAULT_API_BASE


def _explicit_env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def effective_google_redirect_uri(settings: Settings) -> str:
    """GOOGLE_REDIRECT_URI when set; otherwise API_URL + auth callback path."""
    explicit = _explicit_env("GOOGLE_REDIRECT_URI")
    if explicit:
        return _strip_trailing_slash_url(explicit)
    return f"{_api_base(settings)}{_GOOGLE_CALLBACK_PATH}"


def effective_github_redirect_uri(settings: Settings) -> str:
    explicit = _explicit_env("GITHUB_REDIRECT_URI")
    if explicit:
        return _strip_trailing_slash_url(explicit)
    return f"{_api_base(settings)}{_GITHUB_CALLBACK_PATH}"


def effective_apple_redirect_uri(settings: Settings) -> str:
    explicit = _explicit_env("APPLE_REDIRECT_URI")
    if explicit:
        return _strip_trailing_slash_url(explicit)
    return f"{_api_base(settings)}{_APPLE_CALLBACK_PATH}"


def dev_auth_redirect_uri_hints() -> dict[str, list[str]]:
    return {
        "google": [
            f"{_DEFAULT_API_BASE}{_GOOGLE_CALLBACK_PATH}",
            f"http://localhost:3000{_GOOGLE_CALLBACK_PATH}",
        ],
        "github": [
            f"{_DEFAULT_API_BASE}{_GITHUB_CALLBACK_PATH}",
            f"http://localhost:3000{_GITHUB_CALLBACK_PATH}",
        ],
        "apple": [
            f"{_DEFAULT_API_BASE}{_APPLE_CALLBACK_PATH}",
            f"http://localhost:3000{_APPLE_CALLBACK_PATH}",
        ],
    }
