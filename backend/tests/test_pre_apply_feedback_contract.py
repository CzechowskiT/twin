"""Contract tests for pre_apply_feedback.v1 payload shape (scaffolding only).

Does not import runtime API modules. Passing tests do not imply the endpoint is live.
"""

from __future__ import annotations

import json
from typing import Any

PRE_APPLY_FEEDBACK_VERSION = "pre_apply_feedback.v1"

REQUIRED_TOP_LEVEL_KEYS = frozenset(
    {
        "version",
        "job_id",
        "candidate_scope",
        "fit_summary",
        "strengths",
        "risks",
        "missing_requirements",
        "improvement_suggestions",
        "evidence_notes",
        "ranking_signals",
        "apply_recommendation",
        "confidence",
        "human_review_required",
        "forbidden_claims",
    }
)

ALLOWED_CONFIDENCE = frozenset({"low", "medium", "high"})
ALLOWED_APPLY_RECOMMENDATION = frozenset(
    {"apply_now", "defer", "do_not_apply", "review_first"}
)

FORBIDDEN_PHRASES = (
    "verified",
    "certified",
    "guaranteed",
    "kyc-approved",
    "employer-validated",
    "legally verified",
    "background-checked",
    "assured interview",
    "guaranteed fit",
)

PII_MARKERS = ("@", "password", "secret", "api_key", "bearer ")


def build_sample_pre_apply_feedback_v1() -> dict[str, Any]:
    """Local sample builder — safe defaults, no PII, no overclaim wording."""
    return {
        "version": PRE_APPLY_FEEDBACK_VERSION,
        "job_id": 123,
        "candidate_scope": "authenticated_self",
        "fit_summary": "Inferred fit from title and skills overlap; evidence partial.",
        "strengths": ["title_alignment", "skills_overlap"],
        "risks": ["missing_required_tool"],
        "missing_requirements": [
            {"key": "kubernetes", "severity": "high", "required": True},
        ],
        "improvement_suggestions": [
            {"type": "evidence", "action": "attach_case_study", "priority": "high"},
        ],
        "evidence_notes": {
            "supported_skills": ["python"],
            "declared_only_skills": ["kubernetes"],
            "verification_claims": "none",
            "wording": (
                "python supported by provided evidence; "
                "kubernetes declared by candidate only"
            ),
        },
        "ranking_signals": {
            "base_fit": 62.0,
            "feedback_adjustments": [{"signal": "apply_intent", "delta": 3.0}],
            "final_score": 74.0,
        },
        "apply_recommendation": "review_first",
        "confidence": "medium",
        "human_review_required": False,
        "forbidden_claims": list(FORBIDDEN_PHRASES),
    }


def _user_facing_blob(payload: dict[str, Any]) -> str:
    """Serialize fields likely shown to candidates (exclude forbidden_claims list meta)."""
    copy = {k: v for k, v in payload.items() if k != "forbidden_claims"}
    return json.dumps(copy, ensure_ascii=False).lower()


def _evidence_notes_blob(notes: Any) -> str:
    if not isinstance(notes, dict):
        return ""
    return json.dumps(notes, ensure_ascii=False).lower()


def test_sample_payload_has_required_keys() -> None:
    payload = build_sample_pre_apply_feedback_v1()
    assert set(payload.keys()) == REQUIRED_TOP_LEVEL_KEYS


def test_sample_payload_version_and_enums() -> None:
    payload = build_sample_pre_apply_feedback_v1()
    assert payload["version"] == PRE_APPLY_FEEDBACK_VERSION
    assert payload["confidence"] in ALLOWED_CONFIDENCE
    assert payload["apply_recommendation"] in ALLOWED_APPLY_RECOMMENDATION
    assert isinstance(payload["human_review_required"], bool)


def test_sample_payload_has_no_forbidden_phrases_in_user_facing_text() -> None:
    payload = build_sample_pre_apply_feedback_v1()
    blob = _user_facing_blob(payload)
    for phrase in FORBIDDEN_PHRASES:
        assert phrase not in blob, f"forbidden phrase in user-facing text: {phrase}"


def test_evidence_notes_do_not_overclaim() -> None:
    payload = build_sample_pre_apply_feedback_v1()
    notes = payload["evidence_notes"]
    assert isinstance(notes, dict)
    assert notes.get("verification_claims") == "none"
    blob = _evidence_notes_blob(notes)
    for phrase in FORBIDDEN_PHRASES:
        assert phrase not in blob


def test_sample_payload_avoids_pii_markers() -> None:
    payload = build_sample_pre_apply_feedback_v1()
    blob = json.dumps(payload, ensure_ascii=False).lower()
    for marker in PII_MARKERS:
        assert marker not in blob
    assert "candidate_id" not in payload


def test_forbidden_claims_list_documents_blocked_claim_types() -> None:
    payload = build_sample_pre_apply_feedback_v1()
    claims = payload["forbidden_claims"]
    assert isinstance(claims, list)
    assert len(claims) >= len(FORBIDDEN_PHRASES)
    lowered = {str(c).lower() for c in claims}
    for phrase in FORBIDDEN_PHRASES:
        assert phrase in lowered
