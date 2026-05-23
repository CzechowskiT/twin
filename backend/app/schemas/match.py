"""Match result schemas."""

from pydantic import BaseModel


class JobMatchOut(BaseModel):
    job_id: int
    score: float
    title: str
    company: str
    location: str | None
    url: str
    job_board: str
    match_reason: str | None = None


class JobMatchListOut(BaseModel):
    items: list[JobMatchOut]
    total: int
