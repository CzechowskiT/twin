"""Candidate profile readiness for matching and auto-apply surfaces."""

from __future__ import annotations

import json
from typing import Any

from app.database.models import Candidate, User


def _profile_signals(candidate: Candidate) -> dict[str, Any]:
    raw = candidate.profile_signals_json
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def has_cv_text(candidate: Candidate) -> bool:
    return bool((candidate.cv_text or "").strip())


def has_cv_file(candidate: Candidate) -> bool:
    if (candidate.resume_path or "").strip():
        return True
    return bool((candidate.cv_filename or "").strip())


def has_cv_tailoring(candidate: Candidate) -> bool:
    raw = _profile_signals(candidate).get("cv_tailoring")
    if not isinstance(raw, dict):
        return False
    pitch = str(raw.get("pitch_paragraph") or "").strip()
    bullets = raw.get("strength_bullets")
    if pitch:
        return True
    if isinstance(bullets, list) and any(str(b).strip() for b in bullets):
        return True
    return False


def has_profile_fields(candidate: Candidate) -> bool:
    if not (candidate.name or "").strip():
        return False
    try:
        skills = json.loads(candidate.skills) if candidate.skills else []
    except json.JSONDecodeError:
        skills = []
    try:
        titles = json.loads(candidate.preferred_job_titles) if candidate.preferred_job_titles else []
    except json.JSONDecodeError:
        titles = []
    if isinstance(skills, list) and any(str(s).strip() for s in skills):
        return True
    if isinstance(titles, list) and any(str(t).strip() for t in titles):
        return True
    if int(candidate.experience_years or 0) > 0:
        return True
    if (candidate.location or "").strip():
        return True
    return False


def has_cv_material(candidate: Candidate) -> bool:
    """CV text or stored file metadata (aligned with auto_apply_service fallbacks)."""
    return has_cv_text(candidate) or has_cv_file(candidate)


def candidate_has_cv(candidate: Candidate) -> bool:
    """Public `has_cv` on candidates/me — file, text, or role tailoring."""
    return has_cv_material(candidate) or has_cv_tailoring(candidate)


def auto_apply_profile_ready(user: User, candidate: Candidate | None) -> bool:
    """Gate for nightly auto-apply settings: onboarding done plus usable profile."""
    if user.onboarding_completed_at is None:
        return False
    if candidate is None:
        return False
    return has_cv_material(candidate) or has_cv_tailoring(candidate) or has_profile_fields(candidate)
