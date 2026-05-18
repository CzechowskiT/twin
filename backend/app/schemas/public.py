"""Public, non-PII payloads for landing and investor surfaces."""

from pydantic import BaseModel, Field


class MvpStatsOut(BaseModel):
    """Aggregate counters only — safe for public investor / traction strip."""

    validated_jobs: int = Field(ge=0, description="Jobs marked validated in the index.")
    registered_users: int = Field(ge=0, description="User accounts (includes incomplete onboarding).")
    total_applications: int = Field(ge=0, description="Application rows across all candidates.")
    profiles_with_cv: int = Field(ge=0, description="Candidates who uploaded a CV at least once.")
    job_boards_in_registry: int = Field(ge=0, description="Board adapters in the current scrape registry order.")
    linkedin_oauth_configured: bool = Field(description="LinkedIn OAuth client id+secret present on the API.")
    stripe_checkout_ready: bool = Field(description="Stripe secret + Premium price id configured.")
    generated_at: str = Field(description="ISO-8601 UTC timestamp when counts were computed.")
