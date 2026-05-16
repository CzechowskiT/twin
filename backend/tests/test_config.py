"""Settings helpers for cloud databases."""

from app.config import Settings, _normalize_postgres_url, get_settings


def test_normalize_railway_postgres_url() -> None:
    raw = "postgres://user:pass@host:5432/db"
    assert _normalize_postgres_url(raw) == "postgresql+psycopg://user:pass@host:5432/db"


def test_settings_accepts_postgres_scheme(monkeypatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://user:pass@host:5432/db",
    )
    get_settings.cache_clear()
    try:
        settings = Settings()
        assert settings.database_url.startswith("postgresql+psycopg://")
    finally:
        get_settings.cache_clear()


def test_settings_strips_trailing_slash_on_frontend_url(monkeypatch) -> None:
    monkeypatch.setenv("FRONTEND_URL", "https://app.vercel.app/")
    get_settings.cache_clear()
    try:
        assert Settings().frontend_url == "https://app.vercel.app"
    finally:
        get_settings.cache_clear()


def test_settings_normalizes_cors_origins_trailing_slashes(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "https://a.com/, https://b.com/")
    get_settings.cache_clear()
    try:
        s = Settings()
        assert s.cors_origins == "https://a.com,https://b.com"
        assert s.cors_origin_list == ["https://a.com", "https://b.com"]
    finally:
        get_settings.cache_clear()
