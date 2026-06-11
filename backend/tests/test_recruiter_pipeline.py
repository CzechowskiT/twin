"""Recruiter ATS-lite pipeline API and stage resolution."""

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
from app.services.recruiter_inbox import respond_recruiter_batch
from app.services.recruiter_pipeline import (
    build_recruiter_pipeline,
    effective_pipeline_status,
    transition_recruiter_pipeline,
)
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


def _seed_application(db, *, status: ApplicationStatus, pipeline: str | None = None) -> Application:
    user = User(
        email=f"pipe-{status.value}@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Pipeline Cand", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    job = Job(
        job_board="pracuj",
        external_id=f"pipe-{status.value}",
        title="Engineer",
        company="Pipe Co",
        url="https://example.com/p",
        is_validated=True,
    )
    db.add(job)
    db.flush()
    app_row = Application(
        candidate_id=cand.id,
        job_id=job.id,
        status=status,
        recruiter_pipeline_status=pipeline,
    )
    db.add(app_row)
    db.commit()
    return app_row


def test_effective_pipeline_status_maps_applied_to_review() -> None:
    db = _sqlite_session()
    try:
        app_row = _seed_application(db, status=ApplicationStatus.APPLIED)
        assert effective_pipeline_status(app_row) == "review"
    finally:
        db.close()


def test_accept_sets_pipeline_accepted() -> None:
    db = _sqlite_session()
    try:
        app_row = _seed_application(db, status=ApplicationStatus.APPLIED)
        respond_recruiter_batch(
            db, company_slug="pipe-co", application_id=app_row.id, action="accept"
        )
        db.refresh(app_row)
        assert app_row.status == ApplicationStatus.INTERVIEW
        assert app_row.recruiter_pipeline_status == "accepted"
    finally:
        db.close()


def test_build_recruiter_pipeline_returns_counts() -> None:
    db = _sqlite_session()
    try:
        _seed_application(db, status=ApplicationStatus.APPLIED)
        _seed_application(db, status=ApplicationStatus.INTERVIEW, pipeline="invited")
        out = build_recruiter_pipeline(db, company_slug="pipe-co")
        assert out["total"] >= 2
        assert "counts_by_status" in out
        assert out["items"][0]["pipeline_status"] in {
            "review",
            "accepted",
            "invited",
            "to_contact",
            "rejected",
            "on_hold",
            "new",
        }
    finally:
        db.close()


def test_transition_to_contact_and_reject() -> None:
    db = _sqlite_session()
    try:
        app_row = _seed_application(db, status=ApplicationStatus.INTERVIEW, pipeline="accepted")
        out = transition_recruiter_pipeline(
            db,
            company_slug="pipe-co",
            application_id=app_row.id,
            action="to_contact",
        )
        assert out["pipeline_status"] == "to_contact"
        transition_recruiter_pipeline(
            db,
            company_slug="pipe-co",
            application_id=app_row.id,
            action="reject",
        )
        db.refresh(app_row)
        assert app_row.recruiter_pipeline_status == "rejected"
        assert app_row.status == ApplicationStatus.REJECTED
    finally:
        db.close()


def test_recruiter_pipeline_api_requires_token(
    monkeypatch, recruiter_api_client: TestClient
) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get("/api/v1/recruiter/pipeline?company_slug=pipe-co")
        assert res.status_code == 401
    finally:
        get_settings.cache_clear()
