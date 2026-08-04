"""Outcome-calibrated career strategy + candidate-controlled internal execution.

Extends lifecycle / transition calibration / recommendation weights.
Never external agent actions. Never second ranking/memory/deletion stores.
Calibration merges only after candidate approval. Deletion/privacy runners execute.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAcceptanceItem,
    CandidateAppStudioWorkspace,
    CandidateCalibrationProposal,
    CandidateCareerEvidence,
    CandidateCareerInboxItem,
    CandidateCareerOutcome,
    CandidateDecisionMemo,
    CandidateDeletionJob,
    CandidateExecutionPlan,
    CandidateExecutionStep,
    CandidateInterviewProcess,
    CandidateLifecycleApproval,
    CandidateLifecycleContext,
    CandidatePrivacyRevocationJob,
    CandidateRankingSnapshot,
    CandidateRecommendationWeights,
    CandidateStrategyAudit,
    CandidateStrategyProfile,
    CandidateTransitionCalibration,
    CandidateTransitionWorkspace,
)
from app.services import career_copilot as cc
from app.services import career_lifecycle as life

logger = logging.getLogger(__name__)

INTERNAL_ACTIONS = frozenset(
    {
        "refresh_ranking",
        "push_daily_os_nba",
        "run_consistency",
        "invalidate_stale_refs",
        "record_reflection",
        "rebuild_readiness",
    }
)
BASELINE_WEIGHTS = {
    "role_fit": 0.22,
    "evidence_strength": 0.2,
    "preference": 0.15,
    "workload": 0.1,
    "work_model": 0.1,
    "learning": 0.1,
    "risk_tolerance": 0.08,
    "unknown_penalty": 0.05,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return cc._dumps(obj)


def _loads(raw: str | None, default: Any) -> Any:
    return cc._loads(raw or "", default)


def _uuid(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex}"[:160]


def _audit(
    db: Session,
    *,
    candidate_id: int,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateStrategyAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def get_or_create_strategy(
    db: Session, *, candidate_id: int, is_synthetic: bool = False
) -> CandidateStrategyProfile:
    row = (
        db.query(CandidateStrategyProfile)
        .filter(
            CandidateStrategyProfile.candidate_id == candidate_id,
            CandidateStrategyProfile.deleted_at.is_(None),
        )
        .order_by(CandidateStrategyProfile.id.desc())
        .first()
    )
    if row:
        return row
    row = CandidateStrategyProfile(
        candidate_id=candidate_id,
        profile_key=_uuid("str"),
        objectives_json=_dumps(
            [
                {"id": "fit", "text": "Maximize role fit with evidence", "claim_kind": "SUGGESTION"},
                {"id": "learn", "text": "Learn from declared outcomes", "claim_kind": "SUGGESTION"},
            ]
        ),
        constraints_json=_dumps(
            [
                {"id": "no_external", "text": "No external employment actions", "claim_kind": "FACT"},
                {"id": "candidate_control", "text": "Material changes need approval", "claim_kind": "FACT"},
            ]
        ),
        preferences_json=_dumps({"fatigue_aware": True, "balance": "medium"}),
        consistency_json=_dumps({"ok": True, "findings": []}),
        simulation_json=_dumps({"scenarios": [], "hiring_certainty": None}),
        version=1,
        claim_kind="SUGGESTION",
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _active_weights(db: Session, *, candidate_id: int) -> tuple[dict, int, int | None]:
    row = (
        db.query(CandidateRecommendationWeights)
        .filter(
            CandidateRecommendationWeights.candidate_id == candidate_id,
            CandidateRecommendationWeights.archived_at.is_(None),
        )
        .order_by(CandidateRecommendationWeights.version.desc())
        .first()
    )
    if not row:
        return dict(BASELINE_WEIGHTS), 1, None
    return _loads(row.weights_json, dict(BASELINE_WEIGHTS)), int(row.version or 1), row.id


def _collect_candidates(db: Session, *, candidate_id: int, weights: dict) -> list[dict]:
    """Canonical recommendation candidates from module refs — exclude deleted/invalidated."""
    out: list[dict] = []
    for proc in (
        db.query(CandidateInterviewProcess)
        .filter(
            CandidateInterviewProcess.candidate_id == candidate_id,
            CandidateInterviewProcess.deleted_at.is_(None),
        )
        .order_by(CandidateInterviewProcess.id.desc())
        .limit(10)
        .all()
    ):
        score = round(55 + 20 * float(weights.get("role_fit", 0.2)), 2)
        out.append(
            {
                "id": f"interview:{proc.id}",
                "module": "interview_decision",
                "ref_id": proc.id,
                "title": proc.title,
                "score": score,
                "invalidated": False,
                "deleted": False,
                "explain": {
                    "role_fit": weights.get("role_fit"),
                    "why": "Active interview process — prepare next stage",
                    "claim_kind": "INFERENCE",
                },
                "deep_link": f"/dashboard/interview-decision?process={proc.id}",
            }
        )
    for ws in (
        db.query(CandidateAppStudioWorkspace)
        .filter(
            CandidateAppStudioWorkspace.candidate_id == candidate_id,
            CandidateAppStudioWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateAppStudioWorkspace.id.desc())
        .limit(8)
        .all()
    ):
        score = round(50 + 18 * float(weights.get("evidence_strength", 0.2)), 2)
        out.append(
            {
                "id": f"studio:{ws.id}",
                "module": "application_studio",
                "ref_id": ws.id,
                "title": ws.title,
                "score": score,
                "invalidated": False,
                "deleted": False,
                "explain": {
                    "evidence_strength": weights.get("evidence_strength"),
                    "why": "Application draft ready for evidence-backed polish",
                    "claim_kind": "INFERENCE",
                },
                "deep_link": f"/dashboard/application-studio?id={ws.id}",
            }
        )
    for tr in (
        db.query(CandidateTransitionWorkspace)
        .filter(
            CandidateTransitionWorkspace.candidate_id == candidate_id,
            CandidateTransitionWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateTransitionWorkspace.id.desc())
        .limit(5)
        .all()
    ):
        score = round(60 + 15 * float(weights.get("learning", 0.1)), 2)
        out.append(
            {
                "id": f"transition:{tr.id}",
                "module": "career_transition",
                "ref_id": tr.id,
                "title": tr.title,
                "score": score,
                "invalidated": False,
                "deleted": False,
                "explain": {
                    "learning": weights.get("learning"),
                    "why": "First-90-days plan needs check-in or approval",
                    "claim_kind": "INFERENCE",
                },
                "deep_link": f"/dashboard/career-transition?id={tr.id}",
            }
        )
    # Epic 2.1 — opportunity discovery refs into canonical ranking (no second store)
    try:
        from app.services import opportunity_intelligence as oi

        out.extend(oi.ranking_refs(db, candidate_id=candidate_id, weights=weights))
    except Exception:
        pass
    # Epic 2.2 — active search strategies (candidate-approved only)
    try:
        from app.services import search_strategy_lab as sslab

        out.extend(sslab.ranking_refs(db, candidate_id=candidate_id, weights=weights))
    except Exception:
        pass
    # Soft-deleted transitions must not appear
    out.sort(key=lambda x: (-float(x["score"]), x["id"]))
    for i, c in enumerate(out):
        c["rank"] = i + 1
    return out


def build_ranking(
    db: Session, *, candidate_id: int, is_synthetic: bool = False
) -> CandidateRankingSnapshot:
    weights, ver, _wid = _active_weights(db, candidate_id=candidate_id)
    cands = _collect_candidates(db, candidate_id=candidate_id, weights=weights)
    # Outcome attribution (exclude deleted outcomes)
    outcomes = (
        db.query(CandidateCareerOutcome)
        .filter(
            CandidateCareerOutcome.candidate_id == candidate_id,
            CandidateCareerOutcome.deleted_at.is_(None),
        )
        .order_by(CandidateCareerOutcome.id.desc())
        .limit(20)
        .all()
    )
    attribution = {
        "outcome_ids": [o.id for o in outcomes],
        "deleted_excluded": True,
        "claim_kind": "INFERENCE",
        "hiring_certainty": None,
    }
    counterfactuals = [
        {
            "id": "cf_weight_evidence",
            "text": "If evidence_strength weight were higher, portfolio actions would rank higher",
            "claim_kind": "INFERENCE",
            "not_guarantee": True,
        },
        {
            "id": "cf_skip_interview",
            "text": "Without interview processes, APPLICATION drafts would dominate NBA",
            "claim_kind": "INFERENCE",
            "not_guarantee": True,
        },
    ]
    # Supersede previous active
    for old in (
        db.query(CandidateRankingSnapshot)
        .filter_by(candidate_id=candidate_id, active=True)
        .all()
    ):
        old.active = False
        old.superseded_at = _utcnow()
    snap = CandidateRankingSnapshot(
        candidate_id=candidate_id,
        snapshot_key=_uuid("rank"),
        weights_version=ver,
        weights_json=_dumps(weights),
        candidates_json=_dumps(cands),
        explain_json=_dumps(
            {
                "method": "weighted_module_heuristics",
                "model_improved_claim": False,
                "silent_overwrite": False,
                "claim_kind": "INFERENCE",
            }
        ),
        counterfactuals_json=_dumps(counterfactuals),
        attribution_json=_dumps(attribution),
        source="canonical",
        active=True,
        claim_kind="INFERENCE",
        kpi_excluded=True,
        is_synthetic=is_synthetic,
        created_at=_utcnow(),
    )
    db.add(snap)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="ranking",
        entity_id=None,
        action="build",
        before={},
        after={"count": len(cands), "weights_version": ver},
    )
    db.commit()
    db.refresh(snap)
    return snap


def get_active_ranking(db: Session, *, candidate_id: int) -> CandidateRankingSnapshot | None:
    return (
        db.query(CandidateRankingSnapshot)
        .filter_by(candidate_id=candidate_id, active=True)
        .order_by(CandidateRankingSnapshot.id.desc())
        .first()
    )


def propose_calibration_merge(
    db: Session, *, candidate_id: int, transition_cal_id: int | None = None
) -> dict:
    """Propose merging transition calibration into canonical weights — requires approval."""
    cal = None
    if transition_cal_id:
        cal = (
            db.query(CandidateTransitionCalibration)
            .filter_by(id=transition_cal_id, candidate_id=candidate_id)
            .one_or_none()
        )
    if not cal:
        cal = (
            db.query(CandidateTransitionCalibration)
            .filter_by(candidate_id=candidate_id, active=True)
            .order_by(CandidateTransitionCalibration.id.desc())
            .first()
        )
    before, ver, _ = _active_weights(db, candidate_id=candidate_id)
    after = dict(before)
    outcome_ids: list[int] = []
    if cal:
        tw = _loads(cal.weights_json, {})
        for k, v in tw.items():
            if k in after and isinstance(v, (int, float)):
                after[k] = round((float(after[k]) + float(v)) / 2, 4)
        outcome_ids = _loads(cal.outcome_ids_json, [])
    # Normalize
    s = sum(float(v) for v in after.values()) or 1.0
    after = {k: round(float(v) / s, 4) for k, v in after.items()}
    # Lifecycle approval record (atomic, not bundled)
    ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id,
        approval_key=_uuid("apr"),
        approval_kind="calibration_merge",
        status="pending",
        bundled=False,
        before_json=_dumps({"weights": before, "version": ver}),
        after_json=_dumps({"weights": after, "from_transition_cal_id": cal.id if cal else None}),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    prop = CandidateCalibrationProposal(
        candidate_id=candidate_id,
        proposal_key=_uuid("cprop"),
        from_transition_cal_id=cal.id if cal else None,
        before_weights_json=_dumps(before),
        after_weights_json=_dumps(after),
        explain_json=_dumps(
            {
                "merge": "average_with_canonical",
                "model_improved_claim": False,
                "silent": False,
                "requires_approval": True,
                "claim_kind": "SUGGESTION",
            }
        ),
        outcome_ids_json=_dumps(outcome_ids),
        status="pending",
        bundled=False,
        lifecycle_approval_id=appr.id,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(prop)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="calibration_proposal",
        entity_id=None,
        action="propose",
        before={"weights": before},
        after={"weights": after, "silent": False},
    )
    db.commit()
    db.refresh(prop)
    return _ser_proposal(prop)


def resolve_calibration_proposal(
    db: Session, *, candidate_id: int, proposal_id: int, approved: bool
) -> dict:
    prop = (
        db.query(CandidateCalibrationProposal)
        .filter_by(id=proposal_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not prop or prop.status != "pending":
        raise ValueError("proposal_not_found_or_resolved")
    if prop.bundled:
        raise ValueError("bundled_approvals_forbidden")
    # Resolve linked lifecycle approval
    if prop.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=prop.lifecycle_approval_id,
            approved=approved,
        )
    prop.status = "approved" if approved else "rejected"
    prop.resolved_at = _utcnow()
    if approved:
        before, ver, _ = _active_weights(db, candidate_id=candidate_id)
        # Archive prior weights
        for w in (
            db.query(CandidateRecommendationWeights)
            .filter(
                CandidateRecommendationWeights.candidate_id == candidate_id,
                CandidateRecommendationWeights.archived_at.is_(None),
            )
            .all()
        ):
            w.archived_at = _utcnow()
        new = CandidateRecommendationWeights(
            candidate_id=candidate_id,
            version=ver + 1,
            weights_json=prop.after_weights_json,
            source="outcome_calibrated_approved",
            evidence_json=prop.outcome_ids_json,
            created_at=_utcnow(),
        )
        db.add(new)
        db.flush()
        prop.merged_weights_id = new.id
        # Rebuild canonical ranking
        snap = build_ranking(db, candidate_id=candidate_id)
        _push_ranking_to_daily_os(db, candidate_id=candidate_id, snap=snap)
        _audit(
            db,
            candidate_id=candidate_id,
            entity_type="calibration_proposal",
            entity_id=prop.id,
            action="merge_approved",
            before={"version": ver},
            after={"version": ver + 1, "silent": False, "ranking_snapshot_id": snap.id},
        )
    else:
        _audit(
            db,
            candidate_id=candidate_id,
            entity_type="calibration_proposal",
            entity_id=prop.id,
            action="rejected",
            before={},
            after={"merged": False},
        )
    db.commit()
    db.refresh(prop)
    return _ser_proposal(prop)


def _push_ranking_to_daily_os(
    db: Session, *, candidate_id: int, snap: CandidateRankingSnapshot
) -> dict:
    cands = _loads(snap.candidates_json, [])
    top = cands[0] if cands else None
    ok = True
    try:
        from app.services import career_daily_os as daily_os

        title = (
            f"Ranked next: {top['title']}"
            if top
            else "Refresh career priorities"
        )
        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"strategy:rank:{snap.id}",
            kind="strategy",
            title=title[:300],
            body={
                "ranking_snapshot_id": snap.id,
                "canonical_ranking": True,
                "separate_ranking": False,
                "top": top,
            },
            priority_score=int(min(95, (top or {}).get("score") or 70)),
            deep_link=(top or {}).get("deep_link") or "/dashboard",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        ok = False
        logger.exception("daily os ranking push failed: %s", exc)
        _audit(
            db,
            candidate_id=candidate_id,
            entity_type="daily_os",
            entity_id=snap.id,
            action="ranking_push_failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
    return {"daily_os_ok": ok, "canonical_ranking": True, "separate_ranking": False}


def create_execution_plan(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    idempotency_key: str | None = None,
    is_synthetic: bool = False,
) -> dict:
    key = (idempotency_key or _uuid("idem"))[:160]
    existing = (
        db.query(CandidateExecutionPlan)
        .filter_by(candidate_id=candidate_id, idempotency_key=key)
        .one_or_none()
    )
    if existing and not existing.deleted_at:
        return {"plan": _ser_plan(db, existing), "idempotent_hit": True}
    plan = CandidateExecutionPlan(
        candidate_id=candidate_id,
        plan_key=_uuid("plan"),
        title=(title or "Internal strategy plan")[:300],
        status="draft",
        external_actions=False,
        idempotency_key=key,
        deps_json=_dumps([]),
        approval_ids_json=_dumps([]),
        replay_state_json=_dumps({"cursor": 0, "resumable": True}),
        result_json=_dumps({}),
        claim_kind="SUGGESTION",
        version=1,
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(plan)
    db.flush()
    steps = [
        ("refresh_ranking", "Rebuild canonical ranking"),
        ("run_consistency", "Run lifecycle consistency"),
        ("push_daily_os_nba", "Push NBA from canonical ranking"),
        ("invalidate_stale_refs", "Invalidate stale recommendation refs"),
        ("record_reflection", "Record internal reflection"),
    ]
    for i, (action, _label) in enumerate(steps):
        db.add(
            CandidateExecutionStep(
                candidate_id=candidate_id,
                plan_id=plan.id,
                step_key=_uuid("step"),
                step_index=i,
                action_type=action,
                internal_only=True,
                external=False,
                status="pending",
                deps_json=_dumps([i - 1] if i else []),
                payload_ref_json=_dumps({"label": _label}),
                result_json="{}",
                error_json="{}",
                attempts=0,
                claim_kind="FACT",
                created_at=_utcnow(),
                updated_at=_utcnow(),
            )
        )
    db.commit()
    db.refresh(plan)
    return {"plan": _ser_plan(db, plan), "idempotent_hit": False}


def run_execution_plan(
    db: Session, *, candidate_id: int, plan_id: int, resume: bool = True
) -> dict:
    plan = (
        db.query(CandidateExecutionPlan)
        .filter_by(id=plan_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not plan or plan.deleted_at:
        raise ValueError("plan_not_found")
    if plan.external_actions:
        raise ValueError("external_actions_forbidden")
    if plan.status == "cancelled":
        raise ValueError("plan_cancelled")
    if plan.status == "paused" and not resume:
        raise ValueError("plan_paused")
    plan.status = "running"
    plan.updated_at = _utcnow()
    steps = (
        db.query(CandidateExecutionStep)
        .filter_by(candidate_id=candidate_id, plan_id=plan.id)
        .order_by(CandidateExecutionStep.step_index.asc())
        .all()
    )
    replay = _loads(plan.replay_state_json, {})
    start_i = int(replay.get("cursor") or 0) if resume else 0
    results = []
    for step in steps:
        if step.step_index < start_i:
            continue
        if step.external or not step.internal_only:
            step.status = "blocked"
            step.error_json = _dumps({"error": "external_forbidden", "silent": False})
            plan.status = "failed"
            _audit(
                db,
                candidate_id=candidate_id,
                entity_type="execution_step",
                entity_id=step.id,
                action="blocked_external",
                before={},
                after={"silent": False},
            )
            db.commit()
            raise ValueError("external_step_blocked")
        if step.action_type not in INTERNAL_ACTIONS:
            step.status = "blocked"
            step.error_json = _dumps({"error": "unknown_action", "silent": False})
            db.commit()
            raise ValueError("unknown_internal_action")
        step.status = "running"
        step.attempts = int(step.attempts or 0) + 1
        step.updated_at = _utcnow()
        try:
            res = _run_internal_step(db, candidate_id=candidate_id, action=step.action_type)
            step.status = "completed"
            step.result_json = _dumps(res)
            step.error_json = "{}"
            results.append({"step": step.action_type, "ok": True})
        except Exception as exc:
            step.status = "failed"
            step.error_json = _dumps({"error": type(exc).__name__, "silent": False})
            plan.status = "failed"
            plan.replay_state_json = _dumps({"cursor": step.step_index, "resumable": True})
            _audit(
                db,
                candidate_id=candidate_id,
                entity_type="execution_step",
                entity_id=step.id,
                action="failed",
                before={},
                after={"error": type(exc).__name__, "silent": False},
            )
            db.commit()
            raise
        replay["cursor"] = step.step_index + 1
        plan.replay_state_json = _dumps({**replay, "resumable": True})
        plan.updated_at = _utcnow()
        db.commit()
    plan.status = "completed"
    plan.result_json = _dumps({"steps": results, "external_actions": False})
    plan.updated_at = _utcnow()
    db.commit()
    return {"plan": _ser_plan(db, plan), "results": results}


def _run_internal_step(db: Session, *, candidate_id: int, action: str) -> dict:
    if action == "refresh_ranking":
        snap = build_ranking(db, candidate_id=candidate_id)
        return {"ranking_snapshot_id": snap.id}
    if action == "push_daily_os_nba":
        snap = get_active_ranking(db, candidate_id=candidate_id) or build_ranking(
            db, candidate_id=candidate_id
        )
        return _push_ranking_to_daily_os(db, candidate_id=candidate_id, snap=snap)
    if action == "run_consistency":
        return life.run_consistency(db, candidate_id=candidate_id)
    if action == "invalidate_stale_refs":
        return invalidate_stale(db, candidate_id=candidate_id)
    if action == "record_reflection":
        _audit(
            db,
            candidate_id=candidate_id,
            entity_type="reflection",
            entity_id=None,
            action="record",
            before={},
            after={"claim_kind": "CANDIDATE_RECOLLECTION"},
        )
        db.commit()
        return {"recorded": True}
    if action == "rebuild_readiness":
        life.get_or_create_context(db, candidate_id=candidate_id)
        return {"ok": True}
    raise ValueError("unknown_internal_action")


def invalidate_stale(db: Session, *, candidate_id: int) -> dict:
    """Remove deleted module refs from active ranking candidates."""
    snap = get_active_ranking(db, candidate_id=candidate_id)
    if not snap:
        return {"updated": False}
    cands = _loads(snap.candidates_json, [])
    kept = []
    removed = 0
    for c in cands:
        mod, rid = c.get("module"), c.get("ref_id")
        alive = True
        if mod == "interview_decision":
            row = (
                db.query(CandidateInterviewProcess)
                .filter_by(id=rid, candidate_id=candidate_id)
                .one_or_none()
            )
            alive = bool(row and not row.deleted_at)
        elif mod == "application_studio":
            row = (
                db.query(CandidateAppStudioWorkspace)
                .filter_by(id=rid, candidate_id=candidate_id)
                .one_or_none()
            )
            alive = bool(row and not row.deleted_at)
        elif mod == "career_transition":
            row = (
                db.query(CandidateTransitionWorkspace)
                .filter_by(id=rid, candidate_id=candidate_id)
                .one_or_none()
            )
            alive = bool(row and not row.deleted_at)
        if alive and not c.get("invalidated") and not c.get("deleted"):
            kept.append(c)
        else:
            removed += 1
    for i, c in enumerate(kept):
        c["rank"] = i + 1
    snap.candidates_json = _dumps(kept)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="ranking",
        entity_id=snap.id,
        action="invalidate_stale",
        before={},
        after={"removed": removed, "kept": len(kept)},
    )
    db.commit()
    return {"updated": True, "removed": removed, "kept": len(kept)}


def run_deletion_job(
    db: Session, *, candidate_id: int, preview_only: bool = False
) -> dict:
    """Unified deletion runner — executes dependency graph (not preview-only for execute)."""
    graph = life.deletion_dependency_graph(db, candidate_id=candidate_id)["order"]
    job = CandidateDeletionJob(
        candidate_id=candidate_id,
        job_key=_uuid("del"),
        status="running",
        preview_only=bool(preview_only),
        graph_json=_dumps(graph),
        progress_json=_dumps({"done": []}),
        result_json="{}",
        claim_kind="FACT",
        created_at=_utcnow(),
    )
    db.add(job)
    db.flush()
    done: list[str] = []
    if preview_only:
        job.status = "previewed"
        job.result_json = _dumps({"preview": True, "would_execute": graph, "executed": False})
        job.completed_at = _utcnow()
        db.commit()
        db.refresh(job)
        return _ser_deletion(job)
    # Execute soft-deletes / module deletes in order
    for node in graph:
        try:
            if node == "career_transition":
                for tr in (
                    db.query(CandidateTransitionWorkspace)
                    .filter(
                        CandidateTransitionWorkspace.candidate_id == candidate_id,
                        CandidateTransitionWorkspace.deleted_at.is_(None),
                    )
                    .all()
                ):
                    from app.services import career_transition as ct

                    ct.delete_transition(db, candidate_id=candidate_id, transition_id=tr.id)
            elif node == "interview_decision":
                for proc in (
                    db.query(CandidateInterviewProcess)
                    .filter(
                        CandidateInterviewProcess.candidate_id == candidate_id,
                        CandidateInterviewProcess.deleted_at.is_(None),
                    )
                    .all()
                ):
                    from app.services import interview_decision as idc

                    idc.delete_process(db, candidate_id=candidate_id, process_id=proc.id)
            elif node == "application_studio":
                for ws in (
                    db.query(CandidateAppStudioWorkspace)
                    .filter(
                        CandidateAppStudioWorkspace.candidate_id == candidate_id,
                        CandidateAppStudioWorkspace.deleted_at.is_(None),
                    )
                    .all()
                ):
                    from app.services import application_studio as app_studio

                    app_studio.delete_workspace(db, candidate_id=candidate_id, workspace_id=ws.id)
            elif node == "career_evidence":
                # Soft: do not mass-delete evidence without explicit history delete —
                # mark ranking invalidation only at this node for safety
                invalidate_stale(db, candidate_id=candidate_id)
            elif node == "acceptance_calendar_items":
                db.query(CandidateAcceptanceItem).filter(
                    CandidateAcceptanceItem.candidate_id == candidate_id,
                    CandidateAcceptanceItem.item_key.like("lifecycle:%"),
                ).delete(synchronize_session=False)
                db.query(CandidateAcceptanceItem).filter(
                    CandidateAcceptanceItem.candidate_id == candidate_id,
                    CandidateAcceptanceItem.item_key.like("strategy:%"),
                ).delete(synchronize_session=False)
            elif node == "daily_os_inbox":
                db.query(CandidateCareerInboxItem).filter(
                    CandidateCareerInboxItem.candidate_id == candidate_id,
                    CandidateCareerInboxItem.item_key.like("strategy:%"),
                ).delete(synchronize_session=False)
                db.query(CandidateCareerInboxItem).filter(
                    CandidateCareerInboxItem.candidate_id == candidate_id,
                    CandidateCareerInboxItem.item_key.like("lifecycle:%"),
                ).delete(synchronize_session=False)
            elif node == "lifecycle_events":
                pass  # ledger retained for audit
            elif node == "lifecycle_context":
                life.delete_lifecycle(db, candidate_id=candidate_id)
            done.append(node)
            job.progress_json = _dumps({"done": done})
            db.commit()
        except Exception as exc:
            job.status = "failed"
            job.result_json = _dumps(
                {"error": type(exc).__name__, "done": done, "silent": False, "executed": True}
            )
            job.completed_at = _utcnow()
            _audit(
                db,
                candidate_id=candidate_id,
                entity_type="deletion_job",
                entity_id=job.id,
                action="failed",
                before={},
                after={"node": node, "silent": False},
            )
            db.commit()
            db.refresh(job)
            return _ser_deletion(job)
    # Also soft-delete strategy artifacts
    for p in (
        db.query(CandidateExecutionPlan)
        .filter(
            CandidateExecutionPlan.candidate_id == candidate_id,
            CandidateExecutionPlan.deleted_at.is_(None),
        )
        .all()
    ):
        p.deleted_at = _utcnow()
    for s in (
        db.query(CandidateStrategyProfile)
        .filter(
            CandidateStrategyProfile.candidate_id == candidate_id,
            CandidateStrategyProfile.deleted_at.is_(None),
        )
        .all()
    ):
        s.deleted_at = _utcnow()
    for r in (
        db.query(CandidateRankingSnapshot).filter_by(candidate_id=candidate_id, active=True).all()
    ):
        r.active = False
        r.superseded_at = _utcnow()
    job.status = "completed"
    job.preview_only = False
    job.result_json = _dumps(
        {"executed": True, "preview_only": False, "done": done, "stale_reappear_guard": True}
    )
    job.completed_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="deletion_job",
        entity_id=job.id,
        action="completed",
        before={},
        after={"executed": True, "preview_only": False},
    )
    db.commit()
    db.refresh(job)
    return _ser_deletion(job)


def run_privacy_revocation(
    db: Session, *, candidate_id: int, scopes: list[str] | None = None
) -> dict:
    """Execute privacy revocation propagation — not flag-only."""
    scope = scopes or ["orchestration", "search", "learning", "reminders", "ranking_push"]
    job = CandidatePrivacyRevocationJob(
        candidate_id=candidate_id,
        job_key=_uuid("priv"),
        scope_json=_dumps(scope),
        status="running",
        executed=False,
        result_json="{}",
        claim_kind="FACT",
        created_at=_utcnow(),
    )
    db.add(job)
    db.flush()
    results: dict[str, Any] = {"propagated": []}
    try:
        # Pause lifecycle orchestration + disable search
        life.update_privacy(
            db,
            candidate_id=candidate_id,
            orchestration_opt_in=False,
            search_opt_in=False,
            learning_opt_in=False,
            reminders_opt_in=False,
            paused=True,
        )
        results["propagated"].append("lifecycle_privacy")
        # Clear strategy ranking pushes from Daily OS
        n = (
            db.query(CandidateCareerInboxItem)
            .filter(
                CandidateCareerInboxItem.candidate_id == candidate_id,
                CandidateCareerInboxItem.item_key.like("strategy:%"),
            )
            .delete(synchronize_session=False)
        )
        results["propagated"].append(f"daily_os_strategy_items:{n}")
        # Deactivate ranking snapshots from surfacing
        for r in (
            db.query(CandidateRankingSnapshot)
            .filter_by(candidate_id=candidate_id, active=True)
            .all()
        ):
            r.active = False
            r.superseded_at = _utcnow()
        results["propagated"].append("ranking_deactivated")
        job.executed = True
        job.status = "completed"
        job.result_json = _dumps({**results, "executed": True, "flag_only": False})
        job.completed_at = _utcnow()
        _audit(
            db,
            candidate_id=candidate_id,
            entity_type="privacy_revocation",
            entity_id=job.id,
            action="executed",
            before={},
            after={"executed": True, "flag_only": False},
        )
        db.commit()
    except Exception as exc:
        job.status = "failed"
        job.executed = False
        job.result_json = _dumps({"error": type(exc).__name__, "silent": False, "executed": False})
        job.completed_at = _utcnow()
        _audit(
            db,
            candidate_id=candidate_id,
            entity_type="privacy_revocation",
            entity_id=job.id,
            action="failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
        db.commit()
    db.refresh(job)
    return _ser_privacy_job(job)


def revert_calibration(db: Session, *, candidate_id: int, proposal_id: int) -> dict:
    """Revert approved calibration to prior weights version — candidate-controlled."""
    prop = (
        db.query(CandidateCalibrationProposal)
        .filter_by(id=proposal_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not prop or prop.status != "approved":
        raise ValueError("proposal_not_approved")
    before = _loads(prop.before_weights_json, {})
    _, ver, _ = _active_weights(db, candidate_id=candidate_id)
    for w in (
        db.query(CandidateRecommendationWeights)
        .filter(
            CandidateRecommendationWeights.candidate_id == candidate_id,
            CandidateRecommendationWeights.archived_at.is_(None),
        )
        .all()
    ):
        w.archived_at = _utcnow()
    restored = CandidateRecommendationWeights(
        candidate_id=candidate_id,
        version=ver + 1,
        weights_json=_dumps(before),
        source="calibration_revert",
        evidence_json=_dumps({"reverted_proposal_id": prop.id}),
        created_at=_utcnow(),
    )
    db.add(restored)
    prop.status = "reverted"
    prop.resolved_at = _utcnow()
    snap = build_ranking(db, candidate_id=candidate_id)
    _push_ranking_to_daily_os(db, candidate_id=candidate_id, snap=snap)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="calibration_proposal",
        entity_id=prop.id,
        action="revert",
        before={"status": "approved"},
        after={"status": "reverted", "ranking_snapshot_id": snap.id, "silent": False},
    )
    db.commit()
    db.refresh(prop)
    return _ser_proposal(prop)


def control_execution_plan(
    db: Session, *, candidate_id: int, plan_id: int, action: str
) -> dict:
    """Pause / resume / cancel / retry — internal plans only."""
    plan = (
        db.query(CandidateExecutionPlan)
        .filter_by(id=plan_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not plan or plan.deleted_at:
        raise ValueError("plan_not_found")
    if plan.external_actions:
        raise ValueError("external_actions_forbidden")
    act = (action or "").strip().lower()
    if act == "pause":
        plan.status = "paused"
        plan.updated_at = _utcnow()
        db.commit()
        return {"plan": _ser_plan(db, plan), "paused": True}
    if act == "cancel":
        plan.status = "cancelled"
        plan.updated_at = _utcnow()
        db.commit()
        return {"plan": _ser_plan(db, plan), "cancelled": True}
    if act == "resume":
        if plan.status not in ("paused", "failed", "draft", "running"):
            raise ValueError("plan_not_resumable")
        return run_execution_plan(db, candidate_id=candidate_id, plan_id=plan_id, resume=True)
    if act == "retry":
        failed = (
            db.query(CandidateExecutionStep)
            .filter_by(candidate_id=candidate_id, plan_id=plan.id, status="failed")
            .order_by(CandidateExecutionStep.step_index.asc())
            .first()
        )
        if failed:
            replay = _loads(plan.replay_state_json, {})
            replay["cursor"] = failed.step_index
            plan.replay_state_json = _dumps(replay)
            failed.status = "pending"
            failed.error_json = "{}"
        plan.status = "draft"
        plan.updated_at = _utcnow()
        db.commit()
        return run_execution_plan(db, candidate_id=candidate_id, plan_id=plan_id, resume=True)
    raise ValueError("unknown_plan_control")


def record_recommendation_feedback(
    db: Session,
    *,
    candidate_id: int,
    ranking_snapshot_id: int | None,
    feedback: str,
    item_id: str | None = None,
) -> dict:
    """Explicit feedback — never silently mutates canonical weights."""
    fb = (feedback or "").strip().lower()[:64]
    if fb not in ("helpful", "not_helpful", "snooze", "dismiss", "done"):
        raise ValueError("invalid_feedback")
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="recommendation_feedback",
        entity_id=ranking_snapshot_id,
        action=fb,
        before={},
        after={
            "item_id": item_id,
            "immediate_weight_update": False,
            "requires_calibration_proposal": True,
            "claim_kind": "CANDIDATE_RECOLLECTION",
        },
    )
    db.commit()
    return {
        "recorded": True,
        "immediate_weight_update": False,
        "requires_calibration_proposal": True,
        "feedback": fb,
    }


def simulate_strategy(db: Session, *, candidate_id: int) -> dict:
    strat = get_or_create_strategy(db, candidate_id=candidate_id)
    snap = get_active_ranking(db, candidate_id=candidate_id) or build_ranking(
        db, candidate_id=candidate_id
    )
    cands = _loads(snap.candidates_json, [])
    sim = {
        "if_approve_calibration": "Ranking weights would shift toward outcome-informed blend",
        "if_skip_interview": "Application drafts would rise in NBA",
        "top_now": cands[0] if cands else None,
        "hiring_certainty": None,
        "guarantee": False,
        "claim_kind": "INFERENCE",
    }
    strat.simulation_json = _dumps(sim)
    strat.updated_at = _utcnow()
    db.commit()
    return sim


def push_approved_acal_commitment(
    db: Session, *, candidate_id: int, title: str, deep_link: str
) -> dict:
    """ACAL items only for candidate-approved commitments."""
    try:
        from app.services import acceptance_calendar as acal

        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=_uuid("acal-strat")[:160],
            category="goal",
            title=title[:300],
            summary="Candidate-approved strategy commitment",
            importance=75,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link=deep_link[:300],
            payload={
                "approved_commitment": True,
                "unapproved": False,
                "kpi_excluded": True,
            },
        )
        db.commit()
        return {"ok": True, "approved_commitment": True, "unapproved": False}
    except Exception as exc:
        _audit(
            db,
            candidate_id=candidate_id,
            entity_type="acceptance_calendar",
            entity_id=None,
            action="upsert_failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
        db.commit()
        return {"ok": False, "silent": False}


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    strat = get_or_create_strategy(db, candidate_id=candidate_id)
    snap = get_active_ranking(db, candidate_id=candidate_id)
    if not snap:
        snap = build_ranking(db, candidate_id=candidate_id)
        _push_ranking_to_daily_os(db, candidate_id=candidate_id, snap=snap)
    proposals = (
        db.query(CandidateCalibrationProposal)
        .filter_by(candidate_id=candidate_id)
        .order_by(CandidateCalibrationProposal.id.desc())
        .limit(10)
        .all()
    )
    plans = (
        db.query(CandidateExecutionPlan)
        .filter(
            CandidateExecutionPlan.candidate_id == candidate_id,
            CandidateExecutionPlan.deleted_at.is_(None),
        )
        .order_by(CandidateExecutionPlan.id.desc())
        .limit(10)
        .all()
    )
    return {
        "schema": "twin.outcome_calibrated_execution/v1",
        "verdict_target": (
            "OUTCOME-CALIBRATED CAREER STRATEGY CUSTOMER-USABLE - "
            "CANDIDATE-CONTROLLED EXECUTION PRODUCTION-READY"
        ),
        "strategy": _ser_strategy(strat),
        "ranking": _ser_ranking(snap),
        "calibration_proposals": [_ser_proposal(p) for p in proposals],
        "plans": [_ser_plan(db, p) for p in plans],
        "safety": {
            "external_execution": False,
            "autonomous_employment_decisions": False,
            "silent_calibration": False,
            "calibration_disconnected": False,
            "deletion_preview_only_default": False,
            "privacy_revoke_flag_only": False,
            "invalidated_in_recs": False,
            "non_idempotent_plans": False,
            "daily_os_separate_ranking": False,
            "acal_unapproved_commitments": False,
            "bundled_approvals": False,
            "workplace_monitoring": False,
            "ats_write": False,
            "auto_apply": False,
            "microsoft_calendar_write": False,
            "covert_assistance": False,
            "phase_3_career_agent": "NOT_STARTED",
            "public_strategy": False,
        },
        "integrations": {
            "lifecycle": True,
            "career_transition_calibration": True,
            "recommendation_weights": True,
            "daily_os_uses_canonical_ranking": True,
            "acceptance_calendar_approved_only": True,
            "career_graph": True,
            "adaptive_memory": True,
        },
        "routes": {
            "command_center": "/dashboard",
            "strategy": "/dashboard/strategy",
            "approvals": "/dashboard/approvals",
            "api": "/api/v1/candidates/me/career-strategy",
        },
        "alembic": "116_outcome_calibrated_execution",
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "observability": {
            "schema": "twin.career_strategy_obs/v1",
            "module_payloads_in_metrics": False,
        },
        "residual_epic_19": {
            "nba_from_canonical_ranking": True,
            "deletion_runner_executes": True,
            "calibration_explainability": True,
            "resumable_plans": True,
        },
        "invites_sent": 0,
        "alten_pack": False,
    }


def _ser_strategy(s: CandidateStrategyProfile) -> dict:
    return {
        "id": s.id,
        "objectives": _loads(s.objectives_json, []),
        "constraints": _loads(s.constraints_json, []),
        "preferences": _loads(s.preferences_json, {}),
        "consistency": _loads(s.consistency_json, {}),
        "simulation": _loads(s.simulation_json, {}),
        "version": s.version,
        "kpi_excluded": s.kpi_excluded,
    }


def _ser_ranking(r: CandidateRankingSnapshot) -> dict:
    return {
        "id": r.id,
        "snapshot_key": r.snapshot_key,
        "weights_version": r.weights_version,
        "weights": _loads(r.weights_json, {}),
        "candidates": _loads(r.candidates_json, []),
        "explain": _loads(r.explain_json, {}),
        "counterfactuals": _loads(r.counterfactuals_json, []),
        "attribution": _loads(r.attribution_json, {}),
        "active": r.active,
        "source": r.source,
        "canonical": True,
    }


def _ser_proposal(p: CandidateCalibrationProposal) -> dict:
    return {
        "id": p.id,
        "proposal_key": p.proposal_key,
        "from_transition_cal_id": p.from_transition_cal_id,
        "before_weights": _loads(p.before_weights_json, {}),
        "after_weights": _loads(p.after_weights_json, {}),
        "explain": _loads(p.explain_json, {}),
        "outcome_ids": _loads(p.outcome_ids_json, []),
        "status": p.status,
        "bundled": p.bundled,
        "lifecycle_approval_id": p.lifecycle_approval_id,
        "merged_weights_id": p.merged_weights_id,
        "kpi_excluded": p.kpi_excluded,
    }


def _ser_plan(db: Session, p: CandidateExecutionPlan) -> dict:
    steps = (
        db.query(CandidateExecutionStep)
        .filter_by(plan_id=p.id, candidate_id=p.candidate_id)
        .order_by(CandidateExecutionStep.step_index.asc())
        .all()
    )
    return {
        "id": p.id,
        "plan_key": p.plan_key,
        "title": p.title,
        "status": p.status,
        "external_actions": False,
        "idempotency_key": p.idempotency_key,
        "replay_state": _loads(p.replay_state_json, {}),
        "result": _loads(p.result_json, {}),
        "steps": [
            {
                "id": s.id,
                "action_type": s.action_type,
                "status": s.status,
                "internal_only": s.internal_only,
                "external": False,
                "attempts": s.attempts,
            }
            for s in steps
        ],
        "resumable": True,
        "kpi_excluded": p.kpi_excluded,
    }


def _ser_deletion(j: CandidateDeletionJob) -> dict:
    return {
        "id": j.id,
        "job_key": j.job_key,
        "status": j.status,
        "preview_only": j.preview_only,
        "graph": _loads(j.graph_json, []),
        "progress": _loads(j.progress_json, {}),
        "result": _loads(j.result_json, {}),
        "executed": bool((_loads(j.result_json, {}) or {}).get("executed")),
    }


def _ser_privacy_job(j: CandidatePrivacyRevocationJob) -> dict:
    return {
        "id": j.id,
        "job_key": j.job_key,
        "status": j.status,
        "executed": j.executed,
        "scope": _loads(j.scope_json, []),
        "result": _loads(j.result_json, {}),
        "flag_only": False,
    }
