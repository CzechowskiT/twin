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


def test_railway_solo_infer_celery_eager(monkeypatch) -> None:
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.delenv("CELERY_BROKER_URL", raising=False)
    monkeypatch.delenv("CELERY_TASK_ALWAYS_EAGER", raising=False)
    get_settings.cache_clear()
    try:
        assert Settings().celery_task_always_eager is True
    finally:
        get_settings.cache_clear()


def test_explicit_celery_eager_false_not_overridden(monkeypatch) -> None:
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.delenv("CELERY_BROKER_URL", raising=False)
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "0")
    get_settings.cache_clear()
    try:
        assert Settings().celery_task_always_eager is False
    finally:
        get_settings.cache_clear()


def test_matching_v2_tfidf_flag_from_env(monkeypatch) -> None:
    monkeypatch.setenv("MATCHING_V2_TFIDF", "true")
    get_settings.cache_clear()
    try:
        assert Settings().matching_v2_tfidf is True
    finally:
        get_settings.cache_clear()


def test_redis_url_prevents_railway_eager_infer(monkeypatch) -> None:
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/0")
    monkeypatch.delenv("CELERY_TASK_ALWAYS_EAGER", raising=False)
    get_settings.cache_clear()
    try:
        assert Settings().celery_task_always_eager is False
    finally:
        get_settings.cache_clear()
