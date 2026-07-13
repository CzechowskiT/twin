"""Recruiter in-app notification preference schemas — Wave C3."""

from pydantic import BaseModel, Field


class RecruiterNotificationPrefsOut(BaseModel):
    company_slug: str
    in_app_inbox_digest: bool
    in_app_interview_reminder: bool
    in_app_trust_review_alert: bool
    in_app_pipeline_update: bool
    updated_at: str | None = None
    updated_by_ref: str | None = None


class RecruiterNotificationPrefsPatchIn(BaseModel):
    in_app_inbox_digest: bool | None = None
    in_app_interview_reminder: bool | None = None
    in_app_trust_review_alert: bool | None = None
    in_app_pipeline_update: bool | None = None


class RecruiterNotificationPrefsPutIn(BaseModel):
    in_app_inbox_digest: bool = Field(default=True)
    in_app_interview_reminder: bool = Field(default=True)
    in_app_trust_review_alert: bool = Field(default=True)
    in_app_pipeline_update: bool = Field(default=True)
