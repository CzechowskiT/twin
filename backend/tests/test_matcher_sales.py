"""Sales-focused matching boosts."""

from app.matching.matcher import calculate_match_score


def test_sales_profile_gets_title_boost() -> None:
    candidate = {
        "skills": ["sales", "b2b"],
        "experience_years": 8,
        "location": "warszawa",
        "desired_salary": 30000,
        "cv_text": None,
    }
    sales_job = {
        "title": "Key Account Manager B2B",
        "requirements": "sprzedaż B2B",
        "description": "",
        "location": "Warszawa",
        "salary_min": 25000,
        "salary_max": 40000,
    }
    dev_job = {
        "title": "Python Developer",
        "requirements": "django fastapi",
        "description": "",
        "location": "Warszawa",
        "salary_min": 20000,
        "salary_max": 30000,
    }
    assert calculate_match_score(candidate, sales_job) > calculate_match_score(candidate, dev_job)
