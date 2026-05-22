"""Read-only investor demo snapshot (no secrets, no user email)."""

from pydantic import BaseModel, Field


class DemoJobMatchOut(BaseModel):
    job_id: int | None = None
    title: str
    company: str
    location: str | None = None
    score: float
    url: str | None = None
    job_board: str | None = None


class DemoCandidateOut(BaseModel):
    name: str
    location: str | None = None
    experience_years: int = 0
    has_cv: bool = False


class DemoApplicationOut(BaseModel):
    id: int | None = None
    status: str
    job_title: str
    company: str
    applied_at: str | None = None


class DemoInterviewOut(BaseModel):
    id: int | None = None
    company_name: str
    job_title: str
    interview_start: str
    interview_end: str
    timezone: str = "UTC"
    meeting_link: str | None = None
    status: str = "scheduled"


class DemoAutoApplyOut(BaseModel):
    consent_active: bool
    min_score_threshold: float
    daily_limit: int
    total_applications_submitted: int
    last_run_at: str | None = None


class DemoNightlyRunOut(BaseModel):
    started_at: str | None = None
    finished_at: str | None = None
    total_users_processed: int = 0
    total_applications_submitted: int = 0


class DemoSnapshotOut(BaseModel):
    """Anonymized pipeline preview for GET /api/v1/demo/snapshot (no login)."""

    demo_mode: bool = True
    source: str
    generated_at: str
    demo_user_configured: bool = False
    candidate: DemoCandidateOut
    top_matches: list[DemoJobMatchOut]
    application: DemoApplicationOut | None = None
    scheduled_interview: DemoInterviewOut | None = None
    auto_apply: DemoAutoApplyOut | None = None
    nightly_last_run: DemoNightlyRunOut | None = None
    signup_cta_path: str = Field(default="/register?zone=candidate")
    headline: str = "Investor demo snapshot"
