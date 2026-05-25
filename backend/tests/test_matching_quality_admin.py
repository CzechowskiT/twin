"""Admin matching-quality metrics endpoint."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, Candidate, JobMatchFeedback, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def mq_admin_client(monkeypatch):
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

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    now = datetime.now(timezone.utc)
    user = User(
        email="mq@example.com",
        hashed_password="x",
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=now,
        is_active=True,
    )
    db.add(user)
    db.flush()
    candidate = Candidate(user_id=user.id, name="MQ", skills="[]", preferred_job_titles="[]")
    db.add(candidate)
    db.flush()
    db.add(
        JobMatchFeedback(
            candidate_id=candidate.id,
            job_id=1,
            feedback_value="relevant",
        )
    )
    db.commit()
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_matching_quality_admin_requires_token(mq_admin_client) -> None:
    client, _ = mq_admin_client
    res = client.get("/api/v1/admin/matching-quality")
    assert res.status_code == 401


def test_matching_quality_admin_ok(mq_admin_client) -> None:
    client, _ = mq_admin_client
    res = client.get(
        "/api/v1/admin/matching-quality",
        headers={"Authorization": "Bearer test-ops-token"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["relevant_count"] >= 1
    assert body["dashboard_min_score"] == 38.0
    assert body["top_200_limit"] == 200
