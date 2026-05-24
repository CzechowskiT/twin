"""Application settings loaded from environment."""

from functools import lru_cache
import os
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root .env (make api runs from backend/, so plain ".env" would miss it)
_REPO_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _REPO_ROOT / ".env"

# Default dev secret — must not be used when environment is production/staging.
_DEV_SECRET_KEY = "dev-only-change-me"


def _strip_trailing_slash_url(url: str) -> str:
    """Railway UI often appends '/' to URL variables; browsers send Origin without it."""
    return url.strip().rstrip("/")


def _clean_redis_url(value: object) -> object:
    """Strip trailing `}` from malformed Railway template pastes (e.g. port `6379}}`)."""
    if not isinstance(value, str):
        return value
    v = value.strip()
    while v.endswith("}"):
        v = v[:-1]
    return v


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
    secret_key: str = _DEV_SECRET_KEY
    access_token_expire_minutes: int = 60 * 24 * 7
    # 0 = disabled (local only). Production should keep a positive cap to slow credential stuffing.
    auth_login_rate_limit_per_minute: int = 30
    # Separate bucket for POST /auth/forgot-password (abuse / enumeration). 0 = disabled.
    auth_forgot_password_rate_limit_per_minute: int = 3
    # POST /auth/reset-password — brute-force on reset tokens. 0 = disabled.
    auth_reset_password_rate_limit_per_minute: int = 3
    # Comma-separated user IDs allowed to trigger POST /jobs/scrape/* (empty = deny all).
    scrape_ops_user_ids: str = ""
    # Comma-separated emails (same allowlist; easier than looking up numeric IDs on Railway).
    scrape_ops_emails: str = ""
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

    @field_validator("redis_url", "celery_broker_url", "celery_result_backend", mode="before")
    @classmethod
    def clean_redis_urls(cls, value: object) -> object:
        return _clean_redis_url(value)
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

    @model_validator(mode="after")
    def reject_insecure_production_secrets(self) -> "Settings":
        """Fail fast at startup when production/staging still uses the dev JWT secret."""
        env = (self.environment or "").strip().lower()
        if env not in ("production", "staging"):
            return self
        key = (self.secret_key or "").strip()
        if key == _DEV_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set to a unique random value in production/staging (not the dev default)."
            )
        if len(key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production/staging.")
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
    # Set SCRAPE_WORKER_READY=true on API when a separate Celery worker service is deployed (non-eager mode).
    scrape_worker_ready: bool = False
    # Daily placement retention sweep on Celery beat (log-only MVP; see placement_tasks).
    placement_retention_beat_enabled: bool = True
    placement_retention_beat_hour_utc: int = 6
    # Hourly sweep: email users ~24h before scheduled interviews (when mail + prefs allow).
    interview_reminder_beat_enabled: bool = True
    interview_reminder_hours_before: int = 24
    # Max jobs considered per find_top_matches scan (newest validated first).
    match_jobs_scan_limit: int = 4000
    # When true, use ``job_matching_v2`` (salary overlap bonus on top of v1 rules).
    match_scoring_v2: bool = False
    # When true (env MATCHING_V2_TFIDF), add a bounded TF–IDF cosine layer on top of v1 or v2 (see matching_service).
    matching_v2_tfidf: bool = False
    # When true, honour robots.txt before Playwright fetches (LinkedIn uses Disallow: / for generic bots).
    scrape_respect_robots_txt: bool = True
    # Pause between boards in scrape-all (serial) to reduce burst traffic on third-party sites.
    scrape_between_boards_sec: float = 1.5
    # --- Ops note (job corpus scale): tens or hundreds of thousands of validated rows are built by sustained
    # Celery ingestion (beat + workers), not one-off migrations. Tune scrape_jobs_per_board,
    # scrape_between_boards_sec, scrape_post_fetch_delay_sec, and match_jobs_scan_limit for polite traffic.
    # scrape_respect_robots_txt defaults true; ignoring ToS/robots risks blocks and legal exposure.
    # Optional extra delay after each fetch_html session (0 = off).
    scrape_post_fetch_delay_sec: float = 0.0
    intro_audio_upload_dir: str = "data/intro_audio"
    intro_audio_max_bytes: int = 15 * 1024 * 1024

    # User-owned attachments on Profile (certificates, portfolio exports, etc.) — not parsed for matching.
    profile_documents_upload_dir: str = "data/profile_documents"
    profile_document_max_bytes: int = 15 * 1024 * 1024
    profile_documents_max_per_user: int = 25

    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/api/v1/auth/linkedin/callback"
    # Jobs search (Playwright scrape — not OAuth). Optional geoId sharpens location (e.g. 105072130 = Poland).
    linkedin_jobs_geo_id: str = ""
    # Set false locally to debug auth walls (slower; not for production automation).
    linkedin_jobs_browser_headless: bool = True
    frontend_url: str = "http://localhost:3000"
    # Public API base URL (Railway domain) — used for WebCal subscribe links and OAuth callbacks docs.
    api_url: str = "http://localhost:8000"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    # Separate OAuth redirect for Calendar scopes (add this exact URI in Google Cloud Console).
    google_calendar_redirect_uri: str = "http://localhost:8000/api/v1/calendar/google/callback"

    # Microsoft Entra (Azure app registration) — sign-in + calendar share client id/secret.
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_redirect_uri: str = "http://localhost:8000/api/v1/auth/microsoft/callback"
    microsoft_calendar_redirect_uri: str = "http://localhost:8000/api/v1/calendar/microsoft/callback"
    microsoft_tenant: str = "common"

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

    @field_validator("frontend_url", "api_url", mode="before")
    @classmethod
    def normalize_frontend_url(cls, value: object) -> object:
        if isinstance(value, str) and value.strip():
            return _strip_trailing_slash_url(value)
        return value

    @field_validator(
        "google_calendar_redirect_uri",
        "google_redirect_uri",
        "github_redirect_uri",
        "apple_redirect_uri",
        "microsoft_calendar_redirect_uri",
        "microsoft_redirect_uri",
        mode="before",
    )
    @classmethod
    def normalize_oauth_redirect_uri(cls, value: object) -> object:
        if isinstance(value, str) and value.strip():
            return _strip_trailing_slash_url(value)
        return value

    @model_validator(mode="after")
    def resolve_oauth_redirect_uris(self) -> "Settings":
        """Derive OAuth callbacks from API_URL when env vars are unset (never FRONTEND_URL)."""
        from app.services.auth_oauth_redirect import (
            effective_apple_redirect_uri,
            effective_github_redirect_uri,
            effective_google_redirect_uri,
        )
        from app.services.calendar_oauth_redirect import effective_google_calendar_redirect_uri
        from app.services.calendar_oauth_redirect import (
            effective_microsoft_calendar_redirect_uri,
        )
        from app.services.microsoft_oauth import effective_microsoft_redirect_uri

        self.google_redirect_uri = effective_google_redirect_uri(self)
        self.github_redirect_uri = effective_github_redirect_uri(self)
        self.apple_redirect_uri = effective_apple_redirect_uri(self)
        self.google_calendar_redirect_uri = effective_google_calendar_redirect_uri(self)
        self.microsoft_calendar_redirect_uri = effective_microsoft_calendar_redirect_uri(self)
        self.microsoft_redirect_uri = effective_microsoft_redirect_uri(self)
        return self

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
    # When true, POST /applications/auto-apply returns 403 on Free tier. Default false for demos / investors.
    auto_apply_require_premium: bool = False

    debug: bool = False

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    resend_api_key: str = ""
    mail_from: str = ""

    password_reset_token_ttl_minutes: int = 60
    email_verification_token_ttl_minutes: int = 60 * 24

    # Stripe (https://dashboard.stripe.com/) — Checkout enables card + Apple Pay + Google Pay where supported
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_standby: str = Field(
        default="",
        validation_alias=AliasChoices("STRIPE_PRICE_ID_STANDBY", "STRIPE_PRICE_STANDBY"),
    )
    stripe_price_id_standard: str = Field(
        default="",
        validation_alias=AliasChoices("STRIPE_PRICE_ID_STANDARD", "STRIPE_PRICE_STANDARD"),
    )
    stripe_price_id_premium: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_premium_annual: str = ""
    stripe_price_id_pro_annual: str = ""
    # Comma-separated Stripe Checkout `payment_method_types` for subscriptions (e.g. card,link).
    # `card` includes Apple Pay / Google Pay where Stripe presents wallets; `link` enables Link.
    # Invalid entries are ignored; see docs/STRIPE.md.
    stripe_checkout_payment_method_types: str = "card,link"

    # Greenhouse ATS webhooks — optional shared secret for signature checks.
    greenhouse_webhook_secret: str = ""
    # Greenhouse Harvest partner OAuth (authorization code grant).
    greenhouse_client_id: str = ""
    greenhouse_client_secret: str = ""
    greenhouse_oauth_redirect_uri: str = ""
    greenhouse_oauth_scopes: str = ""
    lever_webhook_secret: str = ""
    lever_client_id: str = ""
    lever_client_secret: str = ""
    lever_oauth_redirect_uri: str = ""
    ashby_webhook_secret: str = ""

    # S3-compatible storage (AWS S3, Cloudflare R2, MinIO). Empty keys = disabled.
    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket_name: str = ""
    s3_region: str = "auto"
    # Local filesystem store when S3_* is unset (dev / air-gapped).
    data_room_local_upload_dir: str = "data/data_room_uploads"
    data_room_local_upload_enabled: bool = True

    # Authologic Customer API (KYC / identity) — https://developer.authologic.com
    authologic_api_base_url: str = ""
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
    # Ops dashboards (/admin/data-quality, /admin/metrics); falls back to beta_admin_token when empty.
    ops_admin_token: str = ""
    weekly_digest_beat_enabled: bool = True
    weekly_digest_beat_hour_utc: int = 8
    weekly_digest_beat_weekday: int = 1
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

    # Auto-apply guards (0 = disabled for numeric caps).
    auto_apply_daily_max_per_user: int = 0
    auto_apply_company_cooldown_hours: int = 0
    auto_apply_company_blocklist: str = ""
    auto_apply_title_blocklist: str = ""
    # Redis-backed per-minute cap per user (0 = off). Uses `redis_url`.
    auto_apply_rate_limit_per_minute: int = 0
    # When true, client must send human_acknowledged=true on auto-apply requests.
    auto_apply_require_human_ack: bool = False

    # Nightly autonomous apply (Celery beat; requires worker + Redis).
    nightly_auto_apply_beat_enabled: bool = True
    nightly_auto_apply_hour: int = 2
    nightly_auto_apply_minute: int = 0
    nightly_auto_apply_default_min_score: float = 90.0
    nightly_auto_apply_default_daily_limit: int = 10
    nightly_auto_apply_cooldown_seconds: int = 30
    nightly_auto_apply_supported_boards: str = "pracuj,pracuj.pl"

    # Outbound webhook after auto-apply (HMAC optional; empty URL disables).
    employer_webhook_url: str = ""
    employer_webhook_secret: str = ""

    # Partner / ATS export (Bearer-style token via X-Twin-Partner-Token header).
    partner_export_token: str = ""

    # Investor demo: public GET /api/v1/demo/snapshot (read-only; default off in production).
    demo_mode_enabled: bool = False
    demo_user_email: str = "demo@twin.career"

    # Recruiter batch inbox pilot (X-Twin-Recruiter-Token + company_slug filter).
    recruiter_inbox_token: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o for o in (x.strip() for x in self.cors_origins.split(",")) if o]


@lru_cache
def get_settings() -> Settings:
    return Settings()
