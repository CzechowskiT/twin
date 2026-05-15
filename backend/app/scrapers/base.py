"""Shared scraper types and validation."""

from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass
class ScrapedJob:
    job_board: str
    external_id: str
    title: str
    company: str
    url: str
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    requirements: str | None = None
    description: str | None = None


def validate_job(job: ScrapedJob) -> bool:
    """Reject incomplete or malformed listings before DB write."""
    if not job.title.strip() or not job.company.strip():
        return False
    if not job.external_id.strip() or not job.url.strip():
        return False
    parsed = urlparse(job.url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False
    return True
