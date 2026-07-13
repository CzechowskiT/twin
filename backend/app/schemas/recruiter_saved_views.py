"""Recruiter saved view schemas — Wave C4."""

from pydantic import BaseModel, Field


class RecruiterSavedViewOut(BaseModel):
    id: int
    company_slug: str
    surface: str
    name: str
    filter_json: dict
    is_default: bool
    created_at: str | None = None
    updated_at: str | None = None


class RecruiterSavedViewCreateIn(BaseModel):
    surface: str = Field(..., pattern="^(inbox|talent_pool|trust_review)$")
    name: str = Field(..., min_length=1, max_length=120)
    filter_json: dict = Field(default_factory=dict)
    is_default: bool = False


class RecruiterSavedViewUpdateIn(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    filter_json: dict | None = None
    is_default: bool | None = None
