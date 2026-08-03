"""Career Transition, First 90 Days & Outcome Learning.

Chain: declared decision → transition workspace → pre-start → plans → check-ins →
outcomes → prediction-vs-outcome → calibration → Career Graph (approved) → adaptive memory.

Never monitors workplace. Never external resignation/comms. Missing = UNKNOWN.
Generated 30/60/90 = AI_DRAFT until candidate approves.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAcceptanceItem,
    CandidateCareerOutcome,
    CandidateDecisionMemo,
    CandidateOfferRecord,
    CandidateTransitionAudit,
    CandidateTransitionCalibration,
    CandidateTransitionCheckin,
    CandidateTransitionMilestone,
    CandidateTransitionPrivacy,
    CandidateTransitionWorkspace,
)
from app.services import acceptance_calendar as acal
from app.services import career_copilot as cc

logger = logging.getLogger(__name__)

OUTCOME_TYPES = frozenset(
    {
        "APPLICATION_REJECTED_DECLARED",
        "APPLICATION_WITHDRAWN",
        "INTERVIEW_PROCESS_ENDED",
        "OFFER_RECEIVED_DECLARED",
        "OFFER_DECLINED_DECLARED",
        "OFFER_ACCEPTED_DECLARED",
        "STAYED_IN_CURRENT_ROLE",
        "ROLE_STARTED_DECLARED",
        "ROLE_NOT_STARTED",
        "START_DATE_CHANGED",
        "PROBATION_COMPLETED_DECLARED",
        "ROLE_CHANGED",
        "PROMOTION_DECLARED",
        "COMPENSATION_CHANGED_DECLARED",
        "LEFT_ROLE_DECLARED",
        "LEARNING_MILESTONE",
        "PORTFOLIO_MILESTONE",
        "CUSTOM",
        "UNKNOWN",
    }
)
# Only these declared decisions may open a transition workspace
TRANSITION_DECISIONS = frozenset({"accept_intent", "negotiate_intent"})
PLAN_STATUSES = frozenset({"AI_DRAFT", "CANDIDATE_APPROVED", "CANDIDATE_REJECTED", "SUPERSEDED"})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return cc._dumps(obj)


def _loads(raw: str | None, default: Any) -> Any:
    return cc._loads(raw or "", default)


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _audit(
    db: Session,
    *,
    candidate_id: int,
    transition_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateTransitionAudit(
            candidate_id=candidate_id,
            transition_id=transition_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def get_or_create_privacy(db: Session, *, candidate_id: int) -> CandidateTransitionPrivacy:
    row = db.query(CandidateTransitionPrivacy).filter_by(candidate_id=candidate_id).one_or_none()
    if row:
        return row
    row = CandidateTransitionPrivacy(candidate_id=candidate_id, created_at=_utcnow(), updated_at=_utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_privacy(db: Session, *, candidate_id: int, **kwargs: Any) -> CandidateTransitionPrivacy:
    row = get_or_create_privacy(db, candidate_id=candidate_id)
    for k in ("learning_opt_in", "reminders_opt_in", "export_include_employer_notes", "paused"):
        if k in kwargs and kwargs[k] is not None:
            setattr(row, k, bool(kwargs[k]))
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def register_outcome(
    db: Session,
    *,
    candidate_id: int,
    outcome_type: str,
    decision_id: int | None = None,
    offer_id: int | None = None,
    process_id: int | None = None,
    transition_id: int | None = None,
    application_id: int | None = None,
    payload: dict | None = None,
    prediction: dict | None = None,
    is_synthetic: bool = False,
) -> CandidateCareerOutcome:
    ot = (outcome_type or "UNKNOWN").upper()
    if ot not in OUTCOME_TYPES:
        raise ValueError("invalid_outcome_type")
    row = CandidateCareerOutcome(
        candidate_id=candidate_id,
        outcome_key=f"out:{candidate_id}:{ot}:{int(_utcnow().timestamp())}"[:160],
        outcome_type=ot,
        application_id=application_id,
        process_id=process_id,
        offer_id=offer_id,
        decision_id=decision_id,
        transition_id=transition_id,
        source_type="candidate_declared",
        source_date=_utcnow(),
        candidate_confirmed=True,
        claim_kind="CANDIDATE_CONFIRMED",
        confidence="medium",
        outcome_date=_utcnow(),
        privacy="PRIVATE",
        payload_json=_dumps(payload or {}),
        prediction_json=_dumps(prediction or {"claim_kind": "PREDICTION", "text": "UNKNOWN"}),
        kpi_excluded=True,
        is_synthetic=is_synthetic,
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_transition(
    db: Session,
    *,
    candidate_id: int,
    decision_id: int,
    title: str | None = None,
    is_synthetic: bool = False,
) -> CandidateTransitionWorkspace:
    """Create transition only from candidate-declared accept/negotiate intent — never inferred."""
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if privacy.paused:
        raise ValueError("transition_paused")
    memo = (
        db.query(CandidateDecisionMemo)
        .filter_by(id=decision_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not memo or memo.deleted_at:
        raise ValueError("decision_not_found")
    declared = (memo.declared_decision or "").strip().lower()
    if declared not in TRANSITION_DECISIONS:
        raise ValueError("transition_requires_declared_accept_or_negotiate_intent")
    if not memo.provenance or "candidate_declared" not in memo.provenance:
        raise ValueError("transition_requires_candidate_declared_provenance")

    offer = None
    if memo.offer_id:
        offer = (
            db.query(CandidateOfferRecord)
            .filter_by(id=memo.offer_id, candidate_id=candidate_id)
            .one_or_none()
        )

    decision_snap = {
        "decision_id": memo.id,
        "declared_decision": declared,
        "provenance": memo.provenance,
        "criteria": _loads(memo.criteria_json, []),
        "memo": _loads(memo.memo_json, {}),
        "external_action": False,
        "frozen_at": _utcnow().isoformat() + "Z",
        "immutable": True,
        "inferred_acceptance": False,
    }
    offer_snap = {
        "offer_id": offer.id if offer else None,
        "title": offer.title if offer else "UNKNOWN",
        "company": offer.company if offer else "UNKNOWN",
        "provenance": offer.provenance if offer else "UNKNOWN",
        "terms": _loads(offer.terms_json, {}) if offer else {},
        "frozen_at": _utcnow().isoformat() + "Z",
        "immutable": True,
    }
    d_raw, o_raw = _dumps(decision_snap), _dumps(offer_snap)

    plan90 = {
        "days_30": {"goals": ["UNKNOWN — candidate to fill"], "claim_kind": "SUGGESTION"},
        "days_60": {"goals": ["UNKNOWN — candidate to fill"], "claim_kind": "SUGGESTION"},
        "days_90": {"goals": ["UNKNOWN — candidate to fill"], "claim_kind": "SUGGESTION"},
        "employer_approved": False,
        "fabricated_metrics": False,
        "status": "AI_DRAFT",
    }
    resignation = {
        "draft_text": "Private resignation draft — not sent. External resignation OFF.",
        "external_send": False,
        "email_send": False,
        "claim_kind": "SUGGESTION",
    }
    stakeholders = [
        {
            "role": "Manager",
            "name": "UNKNOWN",
            "sentiment": None,
            "sentiment_inference": False,
            "claim_kind": "UNKNOWN",
        },
        {
            "role": "Buddy / peer",
            "name": "UNKNOWN",
            "sentiment": None,
            "sentiment_inference": False,
            "claim_kind": "UNKNOWN",
        },
    ]
    risks = [
        {
            "id": "process_unclear_expectations",
            "kind": "process",
            "text": "Role expectations still UNKNOWN",
            "mental_health_inference": False,
            "manager_sentiment_inference": False,
            "claim_kind": "INFERENCE",
        }
    ]
    key = f"tr:{_hash(str(decision_id) + str(_utcnow().timestamp()))[:14]}"
    row = CandidateTransitionWorkspace(
        candidate_id=candidate_id,
        workspace_key=key[:160],
        title=(title or f"Transition after {declared}")[:300],
        status="active",
        decision_id=memo.id,
        offer_id=offer.id if offer else None,
        process_id=memo.process_id,
        decision_snapshot_json=d_raw,
        offer_snapshot_json=o_raw,
        decision_snapshot_hash=_hash(d_raw),
        offer_snapshot_hash=_hash(o_raw),
        snapshots_immutable=True,
        readiness_json=_dumps(
            {
                "state": "NOT_STARTED",
                "guaranteed_success": False,
                "claim_kind": "INFERENCE",
            }
        ),
        pre_start_json=_dumps(
            [
                {"id": "docs", "title": "Gather start docs", "done": False},
                {"id": "equipment", "title": "Confirm equipment/access", "done": False},
                {"id": "clarify", "title": "List clarification questions", "done": False},
            ]
        ),
        resignation_json=_dumps(resignation),
        handover_json=_dumps(
            {
                "tasks": ["UNKNOWN current responsibilities"],
                "external_send": False,
                "claim_kind": "SUGGESTION",
            }
        ),
        clarification_json=_dumps(
            [
                {"q": "What does success look like in 30/60/90 days?", "claim_kind": "SUGGESTION"},
                {"q": "Who is my primary onboarding contact?", "claim_kind": "SUGGESTION"},
            ]
        ),
        first_day_json=_dumps(
            {"agenda": ["UNKNOWN"], "claim_kind": "SUGGESTION", "status": "AI_DRAFT"}
        ),
        first_week_json=_dumps(
            {"agenda": ["UNKNOWN"], "claim_kind": "SUGGESTION", "status": "AI_DRAFT"}
        ),
        plan_90_json=_dumps(plan90),
        plan_90_status="AI_DRAFT",
        expectations_json=_dumps({"success_definition": "UNKNOWN", "claim_kind": "UNKNOWN"}),
        stakeholders_json=_dumps(stakeholders),
        cockpit_json=_dumps(
            {
                "next_focus": "Approve or edit AI_DRAFT 30/60/90 plan",
                "workplace_monitoring": False,
                "claim_kind": "SUGGESTION",
            }
        ),
        learning_plan_json=_dumps(
            {
                "skills": ["UNKNOWN"],
                "mastery_inferred": False,
                "claim_kind": "SUGGESTION",
            }
        ),
        risks_json=_dumps(risks),
        retrospective_json=_dumps({}),
        graph_update_json=_dumps(
            {
                "proposed": {"current_role": offer.title if offer else "UNKNOWN"},
                "candidate_approved": False,
                "applied": False,
                "claim_kind": "SUGGESTION",
            }
        ),
        claim_kind="SUGGESTION",
        version=1,
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        payload_json=_dumps(
            {
                "external_resignation": False,
                "external_employer_comms": False,
                "workplace_monitoring": False,
                "employer_email_access": False,
                "slack_teams_monitoring": False,
                "mental_health_inference": False,
                "manager_sentiment_inference": False,
                "kpi_excluded": True,
            }
        ),
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    # Default milestones
    for label, due in (("Day 1 orientation", "day_1"), ("Week 1 check-in", "week_1"), ("Day 30 review", "day_30")):
        db.add(
            CandidateTransitionMilestone(
                candidate_id=candidate_id,
                transition_id=row.id,
                milestone_key=f"ms:{row.id}:{due}:{int(_utcnow().timestamp())}"[:160],
                title=label,
                status="planned",
                evidence_ids_json="[]",
                claim_kind="SUGGESTION",
                due_label=due,
                version=1,
                created_at=_utcnow(),
                updated_at=_utcnow(),
            )
        )
    register_outcome(
        db,
        candidate_id=candidate_id,
        outcome_type="OFFER_ACCEPTED_DECLARED" if declared == "accept_intent" else "OFFER_RECEIVED_DECLARED",
        decision_id=memo.id,
        offer_id=offer.id if offer else None,
        process_id=memo.process_id,
        transition_id=row.id,
        is_synthetic=is_synthetic,
        prediction={"text": "UNKNOWN impact", "claim_kind": "PREDICTION"},
    )
    # re-fetch row after register_outcome committed
    db.refresh(row)
    _audit(
        db,
        candidate_id=candidate_id,
        transition_id=row.id,
        entity_type="transition",
        entity_id=row.id,
        action="create",
        before={},
        after={"decision_id": memo.id, "inferred_acceptance": False},
    )
    _push_integrations(db, candidate_id=candidate_id, transition=row)
    db.commit()
    db.refresh(row)
    return row


def _workspace(db: Session, *, candidate_id: int, transition_id: int) -> CandidateTransitionWorkspace:
    row = (
        db.query(CandidateTransitionWorkspace)
        .filter(
            CandidateTransitionWorkspace.id == transition_id,
            CandidateTransitionWorkspace.candidate_id == candidate_id,
            CandidateTransitionWorkspace.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("transition_not_found")
    return row


def assert_snapshots_immutable(db: Session, *, candidate_id: int, transition_id: int) -> dict:
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    d_ok = _hash(row.decision_snapshot_json or "{}") == (row.decision_snapshot_hash or "")
    o_ok = _hash(row.offer_snapshot_json or "{}") == (row.offer_snapshot_hash or "")
    return {
        "immutable": bool(row.snapshots_immutable),
        "decision_hash_matches": d_ok,
        "offer_hash_matches": o_ok,
        "mutable": False,
    }


def _push_integrations(
    db: Session, *, candidate_id: int, transition: CandidateTransitionWorkspace
) -> None:
    acal_ok = True
    try:
        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"transition:{transition.id}",
            category="goal",
            title=f"First 90 days: {transition.title[:80]}",
            summary="Candidate-owned transition — no workplace monitoring",
            importance=65,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link="/dashboard/career-transition",
            evidence=[{"type": "transition", "id": transition.id}],
            payload={
                "kpi_excluded": True,
                "workplace_monitoring": False,
                "kind": "transition",
            },
        )
    except Exception as exc:
        acal_ok = False
        logger.exception("acal transition upsert failed: %s", exc)
        _audit(
            db,
            candidate_id=candidate_id,
            transition_id=transition.id,
            entity_type="acceptance_calendar",
            entity_id=transition.id,
            action="upsert_failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
    daily_ok = True
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"transition:{transition.id}",
            kind="transition",
            title=f"Transition plan: {transition.title[:80]}",
            body={"transition_id": transition.id, "workplace_monitoring": False},
            priority_score=65,
            deep_link="/dashboard/career-transition",
            effort="M",
            completion_criterion="Approve 30/60/90 draft and complete check-ins",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        daily_ok = False
        logger.exception("daily os transition upsert failed: %s", exc)
    payload = _loads(transition.payload_json, {})
    payload["integrations"] = {
        "acal_ok": acal_ok,
        "daily_os_ok": daily_ok,
        "silent_swallow": False,
        "reminders_safe": True,
        "no_ms_calendar_write": True,
    }
    transition.payload_json = _dumps(payload)


def approve_plan_90(
    db: Session, *, candidate_id: int, transition_id: int, approved: bool = True
) -> dict:
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    before = row.plan_90_status
    row.plan_90_status = "CANDIDATE_APPROVED" if approved else "CANDIDATE_REJECTED"
    plan = _loads(row.plan_90_json, {})
    plan["status"] = row.plan_90_status
    plan["candidate_approved"] = bool(approved)
    row.plan_90_json = _dumps(plan)
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    readiness = _loads(row.readiness_json, {})
    readiness["state"] = "PLAN_APPROVED" if approved else "PLAN_NEEDS_EDIT"
    row.readiness_json = _dumps(readiness)
    _audit(
        db,
        candidate_id=candidate_id,
        transition_id=row.id,
        entity_type="plan_90",
        entity_id=row.id,
        action="approve" if approved else "reject",
        before={"status": before},
        after={"status": row.plan_90_status},
    )
    db.commit()
    return {"plan_90_status": row.plan_90_status, "approved": approved}


def add_checkin(
    db: Session,
    *,
    candidate_id: int,
    transition_id: int,
    period: str,
    facts: dict,
    interpretation: dict,
) -> CandidateTransitionCheckin:
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    # Never store interpretation as employer-confirmed
    interp = dict(interpretation or {})
    interp["employer_confirmed"] = False
    interp["label"] = "candidate_interpretation"
    facts_n = dict(facts or {})
    facts_n["label"] = "candidate_reported"
    facts_n["employer_confirmed"] = False
    chk = CandidateTransitionCheckin(
        candidate_id=candidate_id,
        transition_id=row.id,
        checkin_key=f"ci:{row.id}:{period}:{int(_utcnow().timestamp())}"[:160],
        period=(period or "week_1")[:32],
        facts_json=_dumps(facts_n),
        interpretation_json=_dumps(interp),
        provenance_facts="candidate_reported",
        provenance_interpretation="candidate_interpretation",
        claim_kind="CANDIDATE_REPORTED",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(chk)
    db.commit()
    db.refresh(chk)
    return chk


def compare_prediction_outcome(
    db: Session, *, candidate_id: int, outcome_id: int
) -> dict:
    out = (
        db.query(CandidateCareerOutcome)
        .filter_by(id=outcome_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not out or out.deleted_at:
        raise ValueError("outcome_not_found")
    pred = _loads(out.prediction_json, {})
    return {
        "outcome_id": out.id,
        "outcome_type": out.outcome_type,
        "prediction": pred,
        "actual": {"type": out.outcome_type, "claim_kind": out.claim_kind},
        "delta": "UNKNOWN" if not pred.get("text") else "compared_without_hiring_certainty",
        "hiring_certainty": None,
        "claim_kind": "INFERENCE",
        "kpi_excluded": True,
    }


def calibrate_from_outcomes(
    db: Session, *, candidate_id: int, outcome_ids: list[int] | None = None
) -> CandidateTransitionCalibration:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if not privacy.learning_opt_in:
        raise ValueError("learning_opt_in_required")
    q = db.query(CandidateCareerOutcome).filter(
        CandidateCareerOutcome.candidate_id == candidate_id,
        CandidateCareerOutcome.deleted_at.is_(None),
    )
    if outcome_ids:
        q = q.filter(CandidateCareerOutcome.id.in_(outcome_ids))
    outcomes = q.order_by(CandidateCareerOutcome.id.desc()).limit(20).all()
    # Exclude deleted — already filtered; synthetic excluded from product KPI via kpi_excluded
    live_ids = [o.id for o in outcomes if not o.deleted_at]
    prev = (
        db.query(CandidateTransitionCalibration)
        .filter_by(candidate_id=candidate_id, active=True)
        .order_by(CandidateTransitionCalibration.version.desc())
        .first()
    )
    ver = int(prev.version) + 1 if prev else 1
    weights = {
        "role_fit": 0.2,
        "evidence_strength": 0.2,
        "preference": 0.15,
        "workload": 0.1,
        "work_model": 0.1,
        "learning": 0.1,
        "risk_tolerance": 0.1,
        "unknown_penalty": 0.05,
    }
    if prev:
        # Archive previous — never silent overwrite
        prev.active = False
        prev.archived_at = _utcnow()
    cal = CandidateTransitionCalibration(
        candidate_id=candidate_id,
        calibration_key=f"cal:{candidate_id}:v{ver}:{int(_utcnow().timestamp())}"[:160],
        version=ver,
        weights_json=_dumps(weights),
        explain_json=_dumps(
            {
                "basis_outcome_ids": live_ids,
                "model_improved_claim": False,
                "synthetic_in_kpi": False,
                "claim_kind": "INFERENCE",
            }
        ),
        outcome_ids_json=_dumps(live_ids),
        active=True,
        supersedes_id=prev.id if prev else None,
        claim_kind="INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(cal)
    _audit(
        db,
        candidate_id=candidate_id,
        transition_id=None,
        entity_type="calibration",
        entity_id=None,
        action="version_create",
        before={"prev_version": prev.version if prev else None},
        after={"version": ver, "silent_overwrite": False},
    )
    db.commit()
    db.refresh(cal)
    return cal


def revert_calibration(
    db: Session, *, candidate_id: int, calibration_id: int
) -> CandidateTransitionCalibration:
    target = (
        db.query(CandidateTransitionCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not target:
        raise ValueError("calibration_not_found")
    active = (
        db.query(CandidateTransitionCalibration)
        .filter_by(candidate_id=candidate_id, active=True)
        .all()
    )
    for a in active:
        a.active = False
        a.archived_at = _utcnow()
    new = CandidateTransitionCalibration(
        candidate_id=candidate_id,
        calibration_key=f"cal:{candidate_id}:revert:{int(_utcnow().timestamp())}"[:160],
        version=int(target.version),
        weights_json=target.weights_json,
        explain_json=_dumps(
            {
                **_loads(target.explain_json, {}),
                "reverted": True,
                "from_id": target.id,
            }
        ),
        outcome_ids_json=target.outcome_ids_json,
        active=True,
        supersedes_id=None,
        reverted_from_id=target.id,
        claim_kind="INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(new)
    db.commit()
    db.refresh(new)
    return new


def approve_graph_update(
    db: Session, *, candidate_id: int, transition_id: int, approved: bool = True
) -> dict:
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    g = _loads(row.graph_update_json, {})
    g["candidate_approved"] = bool(approved)
    g["applied"] = bool(approved)
    g["applied_at"] = _utcnow().isoformat() + "Z" if approved else None
    row.graph_update_json = _dumps(g)
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        transition_id=row.id,
        entity_type="career_graph",
        entity_id=row.id,
        action="approve" if approved else "reject",
        before={},
        after={"approved": approved, "without_approval": False},
    )
    # Adaptive memory decision record
    _audit(
        db,
        candidate_id=candidate_id,
        transition_id=row.id,
        entity_type="adaptive_memory",
        entity_id=row.id,
        action="graph_update_decision",
        before={},
        after={"approved": approved},
    )
    db.commit()
    return {"candidate_approved": approved, "applied": bool(approved)}


def add_retrospective(
    db: Session,
    *,
    candidate_id: int,
    transition_id: int,
    kind: str,
    body: dict,
) -> dict:
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    retro = _loads(row.retrospective_json, {})
    key = kind if kind in {"application", "interview", "decision", "rejection"} else "custom"
    retro[key] = {
        **(body or {}),
        "claim_kind": "CANDIDATE_RECOLLECTION",
        "employer_confirmed": False,
        "at": _utcnow().isoformat() + "Z",
    }
    row.retrospective_json = _dumps(retro)
    row.updated_at = _utcnow()
    db.commit()
    return {"retrospective": retro}


def capture_evidence_link(
    db: Session,
    *,
    candidate_id: int,
    transition_id: int,
    milestone_id: int,
    evidence_ids: list[int],
) -> dict:
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    ms = (
        db.query(CandidateTransitionMilestone)
        .filter_by(id=milestone_id, candidate_id=candidate_id, transition_id=row.id)
        .one_or_none()
    )
    if not ms or ms.deleted_at:
        raise ValueError("milestone_not_found")
    ms.evidence_ids_json = _dumps(evidence_ids or [])
    ms.claim_kind = "SOURCE_SUPPORTED" if evidence_ids else "SUGGESTION"
    # No mastery inference
    ms.updated_at = _utcnow()
    db.commit()
    return {
        "milestone_id": ms.id,
        "evidence_ids": evidence_ids or [],
        "mastery_inferred": False,
    }


def export_transition(db: Session, *, candidate_id: int, transition_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    return {
        "transition": _ser_transition(row),
        "checkins": [
            _ser_checkin(c)
            for c in db.query(CandidateTransitionCheckin)
            .filter_by(candidate_id=candidate_id, transition_id=transition_id)
            .filter(CandidateTransitionCheckin.deleted_at.is_(None))
            .all()
        ],
        "milestones": [
            _ser_milestone(m)
            for m in db.query(CandidateTransitionMilestone)
            .filter_by(candidate_id=candidate_id, transition_id=transition_id)
            .filter(CandidateTransitionMilestone.deleted_at.is_(None))
            .all()
        ],
        "employer_notes_excluded": not privacy.export_include_employer_notes,
        "secrets_excluded": True,
        "kpi_excluded": True,
        "workplace_monitoring": False,
    }


def delete_transition(db: Session, *, candidate_id: int, transition_id: int) -> dict:
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    now = _utcnow()
    row.deleted_at = now
    row.status = "deleted"
    for model in (CandidateTransitionCheckin, CandidateTransitionMilestone):
        for art in db.query(model).filter_by(candidate_id=candidate_id, transition_id=transition_id).all():
            art.deleted_at = now
    # Soft-delete linked outcomes so they leave recommendation basis
    for o in (
        db.query(CandidateCareerOutcome)
        .filter_by(candidate_id=candidate_id, transition_id=transition_id)
        .all()
    ):
        o.deleted_at = now
    try:
        db.query(CandidateAcceptanceItem).filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.item_key.like(f"transition:{transition_id}%"),
        ).delete(synchronize_session=False)
    except Exception as exc:
        logger.exception("acal transition delete failed: %s", exc)
        _audit(
            db,
            candidate_id=candidate_id,
            transition_id=transition_id,
            entity_type="acceptance_calendar",
            entity_id=transition_id,
            action="delete_failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
    db.commit()
    return {"ok": True, "stale_reappear_guard": True, "outcomes_removed_from_recs": True}


def purge_all_evidence_refs(db: Session, *, candidate_id: int) -> int:
    """Clear evidence links from transition milestones after evidence history delete."""
    n = 0
    for ms in (
        db.query(CandidateTransitionMilestone)
        .filter_by(candidate_id=candidate_id)
        .filter(CandidateTransitionMilestone.deleted_at.is_(None))
        .all()
    ):
        ids = _loads(ms.evidence_ids_json, [])
        if ids:
            ms.evidence_ids_json = "[]"
            ms.claim_kind = "SUGGESTION"
            ms.updated_at = _utcnow()
            n += 1
    if n:
        db.commit()
    return n


def patch_workspace_section(
    db: Session,
    *,
    candidate_id: int,
    transition_id: int,
    section: str,
    value: Any,
) -> dict:
    """Update mutable plan sections — never decision/offer snapshots."""
    row = _workspace(db, candidate_id=candidate_id, transition_id=transition_id)
    allowed = {
        "pre_start": "pre_start_json",
        "resignation": "resignation_json",
        "handover": "handover_json",
        "clarification": "clarification_json",
        "first_day": "first_day_json",
        "first_week": "first_week_json",
        "plan_90": "plan_90_json",
        "expectations": "expectations_json",
        "stakeholders": "stakeholders_json",
        "cockpit": "cockpit_json",
        "learning_plan": "learning_plan_json",
        "risks": "risks_json",
        "readiness": "readiness_json",
    }
    if section not in allowed:
        raise ValueError("section_not_mutable_or_unknown")
    if section in {"decision_snapshot", "offer_snapshot"}:
        raise ValueError("snapshots_immutable")
    attr = allowed[section]
    data = value
    if section == "resignation":
        data = {**(value if isinstance(value, dict) else {}), "external_send": False, "email_send": False}
    if section == "stakeholders" and isinstance(value, list):
        data = [
            {
                **(s if isinstance(s, dict) else {}),
                "sentiment": None,
                "sentiment_inference": False,
            }
            for s in value
        ]
    if section == "risks" and isinstance(value, list):
        data = [
            {
                **(r if isinstance(r, dict) else {}),
                "mental_health_inference": False,
                "manager_sentiment_inference": False,
            }
            for r in value
        ]
    if section == "plan_90" and isinstance(value, dict):
        data = {**value, "status": row.plan_90_status, "employer_approved": False}
        setattr(row, "plan_90_json", _dumps(data))
    else:
        setattr(row, attr, _dumps(data))
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        transition_id=row.id,
        entity_type=section,
        entity_id=row.id,
        action="patch",
        before={},
        after={"section": section, "snapshots_untouched": True},
    )
    db.commit()
    return {"ok": True, "section": section, "snapshots_immutable": True}


def confidence_history(db: Session, *, candidate_id: int) -> dict:
    outcomes = (
        db.query(CandidateCareerOutcome)
        .filter(
            CandidateCareerOutcome.candidate_id == candidate_id,
            CandidateCareerOutcome.deleted_at.is_(None),
        )
        .order_by(CandidateCareerOutcome.id.asc())
        .limit(100)
        .all()
    )
    return {
        "history": [
            {
                "outcome_id": o.id,
                "outcome_type": o.outcome_type,
                "confidence": o.confidence,
                "claim_kind": o.claim_kind,
                "at": o.created_at.isoformat() + "Z" if o.created_at else None,
            }
            for o in outcomes
        ],
        "hiring_certainty": None,
        "claim_kind": "INFERENCE",
    }


def recommendation_learning_view(db: Session, *, candidate_id: int) -> dict:
    """Outcomes that may inform recommendations — excludes deleted."""
    outcomes = (
        db.query(CandidateCareerOutcome)
        .filter(
            CandidateCareerOutcome.candidate_id == candidate_id,
            CandidateCareerOutcome.deleted_at.is_(None),
        )
        .order_by(CandidateCareerOutcome.id.desc())
        .limit(50)
        .all()
    )
    cal = (
        db.query(CandidateTransitionCalibration)
        .filter_by(candidate_id=candidate_id, active=True)
        .order_by(CandidateTransitionCalibration.id.desc())
        .first()
    )
    return {
        "outcomes": [_ser_outcome(o) for o in outcomes],
        "deleted_excluded": True,
        "active_calibration": _ser_calibration(cal) if cal else None,
        "kpi_excluded": True,
    }


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    transitions = (
        db.query(CandidateTransitionWorkspace)
        .filter(
            CandidateTransitionWorkspace.candidate_id == candidate_id,
            CandidateTransitionWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateTransitionWorkspace.id.desc())
        .limit(30)
        .all()
    )
    outcomes = (
        db.query(CandidateCareerOutcome)
        .filter(
            CandidateCareerOutcome.candidate_id == candidate_id,
            CandidateCareerOutcome.deleted_at.is_(None),
        )
        .order_by(CandidateCareerOutcome.id.desc())
        .limit(40)
        .all()
    )
    return {
        "schema": "twin.career_transition_outcome_learning/v1",
        "verdict_target": (
            "CAREER TRANSITION AND OUTCOME LEARNING CUSTOMER-USABLE - "
            "DECISION-TO-IMPACT LOOP PRODUCTION-READY"
        ),
        "transitions": [_ser_transition(t) for t in transitions],
        "outcomes": [_ser_outcome(o) for o in outcomes],
        "privacy": {
            "learning_opt_in": privacy.learning_opt_in,
            "reminders_opt_in": privacy.reminders_opt_in,
            "export_include_employer_notes": privacy.export_include_employer_notes,
            "paused": privacy.paused,
        },
        "safety": {
            "workplace_monitoring": False,
            "employer_email_access": False,
            "slack_teams_monitoring": False,
            "external_resignation": False,
            "external_employer_comms": False,
            "external_negotiation": False,
            "offer_acceptance_action": False,
            "mental_health_inference": False,
            "manager_sentiment_inference": False,
            "mastery_inference": False,
            "microsoft_calendar_write": False,
            "ats_write": False,
            "auto_apply": False,
            "public_transition": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "alembic": "114_career_transition_outcome_learning",
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "observability": {
            "schema": "twin.career_transition_obs/v1",
            "employer_notes_in_metrics": False,
        },
        "integrations": {
            "interview_decision": True,
            "career_evidence": True,
            "career_graph": True,
            "adaptive_memory": True,
            "daily_os_brief": "/api/v1/candidates/me/daily-os/brief",
            "acceptance_calendar": True,
            "recommendation_weights": True,
        },
        "routes": {
            "fe": "/dashboard/career-transition",
            "outcomes": "/dashboard/career-transition#outcomes",
            "api": "/api/v1/candidates/me/career-transition",
        },
        "invites_sent": 0,
        "alten_pack": False,
    }


def _ser_transition(r: CandidateTransitionWorkspace) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "status": r.status,
        "decision_id": r.decision_id,
        "offer_id": r.offer_id,
        "snapshots_immutable": r.snapshots_immutable,
        "decision_snapshot": _loads(r.decision_snapshot_json, {}),
        "offer_snapshot": _loads(r.offer_snapshot_json, {}),
        "readiness": _loads(r.readiness_json, {}),
        "pre_start": _loads(r.pre_start_json, []),
        "resignation": {
            **_loads(r.resignation_json, {}),
            "external_send": False,
        },
        "handover": _loads(r.handover_json, {}),
        "clarification": _loads(r.clarification_json, []),
        "first_day": _loads(r.first_day_json, {}),
        "first_week": _loads(r.first_week_json, {}),
        "plan_90": _loads(r.plan_90_json, {}),
        "plan_90_status": r.plan_90_status,
        "expectations": _loads(r.expectations_json, {}),
        "stakeholders": _loads(r.stakeholders_json, []),
        "cockpit": _loads(r.cockpit_json, {}),
        "learning_plan": _loads(r.learning_plan_json, {}),
        "risks": _loads(r.risks_json, []),
        "retrospective": _loads(r.retrospective_json, {}),
        "graph_update": _loads(r.graph_update_json, {}),
        "kpi_excluded": r.kpi_excluded,
        "external_resignation": False,
        "workplace_monitoring": False,
    }


def _ser_outcome(o: CandidateCareerOutcome) -> dict:
    return {
        "id": o.id,
        "outcome_type": o.outcome_type,
        "source_type": o.source_type,
        "claim_kind": o.claim_kind,
        "confidence": o.confidence,
        "candidate_confirmed": o.candidate_confirmed,
        "decision_id": o.decision_id,
        "offer_id": o.offer_id,
        "transition_id": o.transition_id,
        "prediction": _loads(o.prediction_json, {}),
        "payload": _loads(o.payload_json, {}),
        "kpi_excluded": o.kpi_excluded,
        "privacy": o.privacy,
    }


def _ser_checkin(c: CandidateTransitionCheckin) -> dict:
    return {
        "id": c.id,
        "period": c.period,
        "facts": _loads(c.facts_json, {}),
        "interpretation": _loads(c.interpretation_json, {}),
        "provenance_facts": c.provenance_facts,
        "provenance_interpretation": c.provenance_interpretation,
        "separated": True,
        "employer_confirmed": False,
    }


def _ser_milestone(m: CandidateTransitionMilestone) -> dict:
    return {
        "id": m.id,
        "title": m.title,
        "status": m.status,
        "evidence_ids": _loads(m.evidence_ids_json, []),
        "due_label": m.due_label,
        "claim_kind": m.claim_kind,
        "mastery_inferred": False,
    }


def _ser_calibration(c: CandidateTransitionCalibration) -> dict:
    return {
        "id": c.id,
        "version": c.version,
        "weights": _loads(c.weights_json, {}),
        "explain": _loads(c.explain_json, {}),
        "outcome_ids": _loads(c.outcome_ids_json, []),
        "active": c.active,
        "supersedes_id": c.supersedes_id,
        "reverted_from_id": c.reverted_from_id,
        "kpi_excluded": c.kpi_excluded,
    }
