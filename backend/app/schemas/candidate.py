"""Candidate profile schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class CandidateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    skills: list[str] = Field(default_factory=list)
    experience_years: int = Field(ge=0, le=50)
    desired_salary: int | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=100)


class CandidateUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    skills: list[str] = Field(default_factory=list)
    experience_years: int = Field(ge=0, le=50)
    desired_salary: int | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=100)


class CandidateOut(BaseModel):
    id: int
    name: str
    skills: list[str]
    experience_years: int
    desired_salary: int | None
    location: str | None
    has_cv: bool = False
    cv_filename: str | None = None
    cv_uploaded_at: datetime | None = None

    model_config = {"from_attributes": True}


class CvUploadOut(BaseModel):
    message: str
    has_cv: bool
    cv_filename: str | None
    skills_updated: list[str]
    experience_years: int
    location: str | None
