"""Schemas for AI career assistant endpoints (US-C052–057)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CvChangeOut(BaseModel):
    section: str
    before: str
    after: str
    reason: str


class AtsCvOptimizeOut(BaseModel):
    application_id: int
    match_before: float
    match_after: float
    changes: list[CvChangeOut]
    optimized_cv_text: str
    created_at: datetime


class InterviewPrepIn(BaseModel):
    application_id: int | None = None
    scheduled_interview_id: int | None = None


class InterviewPrepOut(BaseModel):
    id: int
    application_id: int | None
    scheduled_interview_id: int | None
    prep: dict[str, Any]
    created_at: datetime


class SalaryNegotiationIn(BaseModel):
    offer_pln: int | None = Field(default=None, ge=0, description="Monthly gross offer in PLN if known")


class SalaryNegotiationOut(BaseModel):
    id: int
    application_id: int
    negotiation: dict[str, Any]
    created_at: datetime


class FollowUpIn(BaseModel):
    notes: str = Field(default="", max_length=8000)


class FollowUpOut(BaseModel):
    id: int
    scheduled_interview_id: int
    email: dict[str, Any]
    created_at: datetime


class HiringInsightsBodyOut(BaseModel):
    top_traits: list[str]
    red_flags: list[str]
    interview_focus: list[str]
    bar_summary: str


class HiringInsightsOut(BaseModel):
    job_id: int
    job_title: str
    company: str
    insights: HiringInsightsBodyOut
    researched_at: datetime
    from_cache: bool


class LinkedinOptimizeIn(BaseModel):
    target_role: str = Field(min_length=2, max_length=200)


class LinkedinOptimizeOut(BaseModel):
    id: int
    target_role: str
    optimization: dict[str, Any]
    created_at: datetime
