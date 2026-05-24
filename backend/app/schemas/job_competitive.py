"""Competitive job board API schemas."""

from pydantic import BaseModel, Field


class InterviewStageOut(BaseModel):
    stage: str
    label: str
    duration: str | None = None


class JobDetailOut(BaseModel):
    id: int
    job_board: str
    title: str
    company: str
    location: str | None
    salary_min: int | None
    salary_max: int | None
    url: str
    description: str | None = None
    requirements: str | None = None
    tech_stack: list[str] = Field(default_factory=list)
    requirements_must_have: list[str] = Field(default_factory=list)
    requirements_nice_to_have: list[str] = Field(default_factory=list)
    interview_process: list[InterviewStageOut] = Field(default_factory=list)
    remote_percentage: int | None = None
    seniority_level: str | None = None
    culture_tags: list[str] = Field(default_factory=list)
    score: float | None = None


class SkillMatchOut(BaseModel):
    job_id: int
    score: float = Field(description="Overall match score 0–100")
    skill_match_percent: float = Field(description="Skills-only overlap percent")
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    total_skills: int = 0
    band: str = "weak"


class OneClickApplyOut(BaseModel):
    application_id: int
    status: str
    message: str
    already_applied: bool = False


class JobApplyStatsOut(BaseModel):
    job_id: int
    apply_count: int
    recent_applies_7d: int
