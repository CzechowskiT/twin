from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.services.recruiter_inbox import build_recruiter_batch, respond_recruiter_batch
from tests.test_auth_integration import _sqlite_session


@pytest.fixture
def recruiter_api_client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_db, None)


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


def test_build_recruiter_batch_includes_rejected() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="rej@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Declined", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="r-rej",
            title="PM",
            company="Echo Ltd",
            url="https://example.com/rej",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.REJECTED,
            )
        )
        db.commit()
        out = build_recruiter_batch(db, company_slug="echo-ltd")
        assert out["total"] == 1
        assert out["items"][0]["status"] == "rejected"
    finally:
        db.close()


def test_respond_decline_stores_note() -> None:
    db = _sqlite_session()
    try:
        user = User(email="r3@example.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="r-j3",
            title="QA",
            company="Charlie LLC",
            url="https://example.com/j3",
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
        respond_recruiter_batch(
            db,
            company_slug="charlie-llc",
            application_id=app_row.id,
            action="decline",
            decline_note="Not senior enough for this quarter",
        )
        db.refresh(app_row)
        assert app_row.status == ApplicationStatus.REJECTED
        assert "senior" in (app_row.recruiter_feedback_raw or "")
    finally:
        db.close()


def test_respond_recruiter_batch_bulk() -> None:
    db = _sqlite_session()
    try:
        user = User(email="bulk@example.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Bulk", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="r-bulk",
            title="Engineer",
            company="Delta Co",
            url="https://example.com/jb",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        apps = [
            Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED),
            Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED),
        ]
        db.add_all(apps)
        db.commit()
        from app.services.recruiter_inbox import respond_recruiter_batch_bulk

        out = respond_recruiter_batch_bulk(
            db,
            company_slug="delta-co",
            application_ids=[apps[0].id, apps[1].id],
            action="accept",
        )
        assert out["succeeded"] == 2
        assert out["failed"] == 0
    finally:
        db.close()


def test_ensure_recruiter_inbox_demo_resets_interview() -> None:
    from app.services.investor_demo_seed import ensure_recruiter_inbox_demo

    db = _sqlite_session()
    try:
        user = User(
            email="demo@twin.career",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Alex", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="investor-demo-python-lead",
            title="Engineer",
            company="Nova Hiring PL",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app_row = Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.INTERVIEW,
            notes="Investor demo — recruiter batch inbox",
        )
        db.add(app_row)
        db.commit()
        out = ensure_recruiter_inbox_demo(db, company="Nova Hiring PL")
        db.commit()
        db.refresh(app_row)
        assert out["reset_to_applied"] == 1
        assert app_row.status == ApplicationStatus.APPLIED
    finally:
        db.close()


def test_recruiter_api_requires_token(monkeypatch, recruiter_api_client: TestClient) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get("/api/v1/recruiter/inbox?company_slug=acme-corp")
        assert res.status_code == 401
        assert res.json()["detail"] == "recruiter_inbox_invalid_token"
        res2 = recruiter_api_client.get(
            "/api/v1/recruiter/inbox?company_slug=acme-corp",
            headers={"X-Twin-Recruiter-Token": "wrong"},
        )
        assert res2.status_code == 401
        assert res2.json()["detail"] == "recruiter_inbox_invalid_token"
        assert "RECRUITER_INBOX_TOKEN" not in res2.text
    finally:
        get_settings.cache_clear()


def test_recruiter_api_unavailable_when_not_configured(
    monkeypatch, recruiter_api_client: TestClient
) -> None:
    from app.config import get_settings

    monkeypatch.delenv("RECRUITER_INBOX_TOKEN", raising=False)
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get(
            "/api/v1/recruiter/inbox?company_slug=acme-corp",
            headers={"X-Twin-Recruiter-Token": "any"},
        )
        assert res.status_code == 503
        assert res.json()["detail"] == "recruiter_inbox_unavailable"
        assert "RECRUITER_INBOX_TOKEN" not in res.text
    finally:
        get_settings.cache_clear()
