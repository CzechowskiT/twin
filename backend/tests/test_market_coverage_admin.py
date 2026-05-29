"""Admin market-coverage-status endpoint."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, Job, User
from app.database.session import get_db
from app.main import app
from app.services.scrape_run_tracking import finish_run, start_run


@pytest.fixture
def mc_admin_client(monkeypatch):
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "test-ops-token")
    get_settings.cache_clear()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    now = datetime.now(timezone.utc)
    db.add(
        Job(
            job_board="pracuj.pl",
            external_id="j1",
            title="Dev",
            company="Acme",
            description="x",
            requirements="y",
            url="https://example.com/1",
            is_validated=True,
            scraped_at=now,
        )
    )
    db.commit()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    start_run(run_kind="pl_core_daily", board_ids=["pracuj"])
    finish_run(run_kind="pl_core_daily", active_validated_after=1)
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_market_coverage_status_requires_token(mc_admin_client) -> None:
    client, _ = mc_admin_client
    res = client.get("/api/v1/admin/market-coverage-status")
    assert res.status_code == 401


def test_market_coverage_status_ok(mc_admin_client) -> None:
    client, _ = mc_admin_client
    res = client.get(
        "/api/v1/admin/market-coverage-status",
        headers={"Authorization": "Bearer test-ops-token"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["active_validated_jobs"] >= 1
    assert "progress_to_10k_pct" in body
    assert "last_scrape_run_at" in body
    assert "warnings" in body
    assert body["market_coverage_target_jobs"] == 10000
