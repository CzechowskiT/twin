"""Job listing schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobOut(BaseModel):
    id: int
    job_board: str
    title: str
    company: str
    location: str | None
    salary_min: int | None
    salary_max: int | None
    url: str
    is_validated: bool
    scraped_at: datetime
    opportunity_type: str = "full_time"
    project_duration_months: int | None = None
    hourly_rate_min: int | None = None
    hourly_rate_max: int | None = None
    score: float | None = Field(default=None, description="Match vs current user's profile (0–100); null without profile.")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "id": 1,
                    "job_board": "pracuj",
                    "title": "Senior Python Developer",
                    "company": "Acme Corp",
                    "location": "Warsaw, Poland",
                    "salary_min": 80000,
                    "salary_max": 120000,
                    "url": "https://pracuj.pl/oferta/123",
                    "is_validated": True,
                    "scraped_at": "2026-01-15T12:00:00",
                    "score": 87.5,
                }
            ]
        },
    )


class ScrapeTaskOut(BaseModel):
    task_id: str
    job_board: str
    message: str


class BoardScrapeResult(BaseModel):
    scraped: int
    saved: int
    error: str | None = None


class ScrapeAllOut(BaseModel):
    task_id: str
    total_saved: int
    boards: dict[str, BoardScrapeResult]
    errors: dict[str, str]
    message: str


class JobListOut(BaseModel):
    items: list[JobOut]
    total: int
    search_relaxed: bool = Field(
        default=False,
        description="True when strict filters returned zero rows and salary threshold was dropped once.",
    )


class JobFiltersOut(BaseModel):
    job_boards: list[str]
    locations: list[str]


class BoardOut(BaseModel):
    id: str
    label: str
    region: str


class BoardListOut(BaseModel):
    items: list[BoardOut]
