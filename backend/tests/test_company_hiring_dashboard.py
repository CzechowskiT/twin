"""Tests for company hiring dashboard API."""

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
from app.services.company_hiring_dashboard import build_company_hiring_dashboard
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


def test_company_hiring_dashboard_api_requires_token(monkeypatch, recruiter_api_client: TestClient) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get("/api/v1/company/hiring-dashboard?company_slug=nova-hiring-pl")
        assert res.status_code == 401
    finally:
        get_settings.cache_clear()


def test_build_company_hiring_dashboard_shape() -> None:
    db = _sqlite_session()
    settings = get_settings()
    try:
        user = User(
            email="hidden@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Secret Name", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="employer",
            external_id="nova-hiring-pl-role-1",
            title="Engineer",
            company="Nova Hiring",
            url="https://example.com/j1",
            is_validated=True,
            role_status="active",
        )
        db.add(job)
        db.flush()
        db.add(Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED))
        db.commit()
        out = build_company_hiring_dashboard(
            db,
            settings,
            company_slug="nova-hiring",
            raw_token=None,
            locale="en",
        )
        assert out["company_slug"] == "nova-hiring"
        assert out["roles_total"] >= 1
        assert out["readiness"]["billing_live"] is False
        assert out["readiness"]["public_launch"] is False
        assert "email" not in str(out).lower()
    finally:
        db.close()
