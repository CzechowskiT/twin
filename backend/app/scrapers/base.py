"""Shared scraper types and validation."""

from dataclasses import dataclass
from urllib.parse import urlparse

_MAX_TITLE = 300
_MAX_COMPANY = 200
_MAX_EXTERNAL_ID = 120
_MAX_URL_LEN = 2048


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
    title = (job.title or "").strip()
    company = (job.company or "").strip()
    ext = (job.external_id or "").strip()
    url_s = (job.url or "").strip()
    if not title or not company:
        return False
    if len(title) > _MAX_TITLE or len(company) > _MAX_COMPANY:
        return False
    if not ext or not url_s:
        return False
    if len(ext) > _MAX_EXTERNAL_ID or len(url_s) > _MAX_URL_LEN:
        return False
    parsed = urlparse(url_s)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False
    return True
