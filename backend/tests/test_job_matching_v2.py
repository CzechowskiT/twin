from app.services.job_matching_v2 import calculate_match_score_v2


def test_match_v2_caps_at_100() -> None:
    cand = {"skills": ["python"], "preferred_job_titles": ["engineer"], "experience_years": 5, "desired_salary": 120_000}
    job = {
        "title": "Python engineer",
        "requirements": "python django",
        "description": "backend",
        "salary_min": 100_000,
        "salary_max": 140_000,
        "location": "Remote",
    }
    s = calculate_match_score_v2(cand, job)
    assert 0 <= s <= 100
