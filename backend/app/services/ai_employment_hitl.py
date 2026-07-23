"""HITL employment recommendations — never autonomous final employment decisions.

Founder Class F: ai_autonomous_employment redesigned as recommendation-only +
human approval required. Hard ban on auto_hire / auto_reject / binding decisions
remains in ai_compliance.assert_no_autonomous_employment.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.database.models import User
from app.services import ai_compliance as compliance
from app.services.platform_foundations import record_domain_event

# Allowed advisory recommendation kinds — never binding hire/reject.
ADVISORY_RECOMMENDATION_KINDS = frozenset(
    {
        "advance_to_interview",
        "request_more_evidence",
        "hold_for_review",
        "deprioritize_advisory",
        "match_fit_advisory",
    }
)


def recommend_employment_action(
    db: Session,
    *,
    user: User,
    subject_id: str,
    recommendation_kind: str,
    rationale: str,
    confidence: float | None = None,
) -> dict[str, Any]:
    """Create an advisory employment recommendation that requires human approval.

    Never transitions to hire/reject. Binding outcomes must go through
    ``human_review`` with non-binding final_outcome values only.
    """
    kind = (recommendation_kind or "").strip().lower()
    if kind not in ADVISORY_RECOMMENDATION_KINDS:
        raise ValueError(f"invalid_recommendation_kind:{kind}")

    # Hard ban: this path must never claim autonomous employment.
    compliance.assert_no_autonomous_employment(db, action="advisory")

    run = compliance.record_ai_run(
        db,
        user=user,
        ai_system_id="twin_match_ranker_v1",
        prompt_template_id="employment_recommendation_hitl",
        prompt_version="1",
        model_version="hitl-advisory",
        output_type="employment_recommendation",
        redacted_input={"subject_id": subject_id[:64], "kind": kind},
        redacted_output={"recommendation_kind": kind, "rationale": rationale[:500]},
        confidence=confidence,
        decision_impact="advisory_only",
    )
    explanation = compliance.create_explanation(
        db,
        user=user,
        ai_run_id=run["ai_run_id"],
        why=rationale[:2000] or "Advisory recommendation only — human approval required.",
        based_on=["match_signals", "role_requirements"],
        data_used=["skills", "experience_years"],
        data_not_used=["protected_attributes"],
        key_factors=[kind],
        limitations="Not a hire/reject decision. Human must approve any employment action.",
        confidence=confidence,
        completeness="PARTIAL",
    )
    record_domain_event(
        db,
        event_name="ai.employment_recommendation_hitl",
        aggregate_type="ai_decision_run",
        aggregate_id=run["ai_run_id"],
        actor_user_id=user.id,
        payload={
            "recommendation_kind": kind,
            "subject_id": subject_id[:64],
            "human_approval_required": True,
            "autonomous_employment": False,
            "binding": False,
        },
    )
    return {
        "ai_run_id": run["ai_run_id"],
        "explanation_id": explanation["explanation_id"],
        "recommendation_kind": kind,
        "subject_id": subject_id,
        "decision_impact": "advisory_only",
        "human_approval_required": True,
        "autonomous_employment": False,
        "binding": False,
        "status": "PENDING_HUMAN_APPROVAL",
        "module_stance": "HITL_RECOMMENDATION_ONLY",
    }
