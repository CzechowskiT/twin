"""Career discovery API schemas."""

from pydantic import BaseModel, Field


class RedFlagHitOut(BaseModel):
    code: str
    message: str
    pattern: str | None = None


class RedFlagsIn(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    requirements: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    skills: list[str] = Field(default_factory=list)
    existing_red_flags: list[str] = Field(default_factory=list)


class RedFlagsOut(BaseModel):
    hits: list[RedFlagHitOut]
    codes: list[str]
    summary: str


class ScoreJobCandidateIn(BaseModel):
    skills: list[str] = Field(default_factory=list)
    preferred_job_titles: list[str] = Field(default_factory=list)
    experience_years: int | None = None
    desired_salary: int | None = None
    location: str | None = None
    cv_text: str | None = None


class ScoreJobJobIn(BaseModel):
    title: str = Field(min_length=1)
    requirements: str | None = None
    description: str | None = None
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None


class ScoreJobIn(BaseModel):
    candidate: ScoreJobCandidateIn
    job: ScoreJobJobIn


class ScoreJobOut(BaseModel):
    score: float = Field(description="Overall match score 0–100")
    band: str = Field(description="excellent | good | fair | weak")
