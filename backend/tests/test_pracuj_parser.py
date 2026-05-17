"""Tests for Pracuj.pl HTML parser."""

from pathlib import Path

from app.scrapers.pracuj import _build_search_url, _parse_listing_html, _parse_salary_pl

FIXTURE = Path(__file__).parent / "fixtures" / "pracuj_listing_snippet.html"


def test_parse_fixture_returns_one_job() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    jobs = _parse_listing_html(html, limit=10)
    assert len(jobs) == 1
    assert jobs[0].external_id == "1004787190"
    assert jobs[0].title == "Python Developer"
    assert jobs[0].company == "Acme Sp. z o.o."
    assert jobs[0].location == "Warszawa, Śródmieście"
    assert jobs[0].salary_min == 15_000
    assert jobs[0].salary_max == 20_000
    assert jobs[0].requirements is None


def test_build_search_url_pagination() -> None:
    assert "pn=3" in _build_search_url("python developer", "warszawa", page=3)
    assert "?pn" not in _build_search_url("python", "warszawa", page=1)


def test_parse_salary_pl_variants() -> None:
    assert _parse_salary_pl("15 000–20 000 zł brutto / mies.") == (15_000, 20_000)
    assert _parse_salary_pl("12 000 - 18 000 PLN") == (12_000, 18_000)
    assert _parse_salary_pl("14 000 zł") == (14_000, 14_000)
    assert _parse_salary_pl(None) == (None, None)
