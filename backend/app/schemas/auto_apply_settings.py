"""Nightly auto-apply consent and settings."""

from datetime import datetime

from pydantic import BaseModel, Field


class AutoApplySettingsOut(BaseModel):
    is_active: bool
    min_score_threshold: float
    daily_limit: int
    consent_given_at: datetime | None
    total_applications_submitted: int
    last_run_at: datetime | None
    next_run_label: str
    supported_boards: str
    profile_ready: bool = Field(
        description="True when onboarding is done and CV, tailoring, or core profile fields exist.",
    )
    onboarding_completed: bool = False


class AutoApplyConsentIn(BaseModel):
    consent_acknowledged: bool = True
    min_score_threshold: float = Field(default=90.0, ge=75.0, le=100.0)
    daily_limit: int = Field(default=10, ge=1, le=20)


class AutoApplySettingsPatch(BaseModel):
    is_active: bool | None = None
    min_score_threshold: float | None = Field(default=None, ge=75.0, le=100.0)
    daily_limit: int | None = Field(default=None, ge=1, le=20)


class AutoApplyLastSweepOut(BaseModel):
    started_at: datetime | None
    finished_at: datetime | None
    total_applications_submitted: int
    total_applications_failed: int


class AutoApplyTriggerOut(BaseModel):
    applications_submitted: int
    applications_failed: int
    skipped_reason: str | None
    message: str
