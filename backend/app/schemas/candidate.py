"""Candidate profile schemas."""

from pydantic import BaseModel, Field


class CandidateCreate(BaseModel):
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

    model_config = {"from_attributes": True}
