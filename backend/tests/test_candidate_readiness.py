"""Candidate profile readiness for auto-apply gate."""

import json

from app.database.models import Candidate, User
from app.services.candidate_readiness import (
    auto_apply_profile_ready,
    candidate_has_cv,
    compute_verified_candidate_gate,
    has_cv_file,
    has_cv_text,
    has_profile_fields,
)


def _user(*, onboarding: bool = True) -> User:
    u = User(email="r@test.com", hashed_password="x", is_active=True)
    if onboarding:
        from datetime import datetime, timezone

        u.onboarding_completed_at = datetime.now(timezone.utc)
    return u


def test_has_cv_text_and_file() -> None:
    c = Candidate(user_id=1, name="A")
    assert has_cv_text(c) is False
    c.cv_text = "  "
    assert has_cv_text(c) is False
    c.cv_text = "Python engineer"
    assert has_cv_text(c) is True
    c.cv_text = None
    c.cv_filename = "cv.pdf"
    assert has_cv_file(c) is True


def test_profile_fields_and_ready() -> None:
    user = _user()
    c = Candidate(user_id=1, name="Alex", skills=json.dumps(["python"]), experience_years=0)
    assert has_profile_fields(c) is True
    assert auto_apply_profile_ready(user, c) is True

    c.skills = "[]"
    c.experience_years = 0
    c.location = None
    assert has_profile_fields(c) is False
    assert auto_apply_profile_ready(user, c) is False

    c.cv_filename = "cv.pdf"
    assert candidate_has_cv(c) is True
    assert auto_apply_profile_ready(user, c) is True


def test_onboarding_required() -> None:
    user = _user(onboarding=False)
    c = Candidate(user_id=1, name="Alex", cv_text="CV")
    assert auto_apply_profile_ready(user, c) is False


def test_compute_gate_ready_for_review_without_marker() -> None:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    user = _user()
    user.gdpr_consent_at = now
    c = Candidate(
        user_id=1,
        name="Alex",
        cv_text="CV",
        cv_processing_consent_at=now,
        profile_signals_json=json.dumps(
            {
                "career_compass": {"ideal": {"job_title": "Engineer"}},
                "cv_insights": {"summary": "ok"},
            }
        ),
    )
    gate = compute_verified_candidate_gate(user, c)
    assert gate["verification_status"] == "ready_for_review"
    assert gate["can_prepare_application_package"] is True
    assert gate["delegated_apply_allowed"] is False


def test_compute_gate_suspended_when_user_inactive() -> None:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    user = _user()
    user.gdpr_consent_at = now
    user.is_active = False
    c = Candidate(
        user_id=1,
        name="Alex",
        cv_text="CV",
        cv_processing_consent_at=now,
        profile_signals_json=json.dumps(
            {
                "career_compass": {"ideal": {"job_title": "Engineer"}},
                "cv_insights": {"summary": "ok"},
            }
        ),
    )
    gate = compute_verified_candidate_gate(user, c)
    assert gate["verification_status"] == "suspended"
    assert gate["can_prepare_application_package"] is False
