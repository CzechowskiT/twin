"""Application tracking schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ApplicationStatusEnum(str, Enum):
    pending = "pending"
    applied = "applied"
    interview = "interview"
    rejected = "rejected"
    hired = "hired"


class ApplicationCreate(BaseModel):
    job_id: int
    status: ApplicationStatusEnum = ApplicationStatusEnum.pending
    notes: str | None = Field(default=None, max_length=2000)


class ApplicationUpdate(BaseModel):
    status: ApplicationStatusEnum | None = None
    notes: str | None = Field(default=None, max_length=2000)
    recruiter_feedback_raw: str | None = Field(
        default=None,
        max_length=12_000,
        description="Verbatim notes from recruiter email/call — use Parse feedback to structure upskill plan.",
    )


class UpskillActionOut(BaseModel):
    title: str
    priority: str = "medium"
    rationale: str = ""


class ApplicationFeedbackInsightsOut(BaseModel):
    skill_tool_gaps: list[str] = Field(default_factory=list)
    positioning_gaps: list[str] = Field(default_factory=list)
    what_stronger_candidates_showed: list[str] = Field(default_factory=list)
    upskill_actions: list[UpskillActionOut] = Field(default_factory=list)
    summary: str | None = None
    parsed_at: str | None = None
    source: str | None = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    status: ApplicationStatusEnum
    notes: str | None
    recruiter_feedback_raw: str | None = None
    feedback_insights: ApplicationFeedbackInsightsOut | None = None
    applied_at: datetime | None
    updated_at: datetime
    title: str
    company: str
    location: str | None
    url: str
    job_board: str
    placement_state: str = "none"
    placement_work_email: str | None = None
    placement_reported_at: datetime | None = None
    placement_verified_at: datetime | None = None

    model_config = {"from_attributes": True}


class PlacementVerifyStartIn(BaseModel):
    work_email: str = Field(..., max_length=320)


class PlacementVerifyStartOut(BaseModel):
    mail_sent: bool
    message: str


class PlacementConfirmIn(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)


class PlacementConfirmOut(BaseModel):
    ok: bool
    message: str


class PlacementEventOut(BaseModel):
    id: int
    event_type: str
    actor: str
    detail: dict | None = None
    created_at: datetime


class PlacementEventListOut(BaseModel):
    items: list[PlacementEventOut]
    total: int


class ParseFeedbackIn(BaseModel):
    """Optional override; default is to parse `recruiter_feedback_raw` already saved on the application."""

    raw_notes: str | None = Field(default=None, max_length=12_000)


class RoleInsightRefOut(BaseModel):
    application_id: int
    job_id: int
    title: str
    company: str
    summary: str | None = None


class DevelopmentFocusOut(BaseModel):
    """Merged view across applications for reskilling priorities."""

    skill_tool_gaps: list[str] = Field(default_factory=list)
    positioning_themes: list[str] = Field(default_factory=list)
    stronger_candidate_signals: list[str] = Field(default_factory=list)
    upskill_actions_prioritized: list[UpskillActionOut] = Field(default_factory=list)
    roles_with_insights: list[RoleInsightRefOut] = Field(default_factory=list)


class ApplicationListOut(BaseModel):
    items: list[ApplicationOut]
    total: int


class AutoApplyRequest(BaseModel):
    job_id: int
    submit: bool | None = None


class AutoApplyOut(BaseModel):
    success: bool
    outcome: str
    message: str
    application_id: int | None = None
