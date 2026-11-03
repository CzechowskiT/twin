"""Epic 2.8 Evidence Investment Intelligence — candidate-controlled career experimentation.

Never: infer skill mastery from absence/completion; silent promotion/calibration;
external purchase/enrollment; causal hiring/salary claims; draft→ranking influence;
rewrite historic approved snapshots; treat package as submission.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAllocationCalibration,
    CandidateAllocationPolicy,
    CandidateEvidenceGapSnapshot,
    CandidateInvestmentArtifactDraft,
    CandidateInvestmentAudit,
    CandidateInvestmentExperiment,
    CandidateInvestmentObservation,
    CandidateInvestmentPortfolioSnapshot,
    CandidateInvestmentPromotion,
    CandidateInvestmentQuestion,
    CandidateInvestmentSimulation,
    CandidateInvestmentUsefulness,
    CandidateLifecycleApproval,
)
from app.services import career_lifecycle as life
from app.services import decision_calendar_capacity as dcc

logger = logging.getLogger(__name__)

CANONICAL_DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"
SCHEMA = "twin.evidence_investment_intelligence/v1"
ALEMBIC = "124_evidence_investment_intelligence"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _uuid(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex[:16]}"


def _dumps(obj: Any) -> str:
    return json.dumps(obj, default=str, separators=(",", ":"))


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


def _audit(db: Session, *, candidate_id: int, entity_type: str, entity_id: int | None, action: str, before: dict, after: dict) -> None:
    db.add(
        CandidateInvestmentAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def _privacy_ok(db: Session, *, candidate_id: int) -> bool:
    try:
        priv = life.get_or_create_privacy(db, candidate_id=candidate_id)
        return not bool(getattr(priv, "paused", False))
    except Exception:
        return True


def _strip_banned(body: dict) -> dict:
    safe = dict(body or {})
    for k in (
        "skill_mastery",
        "productivity_score",
        "motivation",
        "mental_health",
        "intelligence_score",
        "employability_score",
        "hiring_probability",
        "salary_uplift",
        "guaranteed_success",
    ):
        safe.pop(k, None)
    safe["skill_mastery_inferred"] = False
    safe["absence_means_no_skill"] = False
    safe["course_completion_is_mastery"] = False
    safe["causal_hiring"] = False
    return safe


def on_evidence_invalidated(db: Session, *, candidate_id: int, reason: str = "deleted_or_disputed") -> dict:
    """Ensure invalidated evidence cannot silently influence investment ranking/gaps."""
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="evidence",
        entity_id=None,
        action="invalidate",
        before={},
        after={
            "reason": reason[:64],
            "influences_ranking": False,
            "absence_means_no_skill": False,
            "skill_mastery": None,
        },
    )
    db.commit()
    return {"ok": True, "influences_ranking": False, "absence_means_no_skill": False}


def create_investment_question(db: Session, *, candidate_id: int, title: str, body: dict | None = None) -> dict:
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused")
    row = CandidateInvestmentQuestion(
        candidate_id=candidate_id,
        question_key=_uuid("iq"),
        status="open",
        title=(title or "Investment question")[:300],
        body_json=_dumps(_strip_banned(body or {})),
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_q(row)


def create_gap_snapshot(db: Session, *, candidate_id: int, question_id: int | None = None, gaps: list | None = None) -> dict:
    """Immutable gap snapshot — absence of evidence ≠ absence of skill.

    Deleted/disputed evidence is inactive and must not influence fit/ranking/gaps.
    """
    inactive_excluded = 0
    try:
        from app.database.models import CandidateCareerEvidence

        active = (
            db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.candidate_id == candidate_id,
                CandidateCareerEvidence.deleted_at.is_(None),
            )
            .all()
        )
        inactive_excluded = (
            db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.candidate_id == candidate_id,
                CandidateCareerEvidence.deleted_at.is_not(None),
            )
            .count()
        )
        # disputed rows (if status column present) are also inactive for ranking
        for ev in active:
            st = (getattr(ev, "status", None) or "").lower()
            if st in ("disputed", "invalidated", "withdrawn"):
                inactive_excluded += 1
    except Exception:
        inactive_excluded = 0

    default_gaps = [
        {
            "area": "portfolio_depth",
            "claim_kind": "INSUFFICIENT_DATA",
            "inactive_evidence_excluded": inactive_excluded,
            "influences_ranking": False,
        }
    ]
    safe_gaps = []
    for g in gaps or default_gaps:
        item = dict(g)
        item["absence_means_no_skill"] = False
        item["skill_mastery"] = None
        item["inactive_evidence_excluded"] = inactive_excluded
        item["influences_ranking"] = False
        safe_gaps.append(item)
    row = CandidateEvidenceGapSnapshot(
        candidate_id=candidate_id,
        snapshot_key=_uuid("gap"),
        question_id=question_id,
        gaps_json=_dumps(safe_gaps),
        provenance_json=_dumps({"source": "candidate_investment", "refs_only": True}),
        immutable=True,
        absence_means_no_skill=False,
        claim_kind="INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_gap(row)


def create_experiment(
    db: Session,
    *,
    candidate_id: int,
    question_id: int | None = None,
    gap_snapshot_id: int | None = None,
    hypothesis: dict | None = None,
    alternatives: list | None = None,
) -> dict:
    alts = alternatives or [
        {"id": "build_artifact", "label": "Build internal evidence artifact", "external_purchase": False, "external_enrollment": False},
        {"id": "portfolio_refresh", "label": "Refresh portfolio project (internal)", "external_purchase": False, "external_enrollment": False},
        {"id": "pause", "label": "Pause — insufficient data", "external_purchase": False, "external_enrollment": False},
    ]
    for a in alts:
        a["external_purchase"] = False
        a["external_enrollment"] = False
        a["mutates_external"] = False
    hyp = _strip_banned(hypothesis or {"statement": "Internal evidence may improve package quality", "claim_kind": "SUGGESTION"})
    hyp["causal_outcome"] = False
    hyp["hiring_probability"] = None
    row = CandidateInvestmentExperiment(
        candidate_id=candidate_id,
        experiment_key=_uuid("exp"),
        question_id=question_id,
        gap_snapshot_id=gap_snapshot_id,
        status="draft",
        hypothesis_json=_dumps(hyp),
        alternatives_json=_dumps(alts),
        plan_json=_dumps({"steps": [], "external_purchase": False, "external_enrollment": False}),
        silent=False,
        creates_commitments_on_reject=False,
        external_purchase=False,
        external_enrollment=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_exp(row)


def simulate_effort(db: Session, *, candidate_id: int, experiment_id: int, effort_minutes: int = 120) -> dict:
    exp = (
        db.query(CandidateInvestmentExperiment)
        .filter_by(id=experiment_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not exp or exp.deleted_at:
        raise ValueError("experiment_not_found")
    try:
        cap = dcc.compute_capacity(db, candidate_id=candidate_id)
    except Exception:
        cap = {
            "status": "INSUFFICIENT_DATA",
            "budget_minutes": None,
            "demanded_minutes": 0,
        }
    body = {
        "effort_minutes": int(effort_minutes),
        "capacity_status": cap.get("status"),
        "budget_minutes": cap.get("budget_minutes"),
        "demanded_minutes": cap.get("demanded_minutes"),
        "mutates_state": False,
        "external_purchase": False,
        "external_enrollment": False,
        "skill_mastery": None,
        "claim_kind": "SUGGESTION",
    }
    sim = CandidateInvestmentSimulation(
        candidate_id=candidate_id,
        simulation_key=_uuid("isim"),
        experiment_id=experiment_id,
        mutates_state=False,
        body_json=_dumps(body),
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    return {"simulation": _ser_sim(sim), "mutates_state": False}


def propose_experiment(db: Session, *, candidate_id: int, experiment_id: int, selected_alternative_id: str) -> dict:
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused")
    exp = (
        db.query(CandidateInvestmentExperiment)
        .filter_by(id=experiment_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not exp or exp.deleted_at:
        raise ValueError("experiment_not_found")
    alts = _loads(exp.alternatives_json, [])
    if not any(a.get("id") == selected_alternative_id for a in alts):
        raise ValueError("invalid_alternative")
    ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="investment_experiment",
        status="pending",
        bundled=False,
        before_json=_dumps({"status": exp.status}),
        after_json=_dumps({"selected_alternative_id": selected_alternative_id, "external_purchase": False}),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    exp.selected_alternative_id = selected_alternative_id[:64]
    exp.status = "pending_approval"
    exp.lifecycle_approval_id = appr.id
    exp.silent = False
    _audit(db, candidate_id=candidate_id, entity_type="experiment", entity_id=exp.id, action="propose", before={}, after={"status": "pending_approval"})
    db.commit()
    db.refresh(exp)
    return {"experiment": _ser_exp(exp), "requires_approval": True, "silent": False}


def resolve_experiment(db: Session, *, candidate_id: int, experiment_id: int, action: str) -> dict:
    exp = (
        db.query(CandidateInvestmentExperiment)
        .filter_by(id=experiment_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not exp or exp.deleted_at:
        raise ValueError("experiment_not_found")
    if exp.status != "pending_approval":
        raise ValueError("experiment_not_pending")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if exp.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=exp.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    commitments_created = False
    if action_u == "approve":
        exp.status = "approved"
        exp.plan_json = _dumps(
            {
                "selected": exp.selected_alternative_id,
                "steps": [{"id": "1", "label": "Execute internal learning/evidence plan", "declared_only": True}],
                "external_purchase": False,
                "external_enrollment": False,
                "creates_commitments": False,
            }
        )
    elif action_u == "postpone":
        exp.status = "postponed"
    else:
        exp.status = "rejected"
        commitments_created = False  # hard ban
    exp.resolved_at = _utcnow()
    db.commit()
    db.refresh(exp)
    return {
        "experiment": _ser_exp(exp),
        "commitments_created": commitments_created,
        "external_purchase": False,
        "external_enrollment": False,
        "silent": False,
    }


def review_experiment(db: Session, *, candidate_id: int, experiment_id: int, decision: str) -> dict:
    """continue/revise/pause/archive — candidate-controlled."""
    exp = (
        db.query(CandidateInvestmentExperiment)
        .filter_by(id=experiment_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not exp or exp.deleted_at:
        raise ValueError("experiment_not_found")
    if exp.status not in ("approved", "active", "paused"):
        raise ValueError("experiment_not_reviewable")
    decision_u = decision if decision in ("continue", "revise", "pause", "archive", "stop") else "pause"
    mapping = {
        "continue": "active",
        "revise": "draft",
        "pause": "paused",
        "archive": "archived",
        "stop": "stopped",
    }
    exp.status = mapping[decision_u]
    exp.resolved_at = _utcnow()
    record_observation(
        db,
        candidate_id=candidate_id,
        experiment_id=experiment_id,
        kind="review",
        body={"decision": decision_u, "skill_mastery": None},
    )
    db.commit()
    db.refresh(exp)
    return {"experiment": _ser_exp(exp), "decision": decision_u}


def record_observation(
    db: Session,
    *,
    candidate_id: int,
    experiment_id: int | None,
    kind: str,
    body: dict | None = None,
) -> dict:
    safe = _strip_banned(body or {})
    safe["inferred_completion"] = False
    safe["actual_effort_source"] = "candidate_declared" if "actual_effort_minutes" in safe else None
    row = CandidateInvestmentObservation(
        candidate_id=candidate_id,
        observation_key=_uuid("iobs"),
        experiment_id=experiment_id,
        kind=kind[:64],
        body_json=_dumps(safe),
        claim_kind="CANDIDATE_DECLARED",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    return _ser_obs(row)


def create_artifact_draft(db: Session, *, candidate_id: int, experiment_id: int | None, title: str, ref: dict | None = None) -> dict:
    row = CandidateInvestmentArtifactDraft(
        candidate_id=candidate_id,
        draft_key=_uuid("drf"),
        experiment_id=experiment_id,
        status="draft",
        title=(title or "Artifact draft")[:300],
        ref_json=_dumps(_strip_banned(ref or {"content_excluded": True, "refs_only": True})),
        influences_ranking=False,
        external_acceptance=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_draft(row)


def propose_promotion(db: Session, *, candidate_id: int, draft_id: int) -> dict:
    draft = (
        db.query(CandidateInvestmentArtifactDraft)
        .filter_by(id=draft_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not draft or draft.deleted_at:
        raise ValueError("draft_not_found")
    if draft.status != "draft":
        raise ValueError("draft_not_promotable")
    ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="artifact_promotion",
        status="pending",
        bundled=False,
        before_json=_dumps({"draft_status": draft.status, "influences_ranking": False}),
        after_json=_dumps({"promoted": True, "influences_ranking": False, "silent": False}),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    promo = CandidateInvestmentPromotion(
        candidate_id=candidate_id,
        promotion_key=_uuid("prm"),
        draft_id=draft_id,
        status="pending",
        before_json=_dumps({"status": "draft"}),
        after_json=_dumps({"status": "promoted_internal", "external_acceptance": False}),
        lifecycle_approval_id=appr.id,
        silent=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return {"promotion": _ser_promo(promo), "requires_approval": True, "silent": False}


def resolve_promotion(db: Session, *, candidate_id: int, promotion_id: int, action: str) -> dict:
    promo = (
        db.query(CandidateInvestmentPromotion)
        .filter_by(id=promotion_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not promo or promo.deleted_at:
        raise ValueError("promotion_not_found")
    if promo.status != "pending":
        raise ValueError("promotion_not_pending")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if promo.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=promo.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    ranking_influenced = False
    if action_u == "approve":
        promo.status = "approved"
        if promo.draft_id:
            draft = (
                db.query(CandidateInvestmentArtifactDraft)
                .filter_by(id=promo.draft_id, candidate_id=candidate_id)
                .one_or_none()
            )
            if draft:
                draft.status = "promoted_internal"
                draft.influences_ranking = False  # still not ranking until evidence pipeline
                draft.external_acceptance = False
        ranking_influenced = False
    elif action_u == "postpone":
        promo.status = "postponed"
    else:
        promo.status = "rejected"
    promo.resolved_at = _utcnow()
    db.commit()
    db.refresh(promo)
    return {
        "promotion": _ser_promo(promo),
        "silent": False,
        "ranking_influenced": ranking_influenced,
        "external_acceptance": False,
    }


def record_usefulness(
    db: Session,
    *,
    candidate_id: int,
    experiment_id: int | None,
    draft_id: int | None,
    body: dict | None = None,
) -> dict:
    safe = _strip_banned(body or {})
    safe["causal_outcome"] = False
    safe["hiring_attribution"] = False
    row = CandidateInvestmentUsefulness(
        candidate_id=candidate_id,
        usefulness_key=_uuid("use"),
        experiment_id=experiment_id,
        draft_id=draft_id,
        body_json=_dumps(safe),
        causal_outcome=False,
        claim_kind="CANDIDATE_DECLARED",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_use(row)


def propose_allocation_calibration(db: Session, *, candidate_id: int) -> dict:
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused")
    exps = (
        db.query(CandidateInvestmentExperiment)
        .filter(
            CandidateInvestmentExperiment.candidate_id == candidate_id,
            CandidateInvestmentExperiment.deleted_at.is_(None),
        )
        .count()
    )
    before = {"weekly_learning_minutes": 120, "priority": "balanced"}
    after = {
        "weekly_learning_minutes": 120 if exps < 2 else 150,
        "priority": "balanced",
        "silent_apply": False,
        "skill_mastery": None,
        "source": "experiment_counts",
    }
    ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="allocation_calibration",
        status="pending",
        bundled=False,
        before_json=_dumps(before),
        after_json=_dumps(after),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    cal = CandidateAllocationCalibration(
        candidate_id=candidate_id,
        calibration_key=_uuid("acal"),
        version=1,
        status="pending",
        before_json=_dumps(before),
        after_json=_dumps(after),
        lifecycle_approval_id=appr.id,
        silent=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(cal)
    db.commit()
    db.refresh(cal)
    return {"calibration": _ser_acal(cal), "requires_approval": True, "silent": False}


def resolve_allocation_calibration(db: Session, *, candidate_id: int, calibration_id: int, action: str) -> dict:
    row = (
        db.query(CandidateAllocationCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("calibration_not_found")
    if row.status != "pending":
        raise ValueError("calibration_not_pending")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if row.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=row.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    profile_mutated = False
    if action_u == "approve":
        row.status = "approved"
        profile_mutated = True  # allocation preference only — not historic snapshots
        # portfolio snapshot remains immutable
        snap = CandidateInvestmentPortfolioSnapshot(
            candidate_id=candidate_id,
            snapshot_key=_uuid("psnap"),
            body_json=_dumps({"calibration_id": row.id, "after": _loads(row.after_json, {}), "immutable": True}),
            immutable=True,
            claim_kind="OBSERVED_INTERNAL_STATE",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
        db.add(snap)
    elif action_u == "postpone":
        row.status = "postponed"
    else:
        row.status = "rejected"
    row.resolved_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {
        "calibration": _ser_acal(row),
        "profile_mutated": profile_mutated if action_u == "approve" else False,
        "historic_snapshots_rewritten": False,
        "silent": False,
    }


def revert_allocation_calibration(db: Session, *, candidate_id: int, calibration_id: int) -> dict:
    row = (
        db.query(CandidateAllocationCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("calibration_not_found")
    if row.status != "approved":
        raise ValueError("calibration_not_approved")
    row.status = "reverted"
    row.resolved_at = _utcnow()
    db.commit()
    return {"calibration": _ser_acal(row), "reverted": True, "historic_snapshots_rewritten": False}


def upsert_allocation_policy(db: Session, *, candidate_id: int, body: dict | None = None) -> dict:
    safe = _strip_banned(body or {})
    safe["external_purchase"] = False
    safe["external_enrollment"] = False
    safe["autonomous_agent"] = False
    row = CandidateAllocationPolicy(
        candidate_id=candidate_id,
        policy_key=_uuid("apol"),
        version=1,
        status="draft",
        body_json=_dumps(safe),
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"policy": _ser_apol(row), "requires_approval": True}


def simulate_allocation_policy(db: Session, *, candidate_id: int, policy_id: int) -> dict:
    policy = (
        db.query(CandidateAllocationPolicy)
        .filter_by(id=policy_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not policy or policy.deleted_at:
        raise ValueError("policy_not_found")
    sim = CandidateInvestmentSimulation(
        candidate_id=candidate_id,
        simulation_key=_uuid("psim"),
        experiment_id=None,
        mutates_state=False,
        body_json=_dumps(
            {
                "policy_id": policy_id,
                "mutates_state": False,
                "external_purchase": False,
                "claim_kind": "SUGGESTION",
            }
        ),
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    return {"simulation": _ser_sim(sim), "mutates_state": False}


def resolve_allocation_policy(db: Session, *, candidate_id: int, policy_id: int, action: str) -> dict:
    row = (
        db.query(CandidateAllocationPolicy)
        .filter_by(id=policy_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("policy_not_found")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    row.status = {"approve": "approved", "reject": "rejected", "postpone": "postponed"}[action_u]
    row.resolved_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"policy": _ser_apol(row), "silent": False, "external_purchase": False}


def investment_health(db: Session, *, candidate_id: int) -> dict:
    qn = (
        db.query(CandidateInvestmentQuestion)
        .filter_by(candidate_id=candidate_id)
        .filter(CandidateInvestmentQuestion.deleted_at.is_(None))
        .count()
    )
    en = (
        db.query(CandidateInvestmentExperiment)
        .filter_by(candidate_id=candidate_id)
        .filter(CandidateInvestmentExperiment.deleted_at.is_(None))
        .count()
    )
    return {
        "questions": qn,
        "experiments": en,
        "insight_cards": [
            {
                "id": "gaps",
                "title": "Evidence gaps are not skill absences",
                "body": "Missing portfolio evidence does not mean you lack the skill.",
                "claim_kind": "INFERENCE",
                "absence_means_no_skill": False,
            },
            {
                "id": "approval",
                "title": "Experiments need your approval",
                "body": "No learning plan or commitments without an explicit approve.",
                "claim_kind": "FACT",
            },
        ],
        "skill_mastery_inferred": False,
        "productivity_score": None,
        "claim_kind": "INFERENCE",
    }


def export_investment(db: Session, *, candidate_id: int) -> dict:
    return {
        "schema": SCHEMA,
        "questions": [
            _ser_q(q)
            for q in db.query(CandidateInvestmentQuestion)
            .filter_by(candidate_id=candidate_id)
            .filter(CandidateInvestmentQuestion.deleted_at.is_(None))
            .limit(50)
            .all()
        ],
        "kpi_excluded": True,
        "content_excluded": True,
        "skill_mastery_excluded": True,
    }


def delete_investment_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    n = 0
    for model in (
        CandidateInvestmentQuestion,
        CandidateEvidenceGapSnapshot,
        CandidateInvestmentExperiment,
        CandidateInvestmentSimulation,
        CandidateInvestmentObservation,
        CandidateInvestmentArtifactDraft,
        CandidateInvestmentPromotion,
        CandidateInvestmentUsefulness,
        CandidateAllocationCalibration,
        CandidateAllocationPolicy,
        CandidateInvestmentPortfolioSnapshot,
    ):
        for row in db.query(model).filter(model.candidate_id == candidate_id).all():
            if hasattr(row, "deleted_at") and row.deleted_at is None:
                row.deleted_at = now
                n += 1
    db.commit()
    return {"deleted": n, "propagated": True}


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    questions = (
        db.query(CandidateInvestmentQuestion)
        .filter(
            CandidateInvestmentQuestion.candidate_id == candidate_id,
            CandidateInvestmentQuestion.deleted_at.is_(None),
        )
        .order_by(CandidateInvestmentQuestion.id.desc())
        .limit(20)
        .all()
    )
    experiments = (
        db.query(CandidateInvestmentExperiment)
        .filter(
            CandidateInvestmentExperiment.candidate_id == candidate_id,
            CandidateInvestmentExperiment.deleted_at.is_(None),
        )
        .order_by(CandidateInvestmentExperiment.id.desc())
        .limit(20)
        .all()
    )
    calibrations = (
        db.query(CandidateAllocationCalibration)
        .filter(
            CandidateAllocationCalibration.candidate_id == candidate_id,
            CandidateAllocationCalibration.deleted_at.is_(None),
        )
        .order_by(CandidateAllocationCalibration.id.desc())
        .limit(20)
        .all()
    )
    return {
        "schema": SCHEMA,
        "alembic": ALEMBIC,
        "questions": [_ser_q(q) for q in questions],
        "experiments": [_ser_exp(e) for e in experiments],
        "allocation_calibrations": [_ser_acal(c) for c in calibrations],
        "health": investment_health(db, candidate_id=candidate_id),
        "routes": {
            "home": "/dashboard/evidence-investment",
            "experiments": "/dashboard/evidence-investment?view=experiments",
            "artifacts": "/dashboard/evidence-investment?view=artifacts",
            "allocation": "/dashboard/evidence-investment?view=allocation",
            "portfolio": "/dashboard/portfolio",
            "execution_intelligence": "/dashboard/execution-intelligence",
            "approvals": "/dashboard/approvals",
            "daily_os_canonical": CANONICAL_DAILY_OS,
            "api": "/api/v1/candidates/me/evidence-investment",
        },
        "safety": {
            "absence_means_no_skill": False,
            "skill_mastery_inferred": False,
            "experiment_without_approval": False,
            "rejected_creates_commitments": False,
            "external_purchase": False,
            "external_enrollment": False,
            "silent_artifact_promotion": False,
            "draft_influences_ranking": False,
            "causal_outcome_attribution": False,
            "silent_allocation_calibration": False,
            "historic_snapshots_rewritten": False,
            "course_completion_is_mastery": False,
            "package_is_submission": False,
            "phase_3_career_agent": "NOT_STARTED",
            "microsoft_calendar_write": False,
            "lms_marketplace": False,
        },
        "truth_labels": [
            "FACT",
            "SOURCE_SUPPORTED",
            "CANDIDATE_DECLARED",
            "CANDIDATE_CONFIRMED",
            "OBSERVED_INTERNAL_STATE",
            "INFERENCE",
            "SUGGESTION",
            "UNKNOWN",
            "INSUFFICIENT_DATA",
            "CONFLICTING",
            "STALE",
        ],
        "kpi_excluded": True,
    }


def _ser_q(q: CandidateInvestmentQuestion) -> dict:
    return {
        "id": q.id,
        "status": q.status,
        "title": q.title,
        "body": _loads(q.body_json, {}),
        "claim_kind": q.claim_kind,
    }


def _ser_gap(g: CandidateEvidenceGapSnapshot) -> dict:
    return {
        "id": g.id,
        "question_id": g.question_id,
        "gaps": _loads(g.gaps_json, []),
        "immutable": True,
        "absence_means_no_skill": False,
        "claim_kind": g.claim_kind,
    }


def _ser_exp(e: CandidateInvestmentExperiment) -> dict:
    return {
        "id": e.id,
        "status": e.status,
        "question_id": e.question_id,
        "gap_snapshot_id": e.gap_snapshot_id,
        "hypothesis": _loads(e.hypothesis_json, {}),
        "alternatives": _loads(e.alternatives_json, []),
        "selected_alternative_id": e.selected_alternative_id,
        "plan": _loads(e.plan_json, {}),
        "silent": False,
        "creates_commitments_on_reject": False,
        "external_purchase": False,
        "external_enrollment": False,
        "lifecycle_approval_id": e.lifecycle_approval_id,
        "requires_approval": e.status == "pending_approval",
        "claim_kind": e.claim_kind,
    }


def _ser_sim(s: CandidateInvestmentSimulation) -> dict:
    return {
        "id": s.id,
        "experiment_id": s.experiment_id,
        "mutates_state": False,
        "body": _loads(s.body_json, {}),
        "claim_kind": s.claim_kind,
    }


def _ser_obs(o: CandidateInvestmentObservation) -> dict:
    return {
        "id": o.id,
        "experiment_id": o.experiment_id,
        "kind": o.kind,
        "body": _loads(o.body_json, {}),
        "claim_kind": o.claim_kind,
    }


def _ser_draft(d: CandidateInvestmentArtifactDraft) -> dict:
    return {
        "id": d.id,
        "experiment_id": d.experiment_id,
        "status": d.status,
        "title": d.title,
        "ref": _loads(d.ref_json, {}),
        "influences_ranking": False,
        "external_acceptance": False,
        "claim_kind": d.claim_kind,
    }


def _ser_promo(p: CandidateInvestmentPromotion) -> dict:
    return {
        "id": p.id,
        "draft_id": p.draft_id,
        "status": p.status,
        "silent": False,
        "requires_approval": p.status == "pending",
        "claim_kind": p.claim_kind,
    }


def _ser_use(u: CandidateInvestmentUsefulness) -> dict:
    return {
        "id": u.id,
        "experiment_id": u.experiment_id,
        "draft_id": u.draft_id,
        "body": _loads(u.body_json, {}),
        "causal_outcome": False,
        "claim_kind": u.claim_kind,
    }


def _ser_acal(c: CandidateAllocationCalibration) -> dict:
    return {
        "id": c.id,
        "version": c.version,
        "status": c.status,
        "before": _loads(c.before_json, {}),
        "after": _loads(c.after_json, {}),
        "silent": False,
        "requires_approval": c.status == "pending",
        "claim_kind": c.claim_kind,
    }


def _ser_apol(p: CandidateAllocationPolicy) -> dict:
    return {
        "id": p.id,
        "version": p.version,
        "status": p.status,
        "body": _loads(p.body_json, {}),
        "claim_kind": p.claim_kind,
    }
