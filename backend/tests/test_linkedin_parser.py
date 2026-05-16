"""Tests for LinkedIn HTML parser (no live network)."""

from pathlib import Path

import pytest

from app.scrapers.linkedin import (
    _build_search_url,
    _is_blocked_page,
    _parse_listing_html,
    scrape_linkedin,
)

FIXTURE = Path(__file__).parent / "fixtures" / "linkedin_listing_snippet.html"


def test_parse_fixture_returns_job() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    jobs = _parse_listing_html(html, limit=10)
    assert len(jobs) == 2
    assert jobs[0].external_id == "4410367681"
    assert jobs[0].title == "Sales Closer"
    assert jobs[0].company == "ConvertHub"
    assert jobs[0].job_board == "linkedin.com"
    assert "linkedin.com/jobs/view" in jobs[0].url
    assert jobs[1].external_id == "4410368888"
    assert jobs[1].title == "Product Manager"
    assert jobs[1].company == "Acme"
    assert jobs[1].location == "Remote"


def test_build_search_url_sort_and_geo() -> None:
    url = _build_search_url("python dev", "Berlin", geo_id="105015875")
    assert "sortBy=DD" in url
    assert "f_TPR=r604800" in url
    assert "geoId=105015875" in url
    assert "keywords=python+dev" in url


def test_build_search_url_ignores_blank_geo() -> None:
    url = _build_search_url("a", "b", geo_id="  ")
    assert "geoId=" not in url


def test_is_blocked_page_false_when_listing_markers() -> None:
    html = "<html>" + ("x" * 2500) + "<div class='job-card-container'>/jobs/view/1</div></html>"
    assert not _is_blocked_page(html)


def test_is_blocked_page_true_on_authwall() -> None:
    html = "<html>" + ("y" * 2500) + "authwall</html>"
    assert _is_blocked_page(html)


@pytest.mark.skip(reason="Live LinkedIn scrape — run manually")
def test_live_linkedin_scrape() -> None:
    jobs = scrape_linkedin(keyword="sales", limit=5)
    assert len(jobs) >= 1
