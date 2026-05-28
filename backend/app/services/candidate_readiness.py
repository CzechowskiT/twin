"""Candidate profile readiness for matching and auto-apply surfaces."""

from __future__ import annotations

import json
from typing import Any, TypedDict

from app.database.models import Candidate, User


class VerifiedCandidateGateResult(TypedDict):
    verification_status: str
    checklist: dict[str, bool]
    missing_items: list[str]
    blocked_reasons: list[str]
    delegated_apply_allowed: bool
    can_prepare_application_package: bool
    can_submit_delegated_application: bool


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


def has_career_brief(signals: dict[str, Any]) -> bool:
    return isinstance(signals.get("career_compass"), dict)


def has_skill_evidence(signals: dict[str, Any]) -> bool:
    return isinstance(signals.get("cv_insights"), dict)


def gateway_basic_verified(user: User, signals: dict[str, Any]) -> bool:
    """Pilot marker for verified_basic without a dedicated migration (JSON blob or identity check)."""
    vg = signals.get("verified_gateway")
    if isinstance(vg, dict):
        if vg.get("basic_verified_at") or vg.get("review_passed"):
            return True
    return user.identity_verified_at is not None


def compute_verified_candidate_gate(user: User, candidate: Candidate) -> VerifiedCandidateGateResult:
    """Read-only verified-candidate gateway state (no delegated submit)."""
    signals = _profile_signals(candidate)
    has_profile = bool((candidate.name or "").strip())
    has_cv = candidate_has_cv(candidate)
    has_brief = has_career_brief(signals)
    has_evidence = has_skill_evidence(signals)
    has_general_consent = user.gdpr_consent_at is not None
    has_cv_consent = candidate.cv_processing_consent_at is not None
    has_docs_consent = user.profile_documents_processing_consent_at is not None
    has_storage_consent = has_cv_consent or has_docs_consent

    checklist = {
        "profile_present": has_profile,
        "cv_present": has_cv,
        "career_brief_present": has_brief,
        "skill_evidence_present": has_evidence,
        "consent_general_present": has_general_consent,
        "consent_storage_present": has_storage_consent,
    }

    missing_items: list[str] = []
    if not has_profile:
        missing_items.append("profile")
    if not has_general_consent:
        missing_items.append("consent_general")
    if not has_storage_consent:
        missing_items.append("consent_storage")
    if not has_cv:
        missing_items.append("cv")
    if not has_brief:
        missing_items.append("career_brief")
    if not has_evidence:
        missing_items.append("skill_evidence")

    blocked_reasons: list[str] = []
    if not has_general_consent:
        blocked_reasons.append("missing_required_consent")
    if not has_storage_consent:
        blocked_reasons.append("missing_storage_consent")
    if not has_cv:
        blocked_reasons.append("missing_cv_material")
    if not has_brief:
        blocked_reasons.append("missing_career_brief")

    verification_status = "unverified"
    if not has_profile:
        verification_status = "profile_incomplete"
    elif not has_general_consent:
        verification_status = "consent_missing"
    elif not has_cv:
        verification_status = "cv_missing"
    elif not has_brief:
        verification_status = "career_brief_missing"
    elif not has_evidence:
        verification_status = "skill_evidence_missing"
    elif not user.is_active:
        verification_status = "suspended"
    elif gateway_basic_verified(user, signals):
        verification_status = "verified_basic"
    else:
        verification_status = "ready_for_review"

    delegated_apply_allowed = False
    can_prepare = verification_status in (
        "ready_for_review",
        "verified_basic",
        "delegated_apply_enabled",
    )

    return VerifiedCandidateGateResult(
        verification_status=verification_status,
        checklist=checklist,
        missing_items=missing_items,
        blocked_reasons=blocked_reasons,
        delegated_apply_allowed=delegated_apply_allowed,
        can_prepare_application_package=can_prepare,
        can_submit_delegated_application=False,
    )
