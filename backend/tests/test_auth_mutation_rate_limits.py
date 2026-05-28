"""Authenticated mutation rate limits (Layer 2 extensions).

Covers match-feedback, profile PATCH, applications create after the upload
caps shipped in ff22f3a. Uses user-keyed SlowAPI buckets — see
docs/P1_RATE_LIMIT_GAPS_POST_UPLOAD_2026-05-27.md.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.database.models import Base, Candidate, Job, User
from app.database.session import get_db
from app.limiter import limiter
from app.main import app


def _sqlite_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


@pytest.fixture
def mutation_client() -> Iterator[tuple[TestClient, dict[str, str], Job, Job]]:
    db = _sqlite_db()
    now = datetime.now(timezone.utc)
    user = User(
        email="mut@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=now,
        is_active=True,
        plan_tier="premium",
        subscription_status="active",
    )
    db.add(user)
    db.flush()
    candidate = Candidate(
        user_id=user.id,
        name="Mut",
        skills='["python"]',
        preferred_job_titles='["Dev"]',
        experience_years=3,
        location="Warszawa",
    )
    db.add(candidate)
    job_a = Job(
        job_board="pracuj",
        external_id="mut1",
        title="Python Dev",
        company="Acme",
        description="Python",
        requirements="Python",
        url="https://example.com/j/mut1",
        is_validated=True,
        location="Warszawa",
    )
    job_b = Job(
        job_board="pracuj",
        external_id="mut2",
        title="Other Dev",
        company="Beta",
        description="Go",
        requirements="Go",
        url="https://example.com/j/mut2",
        is_validated=True,
        location="Kraków",
    )
    db.add_all([job_a, job_b])
    db.commit()
    db.refresh(user)
    db.refresh(job_a)
    db.refresh(job_b)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    try:
        with TestClient(app) as client:
            yield client, headers, job_a, job_b
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()
        db.close()


def test_match_feedback_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    """POST /candidates/me/match-feedback exhausts the 60/min user bucket."""
    client, headers, job_a, job_b = mutation_client
    body_a = {"job_id": job_a.id, "feedback_value": "relevant"}
    body_b = {"job_id": job_b.id, "feedback_value": "not_relevant"}
    codes: list[int] = []
    for i in range(61):
        body = body_a if i % 2 == 0 else body_b
        res = client.post("/api/v1/candidates/me/match-feedback", json=body, headers=headers)
        codes.append(res.status_code)
    assert codes.count(201) == 60, codes
    assert codes[-1] == 429


def test_profile_update_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    client, headers, _, _ = mutation_client
    body = {
        "name": "Mut",
        "skills": ["python"],
        "preferred_job_titles": ["Dev"],
        "experience_years": 3,
        "location": "Warszawa",
    }
    codes = [
        client.put("/api/v1/candidates/me", json=body, headers=headers).status_code
        for _ in range(31)
    ]
    assert codes.count(200) == 30
    assert codes[-1] == 429


def test_application_create_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    client, headers, job_a, job_b = mutation_client
    codes: list[int] = []
    for job in [job_a, job_b] * 16:  # 32 attempts, alternating jobs
        res = client.post(
            "/api/v1/applications/",
            json={"job_id": job.id, "status": "pending"},
            headers=headers,
        )
        codes.append(res.status_code)
    assert codes.count(201) == 30
    assert 429 in codes[30:]


def test_marketing_preference_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    client, headers, _, _ = mutation_client
    codes = [
        client.patch(
            "/api/v1/auth/me/marketing",
            json={"marketing_emails_opt_in": i % 2 == 0},
            headers=headers,
        ).status_code
        for i in range(31)
    ]
    assert codes.count(200) == 30
    assert codes[-1] == 429


def test_notification_preferences_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    client, headers, _, _ = mutation_client
    codes = [
        client.patch(
            "/api/v1/auth/me/notification-preferences",
            json={"email_interview_reminders": i % 2 == 0},
            headers=headers,
        ).status_code
        for i in range(31)
    ]
    assert codes.count(200) == 30
    assert codes[-1] == 429


def test_billing_profile_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    client, headers, _, _ = mutation_client
    codes = [
        client.patch(
            "/api/v1/auth/me/billing-profile",
            json={"billing_company_name": f"Acme {i}"},
            headers=headers,
        ).status_code
        for i in range(31)
    ]
    assert codes.count(200) == 30
    assert codes[-1] == 429


def test_onboarding_complete_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    client, headers, _, _ = mutation_client
    codes = [
        client.post("/api/v1/auth/onboarding/complete", headers=headers).status_code
        for _ in range(31)
    ]
    assert codes.count(200) == 30
    assert codes[-1] == 429


def test_gdpr_consent_rate_limit_returns_429(
    mutation_client: tuple[TestClient, dict[str, str], Job, Job],
) -> None:
    client, headers, _, _ = mutation_client
    body = {
        "accept_privacy_policy": True,
        "accept_terms_of_service": True,
        "accept_job_data_processing": True,
        "accept_ai_matching": True,
        "marketing_emails_opt_in": False,
    }
    codes = [client.post("/api/v1/auth/gdpr-consent", json=body, headers=headers).status_code for _ in range(31)]
    assert codes.count(200) == 30
    assert codes[-1] == 429
