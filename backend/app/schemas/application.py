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


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    status: ApplicationStatusEnum
    notes: str | None
    applied_at: datetime | None
    updated_at: datetime
    title: str
    company: str
    location: str | None
    url: str
    job_board: str

    model_config = {"from_attributes": True}


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
