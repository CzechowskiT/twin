"""Career assistant services and API (US-C052–057)."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.database.models import (
    Application,
    ApplicationStatus,
    Base,
    Candidate,
    Job,
    ScheduledInterview,
    User,
)
from app.database.session import get_db
from app.main import app
from app.services.career_assistant.ats_cv import optimize_cv_for_application
from app.services.career_assistant.hiring_insights import research_hiring_insights_for_job
from app.services.career_assistant_common import keyword_match_percent


@pytest.fixture
def ca_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        yield db
    finally:
        db.close()


def _seed_user_candidate_job_app(db) -> tuple[User, Candidate, Job, Application]:
    now = datetime.now(timezone.utc)
    user = User(
        email="ca@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=now,
        is_active=True,
    )
    db.add(user)
    db.flush()
    candidate = Candidate(
        user_id=user.id,
        name="Test User",
        skills='["python"]',
        preferred_job_titles="[]",
        experience_years=5,
        cv_text="Senior Python engineer. Built APIs with FastAPI and PostgreSQL. Led delivery.",
    )
    db.add(candidate)
    job = Job(
        job_board="pracuj",
        external_id="ca1",
        title="Python Developer",
        company="Acme",
        description="FastAPI PostgreSQL delivery ownership",
        requirements="Python FastAPI",
        url="https://example.com/j/ca1",
        is_validated=True,
        salary_min=15000,
        salary_max=22000,
    )
    db.add(job)
    db.flush()
    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        status=ApplicationStatus.APPLIED,
    )
    db.add(application)
    db.commit()
    db.refresh(user)
    db.refresh(candidate)
    db.refresh(job)
    db.refresh(application)
    return user, candidate, job, application


def test_keyword_match_percent() -> None:
    assert keyword_match_percent("python fastapi api", "python fastapi postgres") > 0
    assert keyword_match_percent("", "python") == 0.0


def test_ats_cv_optimize_fallback(ca_db) -> None:
    _, candidate, job, application = _seed_user_candidate_job_app(ca_db)
    row = optimize_cv_for_application(ca_db, candidate=candidate, application=application, job=job)
    assert row.match_after >= row.match_before
    assert row.optimized_cv_text
    assert "changes" in row.changes_json or row.changes_json.startswith("[")


def test_hiring_insights_fallback(ca_db) -> None:
    _, _, job, _ = _seed_user_candidate_job_app(ca_db)
    insights, researched_at, from_cache = research_hiring_insights_for_job(ca_db, job)
    assert from_cache is False
    assert len(insights["top_traits"]) == 3
    assert researched_at is not None


def test_hiring_insights_cache(ca_db) -> None:
    from app.database.models import HiringInsightsCache

    _, _, job, _ = _seed_user_candidate_job_app(ca_db)
    now = datetime.now(timezone.utc)
    ca_db.add(
        HiringInsightsCache(
            job_id=job.id,
            insights_json='{"top_traits":["A","B","C"],"red_flags":["X","Y","Z"],'
            '"interview_focus":["f1","f2","f3","f4"],"bar_summary":"Cached."}',
            researched_at=now,
            expires_at=now + timedelta(days=7),
        )
    )
    ca_db.commit()
    insights, _, from_cache = research_hiring_insights_for_job(ca_db, job)
    assert from_cache is True
    assert insights["bar_summary"] == "Cached."


def test_career_assistant_api_hiring_insights() -> None:
    db = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(db)
    Session = sessionmaker(bind=db, autocommit=False, autoflush=False)
    session = Session()
    user, _, job, _ = _seed_user_candidate_job_app(session)

    def override_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    try:
        client = TestClient(app)
        res = client.post(f"/api/v1/career-assistant/jobs/{job.id}/hiring-insights", headers=headers)
        assert res.status_code == 200
        body = res.json()
        assert body["job_id"] == job.id
        assert len(body["insights"]["top_traits"]) == 3
    finally:
        app.dependency_overrides.clear()
        session.close()
