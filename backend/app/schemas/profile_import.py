"""Profile import API schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ImportLinkedInIn(BaseModel):
    linkedin_access_token: str | None = Field(
        default=None,
        description="Optional short-lived token from LinkedIn OAuth; falls back to stored profile.",
    )


class ImportCvTextIn(BaseModel):
    cv_text: str = Field(..., min_length=50, max_length=50000)


class ProfileImportOut(BaseModel):
    synthesized: dict[str, Any]
    profile_completeness: int
    next_steps: list[str]
    source: str
    applied_to_profile: bool
