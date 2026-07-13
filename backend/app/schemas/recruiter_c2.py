"""Wave C slice 2 — talent pool + trust review queue schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TalentPoolAddIn(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=200)
    job_title: str | None = Field(None, max_length=200)
    location: str | None = Field(None, max_length=120)
    seniority: str | None = Field(None, max_length=64)
    skills: list[str] | None = None
    external_ats_id: str | None = Field(None, max_length=128)
    candidate_id: str | None = Field(None, max_length=64)
    pipeline_status: str | None = Field("review", max_length=32)
    idempotency_key: str | None = Field(None, max_length=128)


class TrustReviewDecisionIn(BaseModel):
    decision: str = Field(..., min_length=1, max_length=32)
    note: str | None = Field(None, max_length=500)
