"""Candidate profile readiness for auto-apply gate."""

import json

from app.database.models import Candidate, User
from app.services.candidate_readiness import (
    auto_apply_profile_ready,
    candidate_has_cv,
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
