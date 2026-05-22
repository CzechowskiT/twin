"""Company intelligence API schemas (US-C051)."""

from datetime import datetime

from pydantic import BaseModel, Field


class InsiderLanguageOut(BaseModel):
    use: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)


class CompanyIntelBodyOut(BaseModel):
    priorities: list[str]
    pain_points: list[str]
    insider_language: InsiderLanguageOut
    cover_letter_draft: str


class CompanyIntelOut(BaseModel):
    job_id: int
    company: str
    job_title: str
    intel: CompanyIntelBodyOut
    researched_at: datetime
    from_cache: bool
