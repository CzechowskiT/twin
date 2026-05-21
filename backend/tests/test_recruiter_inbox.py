from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.main import app
from app.services.recruiter_inbox import build_recruiter_batch, respond_recruiter_batch
from tests.test_auth_integration import _sqlite_session


def test_build_recruiter_batch_filters_company() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="rec@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Alex", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="r-j1",
            title="Engineer",
            company="Acme Corp",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.APPLIED,
            )
        )
        db.commit()
        out = build_recruiter_batch(db, company_slug="acme-corp")
        assert out["total"] == 1
        assert out["items"][0]["candidate_name"] == "Alex"
    finally:
        db.close()


def test_respond_accept_moves_to_interview() -> None:
    db = _sqlite_session()
    try:
        user = User(email="r2@example.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="B", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="r-j2",
            title="Dev",
            company="Bravo Inc",
            url="https://example.com/j2",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app_row = Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
        )
        db.add(app_row)
        db.commit()
        out = respond_recruiter_batch(
            db, company_slug="bravo-inc", application_id=app_row.id, action="accept"
        )
        assert out["status"] == "interview"
    finally:
        db.close()


def test_recruiter_api_requires_token(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    client = TestClient(app)
    try:
        res = client.get("/api/v1/recruiter/inbox?company_slug=acme-corp")
        assert res.status_code == 401
    finally:
        get_settings.cache_clear()
