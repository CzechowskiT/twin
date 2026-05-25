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
