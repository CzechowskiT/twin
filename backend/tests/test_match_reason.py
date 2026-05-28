from app.services.match_reason import build_match_reason


def test_build_match_reason_polish_locale() -> None:
    reason = build_match_reason(
        {"preferred_job_titles": ["Python Developer"], "skills": ["Python", "FastAPI"]},
        {"title": "Senior Python Developer", "requirements": "Python FastAPI", "location": "Warsaw"},
        score=92.0,
        locale="pl",
    )
    assert reason.startswith("Pasuje, bo:")


def test_build_match_reason_english_fallback() -> None:
    reason = build_match_reason({}, {"title": "Analyst"}, score=55.0, locale="en")
    assert "Possible fit" in reason


def test_build_match_reason_low_score_toned_down() -> None:
    reason = build_match_reason({}, {"title": "Analyst"}, score=45.0, locale="en")
    assert "Possible fit" in reason
    assert "strong profile" not in reason.lower()


def test_build_match_reason_never_claims_verified_skill_without_evidence() -> None:
    reason = build_match_reason(
        {"skills": ["Cobol"], "preferred_job_titles": ["Engineer"]},
        {"title": "Engineer", "requirements": "Python", "description": "backend services"},
        score=61.0,
        locale="en",
    )
    lowered = reason.lower()
    assert "verified" not in lowered
    assert "certified" not in lowered
