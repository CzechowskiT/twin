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


class JobListOut(BaseModel):
    items: list[JobOut]
    total: int
