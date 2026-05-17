"""Ideal job + gamified career path (stored under candidate profile_signals_json)."""

from typing import Any

from pydantic import BaseModel, Field


class IdealJobIn(BaseModel):
    target_role_titles: list[str] = Field(default_factory=list, max_length=15)
    target_salary_gross_monthly_pln: int | None = Field(default=None, ge=0, le=500_000)
    work_formats: list[str] = Field(
        default_factory=list,
        max_length=8,
        description="e.g. remote, hybrid, onsite, flexible",
    )
    must_have_tools: list[str] = Field(default_factory=list, max_length=40)
    key_responsibilities: str = Field("", max_length=4000)
    industries: list[str] = Field(default_factory=list, max_length=20)
    location_preferences: str | None = Field(default=None, max_length=300)
    target_horizon_months: int = Field(12, ge=1, le=60)


class CareerCompassPutIn(BaseModel):
    ideal: IdealJobIn
    regenerate_path: bool = Field(
        default=True,
        description="Rebuild phased milestones from ideal + current profile (keeps xp_total/level)",
    )


class MilestoneOut(BaseModel):
    model_config = {"extra": "ignore"}

    id: str
    title: str
    week: int = 1
    xp: int = 50
    done: bool = False
    hint: str = ""


class PhaseOut(BaseModel):
    model_config = {"extra": "ignore"}

    id: str
    title: str
    week_start: int = 1
    week_end: int = 4
    milestones: list[MilestoneOut] = Field(default_factory=list)


class CareerSnapshotOut(BaseModel):
    model_config = {"extra": "ignore"}

    readiness_score: int = Field(ge=0, le=100)
    gaps_summary: list[str] = Field(default_factory=list)
    strengths_aligned: list[str] = Field(default_factory=list)
    you_are_here: str = ""


class PathOut(BaseModel):
    model_config = {"extra": "ignore"}

    generated_at: str = ""
    source: str = "fallback"
    horizon_months: int = 12
    current_phase_index: int = 0
    phases: list[PhaseOut] = Field(default_factory=list)
    xp_total: int = 0
    level: int = 1


class CareerCompassOut(BaseModel):
    configured: bool = False
    ideal: dict[str, Any] | None = None
    path: PathOut | None = None
    snapshot: CareerSnapshotOut | None = None


class CareerCompassPreviewOut(BaseModel):
    """Lightweight badge for profile / dashboard headers."""

    configured: bool = False
    readiness_score: int | None = None
    level: int | None = None
    xp_total: int | None = None
    next_milestone_title: str | None = None


class MilestonePatchIn(BaseModel):
    done: bool
