"""Pydantic schemas for public beta waitlist API."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class BetaJoinIn(BaseModel):
    email: EmailStr
    name: str | None = Field(default=None, max_length=255)
    referred_by: str | None = Field(default=None, max_length=32, description="Referrer referral_code")
    source: str = Field(default="email", max_length=32)
    accept_privacy_notice: bool = Field(description="Privacy notice for waitlist data")
    consent_beta_email_updates: bool = Field(description="Email about queue position and beta")


class BetaJoinOut(BaseModel):
    referral_code: str
    position: int
    priority_points: int
    spots_left: int
    total_signups: int


class BetaProfileUpdate(BaseModel):
    job_title: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    min_salary: int | None = Field(default=None, ge=0)


class BetaStatsOut(BaseModel):
    total_signups: int
    cap: int
    spots_left: int
    validated_jobs: int
    job_boards: int
    recent: list[str]
    campaign_ends_at: str | None = None


class BetaMatchItem(BaseModel):
    score: float
    title: str
    company: str
    location: str | None
    job_board: str
    url: str


class BetaMatchPreviewOut(BaseModel):
    title_query: str
    matches: list[BetaMatchItem]


class BetaDashboardOut(BaseModel):
    referral_code: str
    position: int
    priority_points: int
    spots_left: int
    total_signups: int
    referrals_count: int
    linkedin_shared: bool
    cv_uploaded: bool
    voice_recorded: bool
    testimonial_posted: bool
    job_title: str | None
    location: str | None
    min_salary: int | None
    campaign_ends_at: str | None = None


class BetaActionOut(BaseModel):
    position: int
    priority_points: int
    matches: list[BetaMatchItem] | None = None


class BetaAdminStatsOut(BaseModel):
    total_signups: int
    cap: int
    spots_left: int
    linkedin_shared: int
    cv_uploaded: int
    voice_recorded: int
    by_source: dict[str, int]
    referral_rows: int
    top_referrers: list[dict[str, int | str]]
