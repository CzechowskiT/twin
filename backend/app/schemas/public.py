"""Public, non-PII payloads for landing and investor surfaces."""

from pydantic import BaseModel, Field


class MvpStatsOut(BaseModel):
    """Aggregate counters only — safe for public investor / traction strip."""

    validated_jobs: int = Field(ge=0, description="Jobs marked validated in the index.")
    registered_users: int = Field(ge=0, description="User accounts (includes incomplete onboarding).")
    total_applications: int = Field(ge=0, description="Application rows across all candidates.")
    profiles_with_cv: int = Field(ge=0, description="Candidates who uploaded a CV at least once.")
    job_boards_in_registry: int = Field(ge=0, description="Board adapters in the current scrape registry order.")
    generated_at: str = Field(description="ISO-8601 UTC timestamp when counts were computed.")
    # Present only when investor_mvp_stats_demo_mode is on (fundraiser strip); omitted otherwise (exclude_none).
    linkedin_oauth_configured: bool | None = Field(
        default=None,
        description="LinkedIn OIDC env vars present (demo strip only; not exposed when demo mode is off).",
    )
    stripe_checkout_ready: bool | None = Field(
        default=None,
        description="Stripe secret + at least one subscription price id (demo strip only).",
    )
