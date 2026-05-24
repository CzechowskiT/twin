"""Tests for global job board parsers and registry."""

from unittest.mock import MagicMock, patch

from app.scrapers.global_boards import (
    GLOBAL_BOARD_SPECS,
    _parse_indeed,
    _parse_indeed_pl,
    _parse_reed,
    _parse_ziprecruiter,
)
from app.scrapers.registry import list_boards, run_scrape

INDEED_SNIPPET = """
<html><body>
<div class="job_seen_beacon">
  <h2 class="jobTitle"><a href="/rc/clk?jk=abc123"><span>Sales Manager</span></a></h2>
  <span class="companyName">Acme Corp</span>
  <div class="companyLocation">Warsaw</div>
</div>
</body></html>
"""

REED_SNIPPET = """
<html><body>
<article class="job-result-card">
  <a class="job-card__title" href="/jobs/sales-manager/123">Sales Manager</a>
  <span class="job-card__company">Acme Ltd</span>
</article>
</body></html>
"""

ZIPRECRUITER_SNIPPET = """
<html><body>
<a href="/jobs/526374682-electrical-commissioning-lead-at-pm-group">Electrical Commissioning Lead</a>
</body></html>
"""


def test_global_board_specs_count() -> None:
    assert len(GLOBAL_BOARD_SPECS) == 13
    assert set(GLOBAL_BOARD_SPECS) == {
        "indeed",
        "indeed-pl",
        "glassdoor",
        "monster",
        "ziprecruiter",
        "careerbuilder",
        "simplyhired",
        "jooble",
        "reed",
        "stepstone",
        "seek",
        "google-jobs",
        "snagajob",
    }


def test_parse_indeed_fixture() -> None:
    jobs = _parse_indeed(INDEED_SNIPPET, limit=5)
    assert len(jobs) == 1
    assert jobs[0].title == "Sales Manager"
    assert jobs[0].company == "Acme Corp"
    assert jobs[0].job_board == "indeed.com"


def test_parse_reed_fixture() -> None:
    jobs = _parse_reed(REED_SNIPPET, limit=5)
    assert len(jobs) == 1
    assert jobs[0].title == "Sales Manager"
    assert jobs[0].company == "Acme Ltd"
    assert jobs[0].job_board == "reed.co.uk"


def test_parse_ziprecruiter_slug_links() -> None:
    jobs = _parse_ziprecruiter(ZIPRECRUITER_SNIPPET, limit=5)
    assert len(jobs) == 1
    assert jobs[0].external_id == "526374682"
    assert jobs[0].title == "Electrical Commissioning Lead"
    assert jobs[0].company == "Pm Group"
    assert "ziprecruiter.com/jobs/526374682" in jobs[0].url


def test_parse_indeed_pl_fixture() -> None:
    jobs = _parse_indeed_pl(INDEED_SNIPPET, limit=5)
    assert len(jobs) == 1
    assert jobs[0].job_board == "indeed.pl"
    assert jobs[0].title == "Sales Manager"


def test_list_boards_includes_all_global_specs() -> None:
    boards = list_boards()
    ids = {b["id"] for b in boards}
    assert set(GLOBAL_BOARD_SPECS).issubset(ids)
    poland_ids = {b["id"] for b in boards if b["region"] == "poland"}
    assert {
        "pracuj-sales",
        "rocketjobs-sales",
        "justjoin",
        "praca",
        "rocketjobs-roles",
        "indeed-pl",
    }.issubset(poland_ids)


def test_list_boards_sorted_by_region() -> None:
    from app.scrapers.registry import REGION_ORDER

    boards = list_boards()
    indices = [REGION_ORDER.index(b["region"]) for b in boards if b["region"] in REGION_ORDER]
    assert indices == sorted(indices)


@patch("app.config.get_settings")
def test_list_boards_respects_allowlist(mock_settings: MagicMock) -> None:
    mock_settings.return_value.scrape_enabled_board_ids = "indeed,pracuj-sales"
    boards = list_boards()
    ids = {b["id"] for b in boards}
    assert ids == {"indeed", "pracuj-sales"}


def test_global_board_celery_tasks_cover_all_specs() -> None:
    from app.tasks.scrape_tasks import GLOBAL_BOARD_SCRAPE_TASKS

    assert set(GLOBAL_BOARD_SCRAPE_TASKS) == set(GLOBAL_BOARD_SPECS)


def test_run_scrape_unknown_board_returns_empty() -> None:
    assert run_scrape("not-a-board") == []
