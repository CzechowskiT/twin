"""Candidate profile schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.career_compass import CareerCompassPreviewOut


class CandidateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    skills: list[str] = Field(default_factory=list)
    preferred_job_titles: list[str] = Field(default_factory=list, max_length=25)
    experience_years: int = Field(ge=0, le=50)
    desired_salary: int | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=100)
    talent_pool_opt_in: bool = False
    talent_pool_processing_consent: bool = Field(
        default=False,
        description="Required when talent_pool_opt_in is true — B2B anonymised pool per Privacy Policy",
    )


class CandidateUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    skills: list[str] = Field(default_factory=list)
    preferred_job_titles: list[str] = Field(default_factory=list, max_length=25)
    experience_years: int = Field(ge=0, le=50)
    desired_salary: int | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=100)
    talent_pool_opt_in: bool | None = None
    talent_pool_processing_consent: bool | None = Field(
        default=None,
        description="When enabling talent pool, must be true on the same request",
    )
    cv_processing_consent: bool | None = None
    intro_audio_processing_consent: bool | None = None


class CandidateOut(BaseModel):
    id: int
    name: str
    skills: list[str]
    preferred_job_titles: list[str] = Field(default_factory=list)
    experience_years: int
    desired_salary: int | None
    location: str | None
    talent_pool_opt_in: bool = False
    talent_pool_opt_in_at: datetime | None = None
    has_cv: bool = False
    cv_filename: str | None = None
    cv_uploaded_at: datetime | None = None
    has_intro_audio: bool = False
    intro_audio_uploaded_at: datetime | None = None
    cv_insights: dict[str, Any] | None = None
    cv_processing_consent_at: datetime | None = None
    intro_audio_processing_consent_at: datetime | None = None
    cv_tailoring: dict[str, Any] | None = Field(
        default=None,
        description="Role-specific pitch/bullets for application forms (see POST /me/cv/tailor)",
    )
    career_compass_preview: CareerCompassPreviewOut | None = Field(
        default=None,
        description="Ideal job + path progress (see GET /me/career-compass)",
    )

    model_config = {"from_attributes": True}


class CvUploadOut(BaseModel):
    message: str
    has_cv: bool
    cv_filename: str | None
    skills_updated: list[str]
    preferred_job_titles: list[str] = Field(default_factory=list)
    experience_years: int
    location: str | None
    cv_insights: dict[str, Any] | None = None


class IntroAudioUploadOut(BaseModel):
    message: str
    has_intro_audio: bool
    intro_audio_uploaded_at: datetime | None = None
    transcription_status: str = "skipped"


class CvTailorIn(BaseModel):
    """Tailor CV narrative for a target role (stored for auto-apply motivation fields)."""

    target_job_title: str = Field(min_length=2, max_length=200)
    job_id: int | None = Field(
        default=None,
        ge=1,
        description="When set, tailoring is used only for auto-apply on this job",
    )


class CvTailoringOut(BaseModel):
    message: str
    tailoring: dict[str, Any]


class ProfileDocumentOut(BaseModel):
    id: int
    original_filename: str
    content_type: str | None = None
    size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileDocumentsListOut(BaseModel):
    items: list[ProfileDocumentOut]
    storage_consent_covered: bool


class ProfileDocumentUploadOut(BaseModel):
    document: ProfileDocumentOut
    message: str = "File stored."


class CandidateReadinessGateOut(BaseModel):
    verification_status: str
    checklist: dict[str, bool]
    missing_items: list[str] = Field(default_factory=list)
    blocked_reasons: list[str] = Field(default_factory=list)
    delegated_apply_allowed: bool = False
    can_prepare_application_package: bool = False
    can_submit_delegated_application: bool = False
