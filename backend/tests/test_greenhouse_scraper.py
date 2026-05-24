"""Greenhouse public JSON adapter."""

from unittest.mock import MagicMock, patch

from app.api.jobs import PER_BOARD_SCRAPE_HANDLERS
from app.scrapers.greenhouse import scrape_greenhouse_board
from app.scrapers.registry import GREENHOUSE_SCRAPERS, list_boards
from app.tasks.scrape_tasks import GREENHOUSE_SCRAPE_TASKS


@patch("app.scrapers.greenhouse.compliance.assert_url_may_be_fetched", return_value=True)
@patch("app.scrapers.greenhouse.httpx.Client")
def test_scrape_greenhouse_board_parses(mock_client_cls: MagicMock, _mock_robots: MagicMock) -> None:
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "jobs": [
            {
                "id": 11,
                "title": "Software Engineer",
                "absolute_url": "https://boards.greenhouse.io/acme/jobs/1",
                "location": {"name": "Remote"},
            },
            {"id": 12, "title": "", "absolute_url": "https://x", "location": {}},
        ]
    }
    mock_inst = MagicMock()
    mock_inst.__enter__.return_value.get.return_value = mock_resp
    mock_client_cls.return_value = mock_inst

    jobs = scrape_greenhouse_board("acme", "Acme Corp", limit=10)
    assert len(jobs) == 1
    assert jobs[0].title == "Software Engineer"
    assert jobs[0].company == "Acme Corp"
    assert jobs[0].external_id == "acme-11"
    assert jobs[0].location == "Remote"


def test_greenhouse_celery_tasks_cover_all_registry_boards() -> None:
    assert set(GREENHOUSE_SCRAPE_TASKS) == set(GREENHOUSE_SCRAPERS)


def test_greenhouse_boards_exposed_for_per_board_scrape_api() -> None:
    assert set(GREENHOUSE_SCRAPERS).issubset(PER_BOARD_SCRAPE_HANDLERS)


def test_list_boards_includes_greenhouse_employers() -> None:
    boards = list_boards()
    ids = {b["id"] for b in boards}
    assert set(GREENHOUSE_SCRAPERS).issubset(ids)
