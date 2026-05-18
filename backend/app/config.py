"""Application settings loaded from environment."""

from functools import lru_cache
import os
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root .env (make api runs from backend/, so plain ".env" would miss it)
_REPO_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _REPO_ROOT / ".env"


def _strip_trailing_slash_url(url: str) -> str:
    """Railway UI often appends '/' to URL variables; browsers send Origin without it."""
    return url.strip().rstrip("/")


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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: object) -> object:
        if not isinstance(value, str) or not value.strip():
            return value
        parts = [_strip_trailing_slash_url(p) for p in value.split(",")]
        return ",".join(p for p in parts if p)

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    # When true, Celery `.delay()` runs inside the API worker (no broker). Use on a single Railway
    # service without Redis/worker, or local dev; use Redis + separate worker for production scale.
    celery_task_always_eager: bool = False

    @model_validator(mode="after")
    def solo_railway_celery_eager(self) -> "Settings":
        """Railway one-off API: no Redis URL env vars → in-process Celery (mirrors start-api.sh)."""
        raw = os.getenv("CELERY_TASK_ALWAYS_EAGER")
        if raw is not None and str(raw).strip() != "":
            return self
        if os.getenv("RAILWAY_ENVIRONMENT") and not (
            (os.getenv("REDIS_URL") or "").strip() or (os.getenv("CELERY_BROKER_URL") or "").strip()
        ):
            self.celery_task_always_eager = True
        return self

    anthropic_api_key: str = ""
    cv_upload_dir: str = "data/cvs"
    cv_max_bytes: int = 5 * 1024 * 1024

    # Comma-separated board ids matching scraper registry (empty = all). Controls scrape-all + /jobs/boards list.
    scrape_enabled_board_ids: str = ""
    # Per-board fetch cap for Twin scrape-all (each adapter respects this upper bound).
    scrape_jobs_per_board: int = 100
    # When >0, skip persisting listings whose requirements+description are shorter (listing-only rows stay at 0).
    scrape_min_job_body_chars: int = 0
    # When true, Celery Beat runs scrape-all once per day at scrape_beat_hour_utc (requires celery beat process).
    scrape_beat_enabled: bool = False
    scrape_beat_hour_utc: int = 5
    # Max jobs considered per find_top_matches scan (newest validated first).
    match_jobs_scan_limit: int = 4000
    # When true, honour robots.txt before Playwright fetches (LinkedIn uses Disallow: / for generic bots).
    scrape_respect_robots_txt: bool = True
    # Pause between boards in scrape-all (serial) to reduce burst traffic on third-party sites.
    scrape_between_boards_sec: float = 1.5
    # Optional extra delay after each fetch_html session (0 = off).
    scrape_post_fetch_delay_sec: float = 0.0
    intro_audio_upload_dir: str = "data/intro_audio"
    intro_audio_max_bytes: int = 15 * 1024 * 1024

    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/api/v1/auth/linkedin/callback"
    # Jobs search (Playwright scrape — not OAuth). Optional geoId sharpens location (e.g. 105072130 = Poland).
    linkedin_jobs_geo_id: str = ""
    # Set false locally to debug auth walls (slower; not for production automation).
    linkedin_jobs_browser_headless: bool = True
    frontend_url: str = "http://localhost:3000"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    # Separate OAuth redirect for Calendar scopes (add this exact URI in Google Cloud Console).
    google_calendar_redirect_uri: str = "http://localhost:8000/api/v1/calendar/google/callback"

    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/api/v1/auth/github/callback"

    apple_client_id: str = ""
    apple_team_id: str = ""
    apple_key_id: str = ""
    apple_private_key: str = ""
    apple_redirect_uri: str = "http://localhost:8000/api/v1/auth/apple/callback"

    @field_validator("apple_private_key", mode="before")
    @classmethod
    def normalize_apple_private_key(cls, value: object) -> object:
        if isinstance(value, str) and "\\n" in value:
            return value.replace("\\n", "\n")
        return value

    @field_validator("frontend_url", mode="before")
    @classmethod
    def normalize_frontend_url(cls, value: object) -> object:
        if isinstance(value, str) and value.strip():
            return _strip_trailing_slash_url(value)
        return value

    auto_apply_headless: bool = False
    auto_apply_state_dir: str = "data/browser_state"
    auto_apply_default_phone: str = ""
    auto_apply_submit: bool = True
    # One PDF: tailored pitch + consent + verbatim CV text; attached instead of raw CV when possible.
    auto_apply_tailored_pdf: bool = True
    # Optional TTF with Polish glyphs (defaults to backend/assets/fonts/NotoSans-Regular.ttf).
    auto_apply_font_path: str = ""
    # Extra consent paragraphs (Polish), double-newline separated, appended after defaults.
    auto_apply_consent_extra_pl: str = ""

    debug: bool = False

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    resend_api_key: str = ""
    mail_from: str = ""

    password_reset_token_ttl_minutes: int = 60

    # Stripe (https://dashboard.stripe.com/) — Checkout enables card + Apple Pay + Google Pay where supported
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_premium: str = ""
    stripe_price_id_pro: str = ""
    # Comma-separated Stripe Checkout `payment_method_types` for subscriptions (e.g. card,link).
    # `card` includes Apple Pay / Google Pay where Stripe presents wallets; `link` enables Link.
    # Invalid entries are ignored; see docs/STRIPE.md.
    stripe_checkout_payment_method_types: str = "card,link"

    # Authologic Customer API (KYC / identity) — https://developer.authologic.com
    # Basic auth: OmniPanel login as user, API key as password (see OpenAPI securitySchemes).
    authologic_api_base_url: str = "https://sandbox.authologic.com"
    authologic_api_login: str = ""
    authologic_api_key: str = ""
    authologic_strategy: str = "public:default"
    # Optional: absolute public API URL (https://…) for server-side callbackUrl in CreateConversation.
    authologic_server_public_url: str = ""
    # When non-empty, GET/POST /kyc/authologic/callback must pass ?token= matching value (shared secret).
    authologic_callback_token: str = ""

    # Beta waitlist (public landing `/beta` — see `app/api/beta_waitlist.py`)
    beta_waitlist_cap: int = 1000
    beta_campaign_ends_at: str = ""
    beta_admin_token: str = ""
    beta_upload_dir: str = "data/beta_waitlist"
    beta_upload_max_bytes: int = 15 * 1024 * 1024

    # When false, /geo/jurisdiction-hint returns OTHER without outbound IP/geo calls (strict/air-gapped).
    geo_jurisdiction_lookup_enabled: bool = True

    # LinkedIn viral incentive (placement post bonus tiers; amounts in integer USD cents).
    # Ops can tune payouts without code changes by setting these env vars.
    linkedin_viral_base_tag_bonus_cents: int = 2500
    linkedin_viral_story_bonus_cents: int = 5000
    linkedin_viral_story_min_words: int = 150
    linkedin_viral_photo_bonus_cents: int = 2500
    linkedin_viral_video_bonus_cents: int = 10000
    linkedin_viral_per_signup_bonus_cents: int = 500

    # Account referral program (USD cents; paid out manually / via future Stripe Connect).
    referral_bonus_first_payment_cents: int = 1500
    referral_bonus_retained_3m_cents: int = 2500
    referral_bonus_hired_cents: int = 10000
    referral_milestone_10_cents: int = 10000
    referral_milestone_50_cents: int = 50000
    referral_milestone_100_cents: int = 150000

    @property
    def cors_origin_list(self) -> list[str]:
        return [o for o in (x.strip() for x in self.cors_origins.split(",")) if o]


@lru_cache
def get_settings() -> Settings:
    return Settings()
