"""GET /api/v1/jobs/feed-stats active corpus counters."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import Base, Job, User
from app.database.session import get_db
from app.main import app

_NOW = datetime.now(timezone.utc)


@pytest.fixture
def feed_stats_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(
        email="feed@test.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=_NOW,
        terms_of_service_accepted_at=_NOW,
        job_data_processing_consent_at=_NOW,
        ai_matching_consent_at=_NOW,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    now = datetime.utcnow()
    db.add(
        Job(
            job_board="pracuj.pl",
            external_id="f1",
            title="Dev",
            company="Co",
            url="https://example.com/1",
            is_validated=True,
            scraped_at=now,
        )
    )
    db.add(
        Job(
            job_board="pracuj.pl",
            external_id="old",
            title="Dev Old",
            company="Co",
            url="https://example.com/2",
            is_validated=True,
            scraped_at=now - timedelta(days=60),
        )
    )
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    token = create_access_token(user.email)
    client = TestClient(app)
    try:
        yield client, token
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_job_feed_stats_active_window(feed_stats_client) -> None:
    client, token = feed_stats_client
    with patch("app.api.jobs.get_settings") as mock_settings:
        mock_settings.return_value.job_feed_active_days = 45
        r = client.get(
            "/api/v1/jobs/feed-stats",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    data = r.json()
    assert data["active_validated_jobs"] == 1
    assert data["validated_jobs_total"] == 2
    assert data["job_feed_active_days"] == 45
    assert "market_update_label" in data
    assert "last_scrape_run_at" in data
    assert "feed_stale" in data
    assert "market_update_label" in data
