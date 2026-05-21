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
    database_reachable: bool = Field(
        description="True when the API can run SELECT 1 against the configured database.",
    )
