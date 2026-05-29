"""Ops demo refresh endpoints."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


class _OpsSettings:
    ops_admin_token = "test-ops-token"
    beta_admin_token = ""


def test_ops_recruiter_inbox_refresh_requires_token() -> None:
    app.dependency_overrides[get_settings] = lambda: _OpsSettings()
    try:
        client = TestClient(app)
        res = client.post("/api/v1/ops/demo/recruiter-inbox-refresh")
        assert res.status_code == 401
    finally:
        app.dependency_overrides.pop(get_settings, None)


def test_ops_recruiter_inbox_refresh_resets_applied() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    now = datetime.now(timezone.utc)
    user = User(
        email="demo@twin.career",
        hashed_password="x",
        gdpr_consent_at=now,
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

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: _OpsSettings()
    try:
        client = TestClient(app)
        res = client.post(
            "/api/v1/ops/demo/recruiter-inbox-refresh",
            headers={"Authorization": "Bearer test-ops-token"},
            json={"company": "Nova Hiring PL"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["inbox_applied"] >= 1
        assert body["company_slug"] == "nova-hiring-pl"
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_settings, None)
        db.close()


def test_ops_placement_verify_seed_marks_hired() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    now = datetime.now(timezone.utc)
    user = User(
        email="demo@twin.career",
        hashed_password="x",
        gdpr_consent_at=now,
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
        status=ApplicationStatus.APPLIED,
        notes="Investor demo",
    )
    db.add(app_row)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: _OpsSettings()
    try:
        client = TestClient(app)
        res = client.post(
            "/api/v1/ops/demo/placement-verify-seed",
            headers={"Authorization": "Bearer test-ops-token"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["verified"] is True
        assert body["application_id"] == app_row.id
        db.refresh(app_row)
        assert app_row.placement_verified_at is not None
        assert app_row.status == ApplicationStatus.HIRED
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_settings, None)
        db.close()
