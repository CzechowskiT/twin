"""Contract: autonomous applying requires verified-readiness, not only profile_ready."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import AutoApplyConsent, Base, Candidate, User
from app.database.session import get_db
from app.main import app
from app.services.candidate_readiness import autonomous_apply_allowed


def _gateway_signals() -> dict:
    return {
        "career_compass": {"ideal": {"job_title": "Backend Engineer"}},
        "cv_insights": {"summary": "Strong Python profile"},
    }


@pytest.fixture
def gate_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(
        email="auto-gate@test.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=datetime.now(timezone.utc),
        onboarding_completed_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    candidate = Candidate(
        user_id=user.id,
        name="Gate",
        cv_text="CV",
        cv_processing_consent_at=datetime.now(timezone.utc),
        profile_signals_json=json.dumps(_gateway_signals()),
    )
    db.add(candidate)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    yield client, headers, db, user, candidate
    app.dependency_overrides.clear()
    db.close()


def test_autonomous_apply_allowed_when_verified_ready(gate_client) -> None:
    _client, _headers, _db, user, candidate = gate_client
    assert autonomous_apply_allowed(user, candidate) is True


def test_settings_reports_verified_readiness_ready(gate_client) -> None:
    client, headers, _db, _user, _candidate = gate_client
    res = client.get("/api/v1/auto-apply/settings", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["profile_ready"] is True
    assert body["verified_readiness_ready"] is True
    assert body["is_active"] is False


def test_consent_blocked_without_career_brief(gate_client) -> None:
    client, headers, db, _user, candidate = gate_client
    candidate.profile_signals_json = json.dumps({"cv_insights": {"summary": "x"}})
    db.commit()
    res = client.post(
        "/api/v1/auto-apply/consent",
        headers=headers,
        json={"consent_acknowledged": True, "min_score_threshold": 90, "daily_limit": 5},
    )
    assert res.status_code == 400
    assert "verified readiness" in res.json().get("detail", "").lower()


def test_patch_enable_blocked_without_verified_readiness(gate_client) -> None:
    client, headers, db, _user, candidate = gate_client
    consent = AutoApplyConsent(
        candidate_id=candidate.id,
        is_active=False,
        consent_given_at=datetime.now(timezone.utc),
        consent_text_version="v1",
        min_score_threshold=90.0,
        daily_limit=5,
    )
    db.add(consent)
    candidate.profile_signals_json = None
    db.commit()
    res = client.patch(
        "/api/v1/auto-apply/settings",
        headers=headers,
        json={"is_active": True},
    )
    assert res.status_code == 400
    assert "verified readiness" in res.json().get("detail", "").lower()


def test_trigger_blocked_without_verified_readiness(gate_client) -> None:
    client, headers, db, _user, candidate = gate_client
    consent = AutoApplyConsent(
        candidate_id=candidate.id,
        is_active=True,
        consent_given_at=datetime.now(timezone.utc),
        consent_text_version="v1",
        min_score_threshold=90.0,
        daily_limit=5,
    )
    db.add(consent)
    candidate.profile_signals_json = json.dumps({"cv_insights": {"summary": "only"}})
    db.commit()
    res = client.post("/api/v1/auto-apply/trigger", headers=headers)
    assert res.status_code == 400
    assert "verified readiness" in res.json().get("detail", "").lower()


def test_trigger_sweep_still_ops_gated(gate_client, monkeypatch) -> None:
    from app.config import get_settings

    client, headers, _user, _user2, _candidate = gate_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", "")
    get_settings.cache_clear()
    with patch("app.api.auto_apply_settings.nightly_auto_apply_sweep") as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)
    assert res.status_code == 403
    mock_sweep.assert_not_called()


def test_nightly_process_skips_when_readiness_incomplete(gate_client) -> None:
    from app.config import get_settings
    from app.services.nightly_auto_apply import process_user_nightly_auto_apply

    _client, _headers, db, user, candidate = gate_client
    candidate.profile_signals_json = None
    db.commit()
    consent = AutoApplyConsent(
        candidate_id=candidate.id,
        is_active=True,
        consent_given_at=datetime.now(timezone.utc),
        consent_text_version="v1",
        min_score_threshold=90.0,
        daily_limit=5,
    )
    db.add(consent)
    db.commit()
    settings = get_settings()
    row = process_user_nightly_auto_apply(
        db, user=user, consent=consent, settings=settings, max_jobs=1, cooldown_seconds=0
    )
    assert row["skipped_reason"] == "verified_readiness_incomplete"
    assert row["applications_submitted"] == 0


def test_settings_get_is_read_only(gate_client) -> None:
    client, headers, _db, _user, _candidate = gate_client
    assert client.get("/api/v1/auto-apply/settings", headers=headers).status_code == 200
    assert client.post("/api/v1/auto-apply/settings", headers=headers, json={}).status_code in (
        404,
        405,
    )
