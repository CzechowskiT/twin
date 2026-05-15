"""Tests for Pracuj.pl HTML parser."""

from pathlib import Path

from app.scrapers.pracuj import _parse_listing_html

FIXTURE = Path(__file__).parent / "fixtures" / "pracuj_listing_snippet.html"


def test_parse_fixture_returns_one_job() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    jobs = _parse_listing_html(html, limit=10)
    assert len(jobs) == 1
    assert jobs[0].external_id == "1004787190"
    assert jobs[0].title == "Python Developer"
    assert jobs[0].company == "Acme Sp. z o.o."
    assert jobs[0].location == "Warszawa, Śródmieście"
