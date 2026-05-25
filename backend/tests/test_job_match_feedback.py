"""Per-job match feedback API and reranking."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.database.models import Base, Candidate, Job, JobMatchFeedback, User
from app.database.session import get_db
from app.main import app
from app.matching.ranking import feed_dedupe_key
from app.services.job_match_feedback import (
    excluded_feed_dedupe_keys,
    excluded_job_ids,
    upsert_feedback,
)
from app.services.matching_service import find_top_matches


@pytest.fixture
def jmf_db():
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


@pytest.fixture
def jmf_client(jmf_db):
    def override_get_db():
        try:
            yield jmf_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _seed_candidate_job(db, *, skills: str = '["python"]') -> tuple[User, Candidate, Job]:
    now = datetime.now(timezone.utc)
    user = User(
        email="jmf@example.com",
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
        name="Test",
        skills=skills,
        preferred_job_titles='["Python Developer"]',
        experience_years=5,
        location="Warszawa",
    )
    db.add(candidate)
    job = Job(
        job_board="pracuj",
        external_id="jmf1",
        title="Python Developer",
        company="Acme",
        description="Python FastAPI",
        requirements="Python REST",
        url="https://example.com/j/jmf1",
        is_validated=True,
        location="Warszawa",
    )
    db.add(job)
    db.commit()
    db.refresh(user)
    db.refresh(candidate)
    db.refresh(job)
    return user, candidate, job


def test_not_relevant_excluded_from_find_top_matches(jmf_db) -> None:
    _, candidate, job = _seed_candidate_job(jmf_db)
    upsert_feedback(
        jmf_db,
        candidate_id=candidate.id,
        job_id=job.id,
        feedback_value="not_relevant",
    )
    assert job.id in excluded_job_ids(jmf_db, candidate.id)
    rows = find_top_matches(jmf_db, candidate, limit=10, min_score=30.0, persist=False)
    assert all(r["job_id"] != job.id for r in rows)


def test_not_relevant_suppresses_duplicate_feed_key(jmf_db) -> None:
    """Sibling listing (other job_id, same role) must not reappear after dedupe."""
    _, candidate, job = _seed_candidate_job(jmf_db)
    sibling = Job(
        job_board="rocketjobs.pl",
        external_id="jmf-dup",
        title=job.title,
        company=job.company,
        description=job.description,
        requirements=job.requirements,
        url="https://example.com/j/jmf-dup",
        is_validated=True,
        location=job.location,
    )
    jmf_db.add(sibling)
    jmf_db.commit()
    jmf_db.refresh(sibling)
    assert sibling.id != job.id
    assert feed_dedupe_key(job) == feed_dedupe_key(sibling)

    upsert_feedback(
        jmf_db,
        candidate_id=candidate.id,
        job_id=job.id,
        feedback_value="not_relevant",
    )
    assert feed_dedupe_key(job) in excluded_feed_dedupe_keys(jmf_db, candidate.id)

    rows = find_top_matches(jmf_db, candidate, limit=10, min_score=30.0, persist=False)
    returned_ids = {r["job_id"] for r in rows}
    assert job.id not in returned_ids
    assert sibling.id not in returned_ids


def test_apply_intent_still_surfaces_after_relevant_feedback(jmf_db) -> None:
    _, candidate, job = _seed_candidate_job(jmf_db)
    upsert_feedback(
        jmf_db,
        candidate_id=candidate.id,
        job_id=job.id,
        feedback_value="apply_intent",
    )
    rows = find_top_matches(jmf_db, candidate, limit=10, min_score=30.0, persist=False)
    assert any(r["job_id"] == job.id for r in rows)


def test_not_now_still_surfaces_with_penalty(jmf_db) -> None:
    _, candidate, job = _seed_candidate_job(jmf_db)
    upsert_feedback(
        jmf_db,
        candidate_id=candidate.id,
        job_id=job.id,
        feedback_value="not_now",
    )
    rows = find_top_matches(jmf_db, candidate, limit=10, min_score=30.0, persist=False)
    assert any(r["job_id"] == job.id for r in rows)


def test_match_feedback_api_roundtrip(jmf_client, jmf_db) -> None:
    user, candidate, job = _seed_candidate_job(jmf_db)
    token = create_access_token(user.email)
    res = jmf_client.post(
        "/api/v1/candidates/me/match-feedback",
        json={"job_id": job.id, "feedback_value": "apply_intent"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    assert res.json()["feedback_value"] == "apply_intent"
    listed = jmf_client.get(
        "/api/v1/candidates/me/match-feedback",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listed.status_code == 200
    assert any(i["job_id"] == job.id for i in listed.json()["items"])
    row = jmf_db.query(JobMatchFeedback).filter(JobMatchFeedback.candidate_id == candidate.id).one()
    assert row.feedback_value == "apply_intent"


def test_not_relevant_api_then_matches_excludes_job(jmf_client, jmf_db) -> None:
    user, candidate, job = _seed_candidate_job(jmf_db)
    token = create_access_token(user.email)
    post = jmf_client.post(
        "/api/v1/candidates/me/match-feedback",
        json={"job_id": job.id, "feedback_value": "not_relevant"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert post.status_code == 201
    matches = jmf_client.get(
        "/api/v1/candidates/me/matches?limit=20&min_score=30",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert matches.status_code == 200
    ids = {item["job_id"] for item in matches.json()["items"]}
    assert job.id not in ids
