"""Job listing schemas."""

from datetime import datetime

from pydantic import BaseModel


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

    model_config = {"from_attributes": True}


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


class JobFiltersOut(BaseModel):
    job_boards: list[str]
    locations: list[str]


class BoardOut(BaseModel):
    id: str
    label: str
    region: str


class BoardListOut(BaseModel):
    items: list[BoardOut]
