"""Rate-limit coverage for saved jobs mutation endpoints."""

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


@pytest.fixture
def saved_job_client() -> Iterator[tuple[TestClient, dict[str, str], Job]]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, autocommit=False, autoflush=False)()
    now = datetime.now(timezone.utc)
    user = User(
        email="saved-limit@example.com",
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
        name="Saved Tester",
        skills='["python"]',
        preferred_job_titles='["Developer"]',
        experience_years=2,
        location="Warszawa",
    )
    job = Job(
        job_board="pracuj",
        external_id="saved-limit-job",
        title="Backend Developer",
        company="Acme",
        description="desc",
        requirements="req",
        url="https://example.com/saved-limit",
        is_validated=True,
        location="Warszawa",
    )
    db.add_all([candidate, job])
    db.commit()
    db.refresh(job)

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
            yield client, headers, job
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()
        db.close()


def test_save_job_rate_limit_returns_429(saved_job_client: tuple[TestClient, dict[str, str], Job]) -> None:
    client, headers, job = saved_job_client
    codes = [client.post(f"/api/v1/jobs/saved/{job.id}", headers=headers).status_code for _ in range(31)]
    assert codes.count(200) == 30, codes
    assert codes[-1] == 429


def test_unsave_job_rate_limit_returns_429(saved_job_client: tuple[TestClient, dict[str, str], Job]) -> None:
    client, headers, job = saved_job_client
    codes = [client.delete(f"/api/v1/jobs/saved/{job.id}", headers=headers).status_code for _ in range(31)]
    assert codes.count(200) == 30, codes
    assert codes[-1] == 429


def test_unauth_saved_job_mutations_return_401(saved_job_client: tuple[TestClient, dict[str, str], Job]) -> None:
    client, _, job = saved_job_client
    save_codes = [client.post(f"/api/v1/jobs/saved/{job.id}").status_code for _ in range(5)]
    unsave_codes = [client.delete(f"/api/v1/jobs/saved/{job.id}").status_code for _ in range(5)]
    assert save_codes == [401, 401, 401, 401, 401]
    assert unsave_codes == [401, 401, 401, 401, 401]
