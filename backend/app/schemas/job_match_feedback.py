"""Schemas for per-job match feedback."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.matching.quality_gate import FEEDBACK_VALUES


class JobMatchFeedbackIn(BaseModel):
    job_id: int = Field(..., ge=1)
    feedback_value: str = Field(..., description=f"One of: {', '.join(sorted(FEEDBACK_VALUES))}")


class JobMatchFeedbackOut(BaseModel):
    job_id: int
    feedback_value: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobMatchFeedbackListOut(BaseModel):
    items: list[JobMatchFeedbackOut]
