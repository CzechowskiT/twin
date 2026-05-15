"""Tests for sales-oriented and tech match scoring."""

from app.matching.matcher import calculate_match_score


def test_sales_skills_match_product_owner() -> None:
    candidate = {
        "skills": ["sales", "management", "business", "communication"],
        "location": "warszawa",
        "desired_salary": 35000,
        "experience_years": 18,
    }
    job = {
        "title": "Senior Product Owner Digital Commerce",
        "requirements": "23 200–34 700 PLN/mies. Warszawa",
        "description": None,
        "location": "Kraków",
        "salary_min": None,
        "salary_max": None,
    }
    score = calculate_match_score(candidate, job)
    assert score >= 45


def test_sales_matches_presales_title() -> None:
    candidate = {"skills": ["sales", "business"], "location": "warszawa", "experience_years": 10}
    job = {
        "title": "Pre-Sales Engineer (AI & Big Data)",
        "requirements": "Warszawa",
        "location": "Warszawa",
        "salary_min": None,
        "salary_max": None,
    }
    score = calculate_match_score(candidate, job)
    assert score >= 40


def test_python_skill_matches_title() -> None:
    candidate = {"skills": ["python", "fastapi"], "location": "warszawa", "desired_salary": None}
    job = {
        "title": "Python Developer",
        "requirements": "REST APIs",
        "description": None,
        "location": "Warszawa",
        "salary_min": None,
        "salary_max": None,
    }
    score = calculate_match_score(candidate, job)
    assert score >= 40


def test_typo_communicaton_still_scores() -> None:
    candidate = {"skills": ["communicaton"], "location": "warszawa", "experience_years": 5}
    job = {
        "title": "Specjalista ds. CRM i Personalizacji",
        "requirements": "marketing Warszawa",
        "location": "Warszawa",
        "salary_min": None,
        "salary_max": None,
    }
    score = calculate_match_score(candidate, job)
    assert score >= 35
