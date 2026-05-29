"""Candidate profile readiness for matching and auto-apply surfaces."""

from __future__ import annotations

import json
from typing import Any, TypedDict

from app.database.models import Candidate, User

# Terminal statuses where package preparation is allowed (delegated submit still blocked).
_PREPARE_ALLOWED_STATUSES = frozenset(
    {"ready_for_review", "verified_basic", "delegated_apply_enabled"}
)

# Nightly / manual autonomous apply uses the same bar as package prep, plus no blockers.
_AUTONOMOUS_APPLY_STATUSES = _PREPARE_ALLOWED_STATUSES


class GatewayChecklist(TypedDict):
    profile_present: bool
    cv_present: bool
    career_brief_present: bool
    skill_evidence_present: bool
    consent_general_present: bool
    consent_storage_present: bool


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


def qualifies_for_ready_for_review(
    user: User,
    signals: dict[str, Any],
    *,
    has_profile: bool,
    has_general_consent: bool,
    has_cv: bool,
    has_brief: bool,
    has_evidence: bool,
) -> bool:
    """All baseline prerequisites met, account active, not yet basic-verified."""
    if not user.is_active:
        return False
    if gateway_basic_verified(user, signals):
        return False
    return (
        has_profile
        and has_general_consent
        and has_cv
        and has_brief
        and has_evidence
    )


def resolve_verification_status(
    user: User,
    signals: dict[str, Any],
    *,
    has_profile: bool,
    has_general_consent: bool,
    has_cv: bool,
    has_brief: bool,
    has_evidence: bool,
) -> str:
    """First failing prerequisite wins; otherwise verified_basic or ready_for_review."""
    if not has_profile:
        return "profile_incomplete"
    if not has_general_consent:
        return "consent_missing"
    if not has_cv:
        return "cv_missing"
    if not has_brief:
        return "career_brief_missing"
    if not has_evidence:
        return "skill_evidence_missing"
    if not user.is_active:
        return "suspended"
    if gateway_basic_verified(user, signals):
        return "verified_basic"
    if qualifies_for_ready_for_review(
        user,
        signals,
        has_profile=has_profile,
        has_general_consent=has_general_consent,
        has_cv=has_cv,
        has_brief=has_brief,
        has_evidence=has_evidence,
    ):
        return "ready_for_review"
    return "unverified"


def build_gateway_checklist(
    user: User,
    candidate: Candidate,
    signals: dict[str, Any],
) -> GatewayChecklist:
    has_profile = bool((candidate.name or "").strip())
    has_cv = candidate_has_cv(candidate)
    has_general_consent = user.gdpr_consent_at is not None
    has_cv_consent = candidate.cv_processing_consent_at is not None
    has_docs_consent = user.profile_documents_processing_consent_at is not None
    return GatewayChecklist(
        profile_present=has_profile,
        cv_present=has_cv,
        career_brief_present=has_career_brief(signals),
        skill_evidence_present=has_skill_evidence(signals),
        consent_general_present=has_general_consent,
        consent_storage_present=has_cv_consent or has_docs_consent,
    )


def build_gateway_gaps(checklist: GatewayChecklist) -> tuple[list[str], list[str]]:
    missing_items: list[str] = []
    if not checklist["profile_present"]:
        missing_items.append("profile")
    if not checklist["consent_general_present"]:
        missing_items.append("consent_general")
    if not checklist["consent_storage_present"]:
        missing_items.append("consent_storage")
    if not checklist["cv_present"]:
        missing_items.append("cv")
    if not checklist["career_brief_present"]:
        missing_items.append("career_brief")
    if not checklist["skill_evidence_present"]:
        missing_items.append("skill_evidence")

    blocked_reasons: list[str] = []
    if not checklist["consent_general_present"]:
        blocked_reasons.append("missing_required_consent")
    if not checklist["consent_storage_present"]:
        blocked_reasons.append("missing_storage_consent")
    if not checklist["cv_present"]:
        blocked_reasons.append("missing_cv_material")
    if not checklist["career_brief_present"]:
        blocked_reasons.append("missing_career_brief")
    return missing_items, blocked_reasons


def autonomous_apply_allowed(user: User, candidate: Candidate | None) -> bool:
    """True when verified-readiness is complete enough to enable or run autonomous apply."""
    if not auto_apply_profile_ready(user, candidate):
        return False
    if candidate is None:
        return False
    gate = compute_verified_candidate_gate(user, candidate)
    if gate["verification_status"] not in _AUTONOMOUS_APPLY_STATUSES:
        return False
    return not gate["blocked_reasons"]


def compute_verified_candidate_gate(user: User, candidate: Candidate) -> VerifiedCandidateGateResult:
    """Read-only verified-candidate gateway state (no delegated submit)."""
    signals = _profile_signals(candidate)
    checklist = build_gateway_checklist(user, candidate, signals)
    missing_items, blocked_reasons = build_gateway_gaps(checklist)

    verification_status = resolve_verification_status(
        user,
        signals,
        has_profile=checklist["profile_present"],
        has_general_consent=checklist["consent_general_present"],
        has_cv=checklist["cv_present"],
        has_brief=checklist["career_brief_present"],
        has_evidence=checklist["skill_evidence_present"],
    )

    return VerifiedCandidateGateResult(
        verification_status=verification_status,
        checklist=dict(checklist),
        missing_items=missing_items,
        blocked_reasons=blocked_reasons,
        delegated_apply_allowed=False,
        can_prepare_application_package=verification_status in _PREPARE_ALLOWED_STATUSES,
        can_submit_delegated_application=False,
    )
