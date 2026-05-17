"""Unit tests for scraped-job batch prep before DB upsert."""

from unittest.mock import MagicMock, patch

from app.scrapers.base import ScrapedJob
from app.services.job_storage import _prepare_jobs_for_persist


def _job(
    *,
    external_id: str = "1",
    title: str = "Python Developer",
    company: str = "ACME",
    url: str = "https://example.com/j/1",
    requirements: str | None = None,
    description: str | None = None,
) -> ScrapedJob:
    return ScrapedJob(
        job_board="test.board",
        external_id=external_id,
        title=title,
        company=company,
        url=url,
        requirements=requirements,
        description=description,
    )


@patch("app.services.job_storage.get_settings")
def test_prepare_soft_dedupe_keeps_first_in_batch(mock_settings: MagicMock) -> None:
    mock_settings.return_value.scrape_min_job_body_chars = 0
    a = _job(external_id="111", title="  Dev  ", company=" Acme ")
    b = _job(external_id="222", title="dev", company="acme")
    out = _prepare_jobs_for_persist([a, b])
    assert len(out) == 1
    assert out[0].external_id == "111"


@patch("app.services.job_storage.get_settings")
def test_prepare_min_body_chars_filters_short(mock_settings: MagicMock) -> None:
    mock_settings.return_value.scrape_min_job_body_chars = 50
    short = _job(external_id="1", description="brief")
    long = _job(external_id="2", description="x" * 60)
    out = _prepare_jobs_for_persist([short, long])
    assert len(out) == 1
    assert out[0].external_id == "2"


@patch("app.services.job_storage.get_settings")
def test_prepare_zero_min_body_keeps_listing_only(mock_settings: MagicMock) -> None:
    mock_settings.return_value.scrape_min_job_body_chars = 0
    j = _job(external_id="1", description=None, requirements=None)
    assert _prepare_jobs_for_persist([j]) == [j]
