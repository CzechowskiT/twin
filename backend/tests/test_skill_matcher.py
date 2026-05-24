"""Tests for skill-focused job matching."""

from app.services.skill_matcher import compute_skill_match


def test_skill_match_reports_overlap() -> None:
    candidate = {"skills": ["python", "fastapi", "docker"], "location": "warszawa"}
    job = {
        "title": "Backend Engineer",
        "requirements": "Python, FastAPI, PostgreSQL",
        "description": "Docker on AWS",
    }
    result = compute_skill_match(candidate, job)
    assert result["skill_match_percent"] >= 66.0
    assert "python" in result["matched_skills"]
    assert result["score"] >= 40.0
    assert result["band"] in {"strong", "good", "fair", "weak"}


def test_skill_match_empty_profile() -> None:
    candidate = {"skills": []}
    job = {"title": "Dev", "requirements": "java", "description": ""}
    result = compute_skill_match(candidate, job)
    assert result["skill_match_percent"] == 0.0
    assert result["total_skills"] == 0
