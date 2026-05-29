"""Tests for RocketJobs.pl HTML parser."""

from pathlib import Path

from app.scrapers.rocketjobs import _parse_listing_html

FIXTURE = Path(__file__).parent / "fixtures" / "rocketjobs_listing_snippet.html"


def test_parse_fixture_returns_jobs() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    jobs = _parse_listing_html(html, limit=10)
    assert len(jobs) == 2
    assert jobs[0].title == "Data Engineer"
    assert jobs[0].company == "Dentsu Polska"
    assert jobs[0].external_id == "dentsu-polska-data-engineer-warszawa-bi-data-41c48536"
    assert jobs[0].location == "Warszawa"
    assert jobs[1].title == "Senior Python Developer"
    assert jobs[1].company == "Allegro"
    assert jobs[1].location == "Kraków"


def test_parse_fixture_respects_limit() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    jobs = _parse_listing_html(html, limit=1)
    assert len(jobs) == 1
