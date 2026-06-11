"""Tests for recruiter analytics API."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.services.recruiter_analytics import build_recruiter_analytics
from tests.test_auth_integration import _sqlite_session


@pytest.fixture
def recruiter_api_client() -> Iterator[TestClient]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
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


def test_recruiter_analytics_api_requires_token(monkeypatch, recruiter_api_client: TestClient) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get("/api/v1/recruiter/analytics?company_slug=nova-hiring-pl")
        assert res.status_code == 401
    finally:
        get_settings.cache_clear()


def test_build_recruiter_analytics_shape() -> None:
    db = _sqlite_session()
    try:
        user = User(email="h@example.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Hidden", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="employer",
            external_id="nova-hiring-pl-r1",
            title="Eng",
            company="Nova",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED))
        db.commit()
        out = build_recruiter_analytics(db, company_slug="nova-hiring-pl")
        assert out["applications_total"] >= 1
        assert out["calendar_sync_live"] is False
        assert "email" not in str(out).lower()
    finally:
        db.close()
