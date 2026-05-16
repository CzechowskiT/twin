"""Tests for CV parsing and contextual matching."""

from app.matching.matcher import calculate_match_score
from app.services.cv_enrichment import enrich_from_cv_text
from app.services.cv_parser import extract_cv_text


def test_extract_txt_cv() -> None:
    content = (
        "Tomasz Czechowski\n"
        "Key Account Manager z 10-letnim doswiadczeniem w sprzedazy B2B.\n"
        "CRM Salesforce, negocjacje, zarzadzanie zespolem handlowym.\n"
    ).encode()
    text = extract_cv_text(content, "cv.txt")
    assert "sprzedazy" in text.lower() or "sprzeda" in text.lower()


def test_enrich_merges_sales_skills_from_cv() -> None:
    cv = "Senior Sales Manager B2B, HubSpot CRM, negocjacje, Warszawa"
    out = enrich_from_cv_text(
        cv,
        {"skills": ["python"], "experience_years": 3, "location": None, "preferred_job_titles": []},
    )
    skills = [s.lower() for s in out["skills"]]
    assert "sales" in skills or "b2b" in skills


def test_merge_preferred_job_titles_dedupes() -> None:
    from app.services.cv_enrichment import merge_preferred_job_titles

    merged = merge_preferred_job_titles(
        ["Account Manager"],
        ["account manager", "Business Development Manager"],
    )
    assert merged == ["Account Manager", "Business Development Manager"]


def test_cv_context_score_boosts_relevant_job() -> None:
    candidate = {
        "skills": ["sales"],
        "experience_years": 8,
        "location": "warszawa",
        "desired_salary": 35000,
        "cv_text": (
            "Key Account Manager B2B, zarzadzanie portfelem klientow korporacyjnych, "
            "negocjacje umow, Salesforce CRM, branza FMCG."
        ),
    }
    good_job = {
        "title": "Key Account Manager B2B",
        "requirements": "sprzedaz B2B, CRM Salesforce, negocjacje",
        "description": "Zarzadzanie portfelem klientow korporacyjnych",
        "location": "Warszawa",
        "salary_min": 30000,
        "salary_max": 40000,
    }
    weak_job = {
        "title": "Python Backend Developer",
        "requirements": "FastAPI, PostgreSQL, Docker",
        "description": "API development",
        "location": "Krakow",
        "salary_min": 20000,
        "salary_max": 25000,
    }
    with_cv_good = calculate_match_score(candidate, good_job)
    with_cv_weak = calculate_match_score(candidate, weak_job)
    without_cv = {**candidate, "cv_text": None}
    no_cv_good = calculate_match_score(without_cv, good_job)
    assert with_cv_good >= no_cv_good
    assert with_cv_good > with_cv_weak


def test_preferred_title_token_overlap() -> None:
    candidate = {
        "skills": ["python"],
        "experience_years": 4,
        "preferred_job_titles": ["product manager", "product owner"],
        "cv_text": None,
    }
    job = {
        "title": "Senior Product Manager — Growth",
        "requirements": "",
        "description": "",
        "location": None,
        "salary_min": None,
        "salary_max": None,
    }
    score = calculate_match_score(candidate, job)
    assert score > 0
