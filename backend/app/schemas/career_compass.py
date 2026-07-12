"""Career compass persistence schemas (Wave B slice 1)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

SeniorityLevel = Literal["junior", "mid", "senior", "lead", "director", "executive"]
WorkMode = Literal["remote", "hybrid", "onsite", "flexible"]
SalaryCurrency = Literal["PLN", "EUR", "USD", "GBP"]
CompletionStatus = Literal["draft", "partial", "complete"]


class CareerCompassPersistBase(BaseModel):
    target_role: str | None = Field(default=None, max_length=200)
    target_seniority: SeniorityLevel | None = None
    preferred_industries: list[str] = Field(default_factory=list, max_length=30)
    preferred_locations: list[str] = Field(default_factory=list, max_length=30)
    work_mode: WorkMode | None = None
    salary_expectation_min: int | None = Field(default=None, ge=0, le=10_000_000)
    salary_expectation_max: int | None = Field(default=None, ge=0, le=10_000_000)
    salary_currency: SalaryCurrency = "PLN"
    career_priorities: list[str] = Field(default_factory=list, max_length=30)
    skill_gaps: list[str] = Field(default_factory=list, max_length=30)
    strengths: list[str] = Field(default_factory=list, max_length=30)
    next_steps: list[str] = Field(default_factory=list, max_length=30)
    learning_actions: list[str] = Field(default_factory=list, max_length=30)
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator(
        "preferred_industries",
        "preferred_locations",
        "career_priorities",
        "skill_gaps",
        "strengths",
        "next_steps",
        "learning_actions",
        mode="before",
    )
    @classmethod
    def trim_list_items(cls, value: object) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("must be a list")
        out: list[str] = []
        for item in value:
            s = str(item).strip()[:200]
            if s and s not in out:
                out.append(s)
        return out[:30]

    @model_validator(mode="after")
    def salary_min_lte_max(self) -> "CareerCompassPersistBase":
        if (
            self.salary_expectation_min is not None
            and self.salary_expectation_max is not None
            and self.salary_expectation_min > self.salary_expectation_max
        ):
            raise ValueError("salary_expectation_min must be <= salary_expectation_max")
        return self


class CareerCompassPutIn(CareerCompassPersistBase):
    """Full upsert body."""


class CareerCompassPatchIn(BaseModel):
    """Partial update — only provided fields are changed."""

    target_role: str | None = Field(default=None, max_length=200)
    target_seniority: SeniorityLevel | None = None
    preferred_industries: list[str] | None = Field(default=None, max_length=30)
    preferred_locations: list[str] | None = Field(default=None, max_length=30)
    work_mode: WorkMode | None = None
    salary_expectation_min: int | None = Field(default=None, ge=0, le=10_000_000)
    salary_expectation_max: int | None = Field(default=None, ge=0, le=10_000_000)
    salary_currency: SalaryCurrency | None = None
    career_priorities: list[str] | None = Field(default=None, max_length=30)
    skill_gaps: list[str] | None = Field(default=None, max_length=30)
    strengths: list[str] | None = Field(default=None, max_length=30)
    next_steps: list[str] | None = Field(default=None, max_length=30)
    learning_actions: list[str] | None = Field(default=None, max_length=30)
    notes: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def salary_min_lte_max(self) -> "CareerCompassPatchIn":
        if (
            self.salary_expectation_min is not None
            and self.salary_expectation_max is not None
            and self.salary_expectation_min > self.salary_expectation_max
        ):
            raise ValueError("salary_expectation_min must be <= salary_expectation_max")
        return self


class CareerCompassOut(BaseModel):
    configured: bool = False
    target_role: str | None = None
    target_seniority: str | None = None
    preferred_industries: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)
    work_mode: str | None = None
    salary_expectation_min: int | None = None
    salary_expectation_max: int | None = None
    salary_currency: str = "PLN"
    career_priorities: list[str] = Field(default_factory=list)
    skill_gaps: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    learning_actions: list[str] = Field(default_factory=list)
    notes: str | None = None
    completion_status: CompletionStatus = "draft"
    completion_percent: int = Field(default=0, ge=0, le=100)
    missing_fields: list[str] = Field(default_factory=list)
    readiness_complete: bool = False
    updated_at: datetime | None = None


class CareerCompassPreviewOut(BaseModel):
    """Lightweight badge for profile / dashboard headers."""

    configured: bool = False
    completion_percent: int | None = None
    readiness_complete: bool = False
    next_step_title: str | None = None


# --- Legacy gamified path builder (internal; not exposed on persistence API) ---


class IdealJobIn(BaseModel):
    target_role_titles: list[str] = Field(default_factory=list, max_length=15)
    target_salary_gross_monthly_pln: int | None = Field(default=None, ge=0, le=500_000)
    work_formats: list[str] = Field(default_factory=list, max_length=8)
    must_have_tools: list[str] = Field(default_factory=list, max_length=40)
    key_responsibilities: str = Field("", max_length=4000)
    industries: list[str] = Field(default_factory=list, max_length=20)
    location_preferences: str | None = Field(default=None, max_length=300)
    target_horizon_months: int = Field(12, ge=1, le=60)


class MilestonePatchIn(BaseModel):
    done: bool
