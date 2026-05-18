from app.matching.matcher import calculate_match_score
from app.services.job_matching_v2 import calculate_match_score_v2, calculate_match_score_v2_tfidf


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


def test_tfidf_layer_boosts_when_cv_overlaps_job_text() -> None:
    cand = {
        "skills": ["python"],
        "preferred_job_titles": [],
        "experience_years": 4,
        "desired_salary": None,
        "location": "warszawa",
        "cv_text": " ".join(
            [
                "Senior backend engineer with FastAPI microservices PostgreSQL Celery Redis",
                "Kubernetes observability OpenTelemetry",
            ]
            * 8
        ),
    }
    job = {
        "title": "Backend Engineer FastAPI",
        "requirements": "Python FastAPI PostgreSQL Celery Redis Kubernetes production experience",
        "description": "Microservices team building observability with OpenTelemetry.",
        "salary_min": None,
        "salary_max": None,
        "location": "Warszawa",
    }
    v1 = calculate_match_score(cand, job)
    with_tfidf = calculate_match_score_v2_tfidf(cand, job, include_v2_salary_bonus=False)
    assert with_tfidf >= v1
    assert 0 <= with_tfidf <= 100


def test_tfidf_with_v2_salary_includes_overlap_bonus() -> None:
    cand = {
        "skills": ["python"],
        "preferred_job_titles": ["engineer"],
        "experience_years": 5,
        "desired_salary": 120_000,
        "location": "Remote",
        "cv_text": "Python distributed systems asyncio streaming data pipelines " * 10,
    }
    job = {
        "title": "Python engineer streaming data",
        "requirements": "python asyncio distributed systems",
        "description": "pipelines",
        "salary_min": 100_000,
        "salary_max": 140_000,
        "location": "Remote",
    }
    s = calculate_match_score_v2_tfidf(cand, job, include_v2_salary_bonus=True)
    assert s >= calculate_match_score_v2(cand, job)
    assert 0 <= s <= 100
