"""Application settings loaded from environment."""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root .env (make api runs from backend/, so plain ".env" would miss it)
_REPO_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _REPO_ROOT / ".env"


def _normalize_postgres_url(url: str) -> str:
    """Railway/Render often provide postgres:// — SQLAlchemy needs psycopg driver."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


class Settings(BaseSettings):
    """Central configuration for API, DB, Celery, and third-party services."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else ".env",
        extra="ignore",
    )

    environment: str = "development"
    database_url: str = "postgresql+psycopg://twin:twin@localhost:5433/twin_dev"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if isinstance(value, str) and value:
            return _normalize_postgres_url(value)
        return value
    secret_key: str = "dev-only-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:3000"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    anthropic_api_key: str = ""
    cv_upload_dir: str = "data/cvs"
    cv_max_bytes: int = 5 * 1024 * 1024

    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/api/v1/auth/linkedin/callback"
    frontend_url: str = "http://localhost:3000"

    auto_apply_headless: bool = False
    auto_apply_state_dir: str = "data/browser_state"
    auto_apply_default_phone: str = ""
    auto_apply_submit: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
