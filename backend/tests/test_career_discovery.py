"""Tests for career discovery services and API."""

import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.database.models import User
from app.main import app
from app.services.career_discovery import detect_red_flags, red_flag_summary, score_job_match


def test_detect_red_flags_fluff_and_salary() -> None:
    hits = detect_red_flags(
        title="Rockstar Python Ninja",
        description="Fast-paced startup, competitive salary",
        salary_min=None,
        salary_max=None,
        skills=["python"] * 16,
    )
    codes = {h.code for h in hits}
    assert "rockstar" in codes or "ninja" in codes
    assert "no_salary_disclosed" in codes
    assert "skill_sprawl" in codes
    summary = red_flag_summary(hits)
    assert "red flag" in summary.lower()


def test_detect_red_flags_clean_listing() -> None:
    hits = detect_red_flags(
        title="Backend Engineer",
        description="Python FastAPI PostgreSQL",
        salary_min=15000,
        salary_max=22000,
        skills=["python", "fastapi"],
    )
    assert hits == []
    assert red_flag_summary(hits) == "No red flags detected."


def test_score_job_match_uses_matcher() -> None:
    candidate = {
        "skills": ["python", "fastapi"],
        "preferred_job_titles": ["engineer"],
        "experience_years": 5,
        "desired_salary": 18000,
        "location": "Warsaw",
        "cv_text": "Built APIs with FastAPI and PostgreSQL.",
    }
    job = {
        "title": "Python Engineer",
        "requirements": "Python FastAPI PostgreSQL",
        "description": "Backend role in Warsaw",
        "location": "Warsaw",
        "salary_min": 15000,
        "salary_max": 22000,
    }
    result = score_job_match(candidate, job)
    assert result["score"] >= 40.0
    assert result["band"] in ("excellent", "good", "fair", "weak")


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_career_discovery_api_requires_auth(client: TestClient) -> None:
    r = client.post(
        "/api/v1/career-discovery/red-flags",
        json={"title": "Test"},
    )
    assert r.status_code == 401


def test_career_discovery_api_red_flags_and_score(client: TestClient) -> None:
    user = User(id=1, email="disc@example.com", hashed_password="x", is_active=True)

    def _user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _user
    try:
        rf = client.post(
            "/api/v1/career-discovery/red-flags",
            json={
                "title": "Ninja Developer",
                "description": "Unpaid internship",
            },
        )
        assert rf.status_code == 200
        body = rf.json()
        assert body["summary"]
        assert len(body["hits"]) >= 1
        assert body["codes"]

        sc = client.post(
            "/api/v1/career-discovery/score",
            json={
                "candidate": {
                    "skills": ["python"],
                    "preferred_job_titles": ["developer"],
                },
                "job": {
                    "title": "Python Developer",
                    "requirements": "Python",
                },
            },
        )
        assert sc.status_code == 200
        scored = sc.json()
        assert 0 <= scored["score"] <= 100
        assert scored["band"] in ("excellent", "good", "fair", "weak")
    finally:
        app.dependency_overrides.clear()
