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
