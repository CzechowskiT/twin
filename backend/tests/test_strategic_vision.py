"""Tests for strategic vision backend services."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.services.linkedin_profile_import import (
    build_profile_from_candidate,
    synthesize_profile_deterministic,
)
from app.services.opportunity_forecaster import forecast_opportunities, generate_ai_learning_path
from app.services.skill_matcher import compute_skill_match


@pytest.fixture
def vision_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(email="vision@test.com", hashed_password="x", is_active=True, plan_tier="premium", subscription_status="active")
    db.add(user)
    db.commit()
    candidate = Candidate(
        user_id=user.id,
        name="Vision Tester",
        skills='["python", "fastapi", "postgresql"]',
        experience_years=5,
        cv_text="Senior Python engineer with FastAPI and PostgreSQL experience.",
    )
    db.add(candidate)
    db.commit()
    for i in range(3):
        db.add(
            Job(
                title=f"Python Developer {i}",
                company="Acme",
                job_board="test",
                external_id=f"py-{i}",
                url=f"https://example.com/{i}",
                requirements="Python FastAPI PostgreSQL",
                is_validated=True,
            )
        )
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    yield client, headers, db, candidate
    app.dependency_overrides.clear()
    db.close()


def test_skill_matcher_bands() -> None:
    cand = {"skills": ["python", "fastapi"], "experience_years": 5}
    job = {"title": "Python Developer", "requirements": "Python FastAPI", "description": "Backend API"}
    out = compute_skill_match(cand, job)
    assert out["score"] >= 40
    assert "python" in out["matched_skills"]


def test_synthesize_profile_deterministic() -> None:
    raw = build_profile_from_candidate(
        type("C", (), {"name": "A", "skills": '["go"]', "cv_text": "Go developer"})(),
    )
    syn = synthesize_profile_deterministic(raw)
    assert syn["profile_completeness"] >= 35
    assert "skills" in syn


def test_forecast_opportunities(vision_client) -> None:
    _client, _headers, db, candidate = vision_client
    data = forecast_opportunities(db, candidate, limit_per_band=5, locale="en")
    assert "perfect" in data
    assert data["scanned_jobs"] >= 1
    if data["near_miss"]:
        assert "learning_path" in data["near_miss"][0]
        assert data["near_miss"][0]["learning_path_source"] == "deterministic"


def test_forecast_ai_learning_paths_flag(vision_client) -> None:
    _client, _headers, db, candidate = vision_client
    data = forecast_opportunities(db, candidate, limit_per_band=5, locale="en", use_ai_learning_paths=False)
    for band in ("near_miss", "stretch"):
        for entry in data.get(band, []):
            assert entry.get("learning_path_source") == "deterministic"


def test_generate_ai_learning_path_without_api() -> None:
    assert generate_ai_learning_path(title="Dev", company="Acme", band="near_miss", missing_skills=["go"], locale="en") is None


def test_opportunity_forecast_api_includes_learning_path_paywall(vision_client) -> None:
    client, headers, db, _c = vision_client
    user = db.query(User).filter(User.email == "vision@test.com").first()
    user.plan_tier = "free"
    user.subscription_status = None
    db.commit()
    res = client.get("/api/v1/opportunities/forecast", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "learning_path_paywall" in body


def test_opportunity_forecast_api(vision_client) -> None:
    client, headers, _db, _c = vision_client
    res = client.get("/api/v1/opportunities/forecast", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "perfect" in body
    assert body["summary"]["total_returned"] >= 0


def test_unified_feed_api(vision_client) -> None:
    client, headers, _db, _c = vision_client
    res = client.get("/api/v1/opportunities/unified-feed", headers=headers)
    assert res.status_code == 200
    assert "items" in res.json()


def test_gamification_progress_api(vision_client) -> None:
    client, headers, _db, _c = vision_client
    res = client.get("/api/v1/gamification/my-progress", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["level"] >= 1
    assert "xp_total" in body


def test_profile_import_cv_text(vision_client) -> None:
    client, headers, _db, _c = vision_client
    cv = "Jane Doe\nSenior Product Manager\nSkills: roadmap, stakeholders, agile\n10 years experience"
    res = client.post("/api/v1/profile/import-cv-text", headers=headers, json={"cv_text": cv})
    assert res.status_code == 200
    body = res.json()
    assert body["applied_to_profile"] is True
    assert body["profile_completeness"] >= 0


def test_interview_coach_requires_premium_on_free_tier(vision_client) -> None:
    client, headers, db, _c = vision_client
    user = db.query(User).filter(User.email == "vision@test.com").first()
    user.plan_tier = "free"
    user.subscription_status = None
    db.commit()
    job = db.query(Job).first()
    res = client.post(
        "/api/v1/interview-coach/generate-questions",
        headers=headers,
        json={"job_id": job.id},
    )
    assert res.status_code == 402
