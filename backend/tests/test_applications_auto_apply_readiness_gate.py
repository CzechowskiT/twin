"""POST /applications/auto-apply requires verified-readiness (GAP-01)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.automation.types import ApplyOutcome
from app.core.security import create_access_token
from app.database.models import Base, Candidate, CandidateCareerCompass, Job, User
from app.database.session import get_db
from app.main import app
from tests.career_compass_fixtures import seed_complete_career_compass


def _gateway_signals() -> dict:
    return {"cv_insights": {"summary": "Strong Python profile"}}


@pytest.fixture
def apply_gate_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(
        email="apply-gate@test.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=datetime.now(timezone.utc),
        onboarding_completed_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    job = Job(
        title="Backend",
        company="Acme",
        job_board="pracuj.pl",
        external_id="gate-1",
        url="https://pracuj.pl/offer/gate-1",
        is_validated=True,
    )
    db.add(job)
    candidate = Candidate(
        user_id=user.id,
        name="Gate",
        cv_text="CV",
        cv_processing_consent_at=datetime.now(timezone.utc),
        profile_signals_json=json.dumps(_gateway_signals()),
    )
    db.add(candidate)
    db.commit()
    seed_complete_career_compass(db, candidate)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {create_access_token(user.email)}"}
    yield client, headers, db, user, candidate, job
    app.dependency_overrides.clear()
    db.close()


def test_applications_auto_apply_blocked_without_readiness(apply_gate_client) -> None:
    client, headers, db, _user, candidate, job = apply_gate_client
    db.query(CandidateCareerCompass).filter(CandidateCareerCompass.candidate_id == candidate.id).delete()
    candidate.profile_signals_json = json.dumps({"cv_insights": {"summary": "only"}})
    db.commit()
    with patch("app.api.applications.auto_apply_for_user") as mock_apply:
        res = client.post(
            "/api/v1/applications/auto-apply",
            headers=headers,
            json={"job_id": job.id, "human_acknowledged": True},
        )
    assert res.status_code == 403
    assert "verified readiness" in res.json().get("detail", "").lower()
    mock_apply.assert_not_called()


def test_applications_auto_apply_allowed_when_ready(apply_gate_client) -> None:
    client, headers, _db, _user, _candidate, job = apply_gate_client
    with patch(
        "app.api.applications.auto_apply_for_user",
        return_value=(ApplyOutcome.SUBMITTED, "ok", None),
    ) as mock_apply:
        res = client.post(
            "/api/v1/applications/auto-apply",
            headers=headers,
            json={"job_id": job.id, "human_acknowledged": True},
        )
    assert res.status_code == 200
    mock_apply.assert_called_once()
