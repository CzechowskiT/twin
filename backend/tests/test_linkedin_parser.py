"""Tests for LinkedIn HTML parser (no live network)."""

from pathlib import Path

import pytest

from app.scrapers.linkedin import LinkedInScrapeError, _parse_listing_html, scrape_linkedin

FIXTURE = Path(__file__).parent / "fixtures" / "linkedin_listing_snippet.html"


def test_parse_fixture_returns_job() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    jobs = _parse_listing_html(html, limit=10)
    assert len(jobs) == 1
    assert jobs[0].external_id == "4410367681"
    assert jobs[0].title == "Sales Closer"
    assert jobs[0].company == "ConvertHub"
    assert jobs[0].job_board == "linkedin.com"
    assert "linkedin.com/jobs/view" in jobs[0].url


@pytest.mark.skip(reason="Live LinkedIn scrape — run manually")
def test_live_linkedin_scrape() -> None:
    jobs = scrape_linkedin(keyword="sales", limit=5)
    assert len(jobs) >= 1
