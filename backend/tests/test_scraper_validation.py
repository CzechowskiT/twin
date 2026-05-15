"""Tests for scraped job validation."""

from app.scrapers.base import ScrapedJob, validate_job


def test_valid_job_passes() -> None:
    job = ScrapedJob(
        job_board="pracuj.pl",
        external_id="123",
        title="Python Developer",
        company="Acme",
        url="https://www.pracuj.pl/praca/python-developer,123",
    )
    assert validate_job(job) is True


def test_empty_title_fails() -> None:
    job = ScrapedJob(
        job_board="pracuj.pl",
        external_id="123",
        title="  ",
        company="Acme",
        url="https://www.pracuj.pl/praca/123",
    )
    assert validate_job(job) is False
