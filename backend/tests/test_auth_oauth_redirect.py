"""Web sign-in OAuth redirect URI resolution (redirect_uri_mismatch prevention)."""

from urllib.parse import parse_qs, urlparse

from app.config import Settings, get_settings
from app.services.auth_oauth_redirect import (
    effective_apple_redirect_uri,
    effective_github_redirect_uri,
    effective_google_redirect_uri,
)
from app.services.google_oauth import build_google_authorize_url


def test_google_auth_redirect_from_api_url_when_env_unset(monkeypatch) -> None:
    monkeypatch.delenv("GOOGLE_REDIRECT_URI", raising=False)
    monkeypatch.setenv("API_URL", "https://twin-production-bcd9.up.railway.app")
    get_settings.cache_clear()
    try:
        s = Settings()
        uri = effective_google_redirect_uri(s)
        assert uri == "https://twin-production-bcd9.up.railway.app/api/v1/auth/google/callback"
        assert uri.endswith("/callback")
        assert not uri.endswith("/callback/")
    finally:
        get_settings.cache_clear()


def test_github_auth_redirect_from_api_url_when_env_unset(monkeypatch) -> None:
    monkeypatch.delenv("GITHUB_REDIRECT_URI", raising=False)
    monkeypatch.setenv("API_URL", "https://twin-production-bcd9.up.railway.app")
    get_settings.cache_clear()
    try:
        uri = effective_github_redirect_uri(Settings())
        assert uri == "https://twin-production-bcd9.up.railway.app/api/v1/auth/github/callback"
    finally:
        get_settings.cache_clear()


def test_apple_auth_redirect_from_api_url_when_env_unset(monkeypatch) -> None:
    monkeypatch.delenv("APPLE_REDIRECT_URI", raising=False)
    monkeypatch.setenv("API_URL", "https://twin-production-bcd9.up.railway.app")
    get_settings.cache_clear()
    try:
        uri = effective_apple_redirect_uri(Settings())
        assert uri == "https://twin-production-bcd9.up.railway.app/api/v1/auth/apple/callback"
    finally:
        get_settings.cache_clear()


def test_google_auth_redirect_strips_trailing_slash(monkeypatch) -> None:
    monkeypatch.setenv(
        "GOOGLE_REDIRECT_URI",
        "https://twin-production-bcd9.up.railway.app/api/v1/auth/google/callback/",
    )
    monkeypatch.setenv("API_URL", "https://twin-production-bcd9.up.railway.app")
    get_settings.cache_clear()
    try:
        uri = effective_google_redirect_uri(Settings())
        assert uri == "https://twin-production-bcd9.up.railway.app/api/v1/auth/google/callback"
    finally:
        get_settings.cache_clear()


def test_google_authorize_url_uses_resolved_redirect(monkeypatch) -> None:
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.delenv("GOOGLE_REDIRECT_URI", raising=False)
    monkeypatch.setenv("API_URL", "https://api.example.com")
    get_settings.cache_clear()
    try:
        url = build_google_authorize_url("state-xyz")
        qs = parse_qs(urlparse(url).query)
        assert qs["redirect_uri"] == ["https://api.example.com/api/v1/auth/google/callback"]
    finally:
        get_settings.cache_clear()
