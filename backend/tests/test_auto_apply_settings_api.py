"""Auto-apply settings API."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import Application, AutoApplyConsent, AutoApplyRun, Base, Candidate, Job, JobMatch, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def auto_apply_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    from datetime import datetime, timezone

    user = User(email="auto@test.com", hashed_password="x", is_active=True)
    user.onboarding_completed_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    candidate = Candidate(user_id=user.id, name="Auto", cv_text="Backend engineer CV")
    db.add(candidate)
    db.commit()
    job = Job(
        title="Dev",
        company="Acme",
        job_board="pracuj",
        external_id="x-1",
        url="https://www.pracuj.pl/x",
        is_validated=True,
    )
    db.add(job)
    db.commit()
    db.add(JobMatch(candidate_id=candidate.id, job_id=job.id, score=95.0))
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
    yield client, headers, db, candidate, job
    app.dependency_overrides.clear()
    db.close()


def test_settings_default(auto_apply_client) -> None:
    client, headers, _db, _c, _job = auto_apply_client
    res = client.get("/api/v1/auto-apply/settings", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["is_active"] is False
    assert body["min_score_threshold"] == 90.0
    assert body["profile_ready"] is True
    assert body["onboarding_completed"] is True


def test_settings_cv_file_only_ready(auto_apply_client) -> None:
    client, headers, db, candidate, _job = auto_apply_client
    candidate.cv_text = None
    candidate.cv_filename = "resume.pdf"
    candidate.resume_path = "/data/cv/resume.pdf"
    db.commit()
    res = client.get("/api/v1/auto-apply/settings", headers=headers)
    assert res.status_code == 200
    assert res.json()["profile_ready"] is True


def test_settings_not_ready_without_onboarding(auto_apply_client) -> None:
    client, headers, db, candidate, _job = auto_apply_client
    user = db.query(User).filter(User.id == candidate.user_id).first()
    user.onboarding_completed_at = None
    db.commit()
    res = client.get("/api/v1/auto-apply/settings", headers=headers)
    assert res.status_code == 200
    assert res.json()["profile_ready"] is False


def test_consent_and_trigger(auto_apply_client, monkeypatch) -> None:
    from unittest.mock import patch

    from app.automation.types import ApplyOutcome
    from app.config import get_settings
    from app.database.models import SubmissionStatus

    client, headers, db, candidate, job = auto_apply_client
    monkeypatch.setenv("NIGHTLY_AUTO_APPLY_COOLDOWN_SECONDS", "0")
    get_settings.cache_clear()
    res = client.post(
        "/api/v1/auto-apply/consent",
        headers=headers,
        json={"consent_acknowledged": True, "min_score_threshold": 90, "daily_limit": 5},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is True

    # SUBMITTED without evidence → attempted, not confirmed (P0 truth model).
    app_row = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        status="applied",
        submission_status=SubmissionStatus.EXTERNAL_SUBMIT_ATTEMPTED,
    )

    with (
        patch("app.services.nightly_auto_apply.find_top_matches"),
        patch(
            "app.services.nightly_auto_apply.auto_apply_for_user",
            return_value=(ApplyOutcome.SUBMITTED, "ok", app_row),
        ),
    ):
        trig = client.post("/api/v1/auto-apply/trigger", headers=headers)

    assert trig.status_code == 200
    assert trig.json()["applications_submitted"] == 1
    assert "message" in trig.json()
    consent = db.query(AutoApplyConsent).filter(AutoApplyConsent.candidate_id == candidate.id).first()
    assert consent is not None
    assert consent.consent_given_at is not None


def test_last_sweep_returns_board_breakdown(auto_apply_client) -> None:
    from datetime import datetime, timezone
    import json

    client, headers, db, _candidate, _job = auto_apply_client
    db.add(
        AutoApplyRun(
            started_at=datetime(2026, 5, 24, 0, 0, tzinfo=timezone.utc),
            finished_at=datetime(2026, 5, 24, 0, 5, tzinfo=timezone.utc),
            total_users_processed=1,
            total_applications_submitted=2,
            total_applications_failed=0,
            stats_json=json.dumps(
                {
                    "demo": True,
                    "total_applications_skipped": 3,
                    "boards": {"pracuj.pl": {"submitted": 2, "failed": 0, "skipped": 3}},
                }
            ),
        )
    )
    db.commit()

    res = client.get("/api/v1/auto-apply/last-sweep", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total_applications_submitted"] == 2
    assert body["total_applications_failed"] == 0
    assert body["total_applications_skipped"] == 3
    assert body["is_demo_seed"] is True
    assert body["boards"][0]["board"] == "pracuj.pl"
    assert body["boards"][0]["skipped"] == 3
    assert body["started_at"].endswith("+00:00") or body["started_at"].endswith("Z")
