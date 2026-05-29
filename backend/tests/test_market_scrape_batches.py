"""Autonomous daily scrape batches continue on per-board failure."""

from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.scrapers.base import ScrapedJob
from app.tasks.market_scrape_batches import _ordered_subset, run_daily_pl_core

_GOOD = [
    ScrapedJob(
        job_board="pracuj.pl",
        external_id="a",
        title="Dev",
        company="Co",
        url="https://example.com/a",
        description="Python",
        requirements="Python",
    )
]


@pytest.fixture
def batch_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    yield db
    db.close()


def test_ordered_subset_respects_registry() -> None:
    ids = _ordered_subset(("pracuj", "not-a-board", "justjoin"))
    assert "pracuj" in ids
    assert "not-a-board" not in ids


def test_run_daily_pl_core_continues_on_board_error(batch_db) -> None:
    registry = {
        "pracuj": lambda: _GOOD,
        "justjoin": lambda: (_ for _ in ()).throw(RuntimeError("simulated failure")),
    }

    with patch("app.tasks.market_scrape_batches.SessionLocal", lambda: batch_db):
        with patch("app.tasks.market_scrape_batches.compliance.sleep_between_boards"):
            with patch("app.tasks.market_scrape_batches.SCRAPE_REGISTRY", registry):
                with patch(
                    "app.tasks.market_scrape_batches._ordered_subset",
                    return_value=["pracuj", "justjoin"],
                ):
                    with patch(
                        "app.tasks.market_scrape_batches._scrape_with_timeout",
                        side_effect=lambda fn, _t: (fn(), None),
                    ):
                        out = run_daily_pl_core()
    assert out["run_kind"] == "pl_core_daily"
    assert "justjoin" in out["errors"]
    assert out["total_saved"] >= 0
