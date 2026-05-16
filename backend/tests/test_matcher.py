"""Tests for rule-based matching."""

from app.matching.matcher import calculate_match_score


def test_skills_overlap_increases_score() -> None:
    candidate = {
        "skills": ["python", "fastapi"],
        "desired_salary": 15000,
        "location": "warszawa",
    }
    job = {
        "requirements": "python django rest",
        "salary_min": 12000,
        "salary_max": 18000,
        "location": "warszawa",
    }
    score = calculate_match_score(candidate, job)
    assert score >= 50


def test_missing_skills_returns_lower_score() -> None:
    candidate = {"skills": [], "location": "krakow"}
    job = {"requirements": "java", "location": "warszawa"}
    score = calculate_match_score(candidate, job)
    assert score < 30


def test_preferred_job_titles_boost_score() -> None:
    candidate = {
        "skills": ["python"],
        "preferred_job_titles": ["data engineer"],
        "desired_salary": None,
        "location": None,
    }
    job = {"title": "Senior Data Engineer", "requirements": "python sql", "description": ""}
    with_titles = calculate_match_score(candidate, job)
    without = calculate_match_score({**candidate, "preferred_job_titles": []}, job)
    assert with_titles > without
