"""Public, non-PII payloads for landing and investor surfaces."""

from pydantic import BaseModel, Field


class MvpStatsOut(BaseModel):
    """Aggregate counters only — safe for public investor / traction strip."""

    validated_jobs: int = Field(
        ge=0,
        description=(
            "Validated jobs from Poland-first core sources (pracuj.pl, rocketjobs.pl, justjoin, praca.pl, "
            "indeed.pl, linkedin.com) — excludes bulk global boards so the figure tracks typical candidate use."
        ),
    )
    registered_users: int = Field(ge=0, description="User accounts (includes incomplete onboarding).")
    total_applications: int = Field(ge=0, description="Application rows across all candidates.")
    applications_created_in_twin: int = Field(
        ge=0,
        description="Applications recorded in TWIN (submission_status application_created_in_twin).",
    )
    applications_prepared: int = Field(
        ge=0,
        description="Package/form prepared in TWIN or portal without confirmed external submit.",
    )
    external_submit_attempted: int = Field(
        ge=0,
        description="Automated or assisted submit click without confirmation evidence.",
    )
    external_submit_confirmed: int = Field(
        ge=0,
        description="External submit with evidence (confirmation_type != none or proof fields).",
    )
    manual_action_required: int = Field(
        ge=0,
        description="User must finish apply on employer site (link open, CAPTCHA, unsupported board).",
    )
    submit_failed: int = Field(ge=0, description="external_submit_failed submission_status rows.")
    responses_received: int = Field(
        ge=0,
        description="Legacy pipeline: applications in applied status awaiting employer response.",
    )
    verified_placements: int = Field(
        ge=0,
        description="Applications with placement verified (HIRED + placement_verified_at).",
    )
    interviews_scheduled: int = Field(ge=0, description="Scheduled interview rows on calendars.")
    profiles_with_cv: int = Field(ge=0, description="Candidates who uploaded a CV at least once.")
    job_boards_in_registry: int = Field(ge=0, description="Board adapters in the current scrape registry order.")
    generated_at: str = Field(description="ISO-8601 UTC timestamp when counts were computed.")
    linkedin_oauth_configured: bool = Field(
        description="True when LinkedIn OIDC client id, secret, and redirect URI are configured on the API.",
    )
    stripe_checkout_ready: bool = Field(
        description="True when Stripe secret key and at least one subscription price id are configured.",
    )
    mail_configured: bool = Field(
        description="True when transactional email (Resend or SMTP) is wired on the API host.",
    )
    google_calendar_configured: bool = Field(
        description="True when Google Calendar OAuth client id, secret, and redirect URI are configured.",
    )
    microsoft_calendar_configured: bool = Field(
        description="True when Microsoft Calendar OAuth client id, secret, and redirect URI are configured.",
    )
    database_reachable: bool = Field(
        description="True when the API can run SELECT 1 against the configured database.",
    )
    data_room_s3_enabled: bool = Field(
        description="True when S3-compatible object storage is configured for data room blobs.",
    )
    data_room_local_demo: bool = Field(
        description="True when uploads use local API disk (no S3) — investor demo mode.",
    )
    paid_subscribers: int = Field(
        ge=0,
        description="Users with an entitled Stripe subscription status (active, trialing, past_due).",
    )
    subscription_mrr_usd: float | None = Field(
        default=None,
        description="Estimated monthly subscription MRR from plan tiers; null when Stripe checkout is not configured.",
    )
