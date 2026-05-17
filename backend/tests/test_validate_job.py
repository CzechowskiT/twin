"""Tests for ScrapedJob validation before persistence."""

from app.scrapers.base import ScrapedJob, validate_job


def _job(
    *,
    job_board: str = "test.board",
    external_id: str = "ext-1",
    title: str = "Engineer",
    company: str = "ACME",
    url: str = "https://example.com/jobs/1",
    location: str | None = None,
) -> ScrapedJob:
    return ScrapedJob(
        job_board=job_board,
        external_id=external_id,
        title=title,
        company=company,
        url=url,
        location=location,
    )


def test_validate_job_ok() -> None:
    assert validate_job(_job()) is True


def test_validate_job_rejects_whitespace_only_title() -> None:
    assert validate_job(_job(title="   ")) is False


def test_validate_job_rejects_oversized_title() -> None:
    assert validate_job(_job(title="x" * 301)) is False


def test_validate_job_rejects_bad_url_scheme() -> None:
    assert validate_job(_job(url="ftp://example.com/j")) is False


def test_validate_job_accepts_max_length_title() -> None:
    assert validate_job(_job(title="t" * 300)) is True
