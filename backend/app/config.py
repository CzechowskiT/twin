"""Application settings loaded from environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for API, DB, Celery, and third-party services."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+psycopg://twin:twin@localhost:5433/twin_dev"
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

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
