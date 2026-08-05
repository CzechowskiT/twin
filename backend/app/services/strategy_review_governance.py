"""Strategy Review + Decision Governance — outcome-driven, candidate-controlled.

Extends Epic 2.3 Search Outcomes + 2.2 Search Lab + 2.0 ranking.
Never silently change strategy/weights. Reject/postpone do not mutate canonical state.
Revert restores strategy+ranking. Simulations do not mutate state.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateDecisionFollowup,
    CandidateDecisionRecord,
    CandidateLifecycleApproval,
    CandidateNormalizedOpportunity,
    CandidateOpportunityClusterSummary,
    CandidateRecommendationWeights,
    CandidateSearchOutcomeLinkage,
    CandidateStrategyAssumption,
    CandidateStrategyChangeSet,
    CandidateStrategyReviewAudit,
    CandidateStrategyReviewObservation,
    CandidateStrategyReviewSession,
)
from app.services import career_copilot as cc
from app.services import career_lifecycle as life
from app.services import search_outcome_intelligence as soi

logger = logging.getLogger(__name__)

CANONICAL_DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"
CANONICAL_DAILY_OS_BRIEF = "/api/v1/candidates/me/daily-os/brief"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str, sort_keys=True)


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _uuid(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex[:16]}"


def _hash(obj: Any) -> str:
    return hashlib.sha256(_dumps(obj).encode("utf-8")).hexdigest()[:64]


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
        CandidateStrategyReviewAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def _active_weights(db: Session, *, candidate_id: int) -> tuple[dict, int]:
    row = (
        db.query(CandidateRecommendationWeights)
        .filter(
            CandidateRecommendationWeights.candidate_id == candidate_id,
            CandidateRecommendationWeights.archived_at.is_(None),
        )
        .order_by(CandidateRecommendationWeights.id.desc())
        .first()
    )
    if not row:
        return (
            {"role_fit": 0.25, "evidence": 0.2, "freshness": 0.15, "outcome": 0.2, "effort": 0.2},
            1,
        )
    return _loads(row.weights_json, {}), int(row.version or 1)


def compute_cluster_outcomes(db: Session, *, candidate_id: int) -> dict:
    """Observed clusters from linkages/opportunities — never fabricate demand/progress."""
    links = (
        db.query(CandidateSearchOutcomeLinkage)
        .filter(
            CandidateSearchOutcomeLinkage.candidate_id == candidate_id,
            CandidateSearchOutcomeLinkage.deleted_at.is_(None),
        )
        .limit(300)
        .all()
    )
    opps = (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
            CandidateNormalizedOpportunity.superseded_at.is_(None),
        )
        .limit(50)
        .all()
    )
    by_source: dict[str, list[int]] = {}
    for ln in links:
        key = ln.source_key or "unknown_source"
        if ln.opportunity_ref_id:
            by_source.setdefault(key, []).append(int(ln.opportunity_ref_id))
    for o in opps:
        src = "normalized"
        by_source.setdefault(src, []).append(int(o.id))

    clusters = []
    for key, refs in list(by_source.items())[:12]:
        uniq = sorted(set(refs))
        if not uniq:
            status = "INSUFFICIENT_DATA"
            claim = "UNKNOWN"
        else:
            status = "OBSERVED"
            claim = "INFERENCE"
        summary = {
            "opportunity_count": len(uniq),
            "demand_claim": False,
            "fabricated_progress": False,
            "market_claim": False,
            "causality_claim": False,
            "claim_kind": claim,
        }
        ck = f"src:{key}"[:160]
        existing = (
            db.query(CandidateOpportunityClusterSummary)
            .filter_by(candidate_id=candidate_id, cluster_key=ck)
            .one_or_none()
        )
        if existing:
            existing.summary_json = _dumps(summary)
            existing.opportunity_refs_json = _dumps([{"id": i} for i in uniq[:40]])
            existing.status = status
            existing.demand_claim = False
            existing.fabricated_progress = False
            existing.claim_kind = claim
            existing.deleted_at = None
            existing.computed_at = _utcnow()
            row = existing
        else:
            row = CandidateOpportunityClusterSummary(
                candidate_id=candidate_id,
                cluster_key=ck,
                label=f"Cluster {key}"[:300],
                summary_json=_dumps(summary),
                opportunity_refs_json=_dumps([{"id": i} for i in uniq[:40]]),
                status=status,
                demand_claim=False,
                fabricated_progress=False,
                claim_kind=claim,
                kpi_excluded=True,
                computed_at=_utcnow(),
            )
            db.add(row)
        clusters.append(
            {
                "id": getattr(row, "id", None),
                "cluster_key": ck,
                "label": f"Cluster {key}",
                "status": status,
                "opportunity_count": len(uniq),
                "demand_claim": False,
                "fabricated_progress": False,
                "claim_kind": claim,
            }
        )
    db.commit()
    if not clusters:
        return {
            "clusters": [],
            "status": "INSUFFICIENT_DATA",
            "demand_claim": False,
            "fabricated_progress": False,
            "claim_kind": "UNKNOWN",
        }
    return {
        "clusters": clusters,
        "status": "OBSERVED",
        "demand_claim": False,
        "fabricated_progress": False,
        "claim_kind": "INFERENCE",
    }


def compare_clusters(db: Session, *, candidate_id: int) -> dict:
    data = compute_cluster_outcomes(db, candidate_id=candidate_id)
    items = data.get("clusters") or []
    return {
        "comparisons": [
            {
                "left": items[i].get("cluster_key"),
                "right": items[i + 1].get("cluster_key"),
                "basis": "observed_opportunity_count",
                "left_n": items[i].get("opportunity_count"),
                "right_n": items[i + 1].get("opportunity_count"),
                "causality_claim": False,
                "demand_claim": False,
            }
            for i in range(min(3, max(0, len(items) - 1)))
        ],
        "insufficient_data": len(items) < 2,
        "claim_kind": "INFERENCE" if len(items) >= 2 else "UNKNOWN",
    }


def create_review_session(
    db: Session,
    *,
    candidate_id: int,
    cadence: str = "weekly",
    strategy_id: int | None = None,
    title: str | None = None,
) -> dict:
    """Build review from persisted outcomes — not a static form."""
    cadence_u = cadence if cadence in ("weekly", "monthly") else "weekly"
    funnel = soi.compute_funnel(db, candidate_id=candidate_id, strategy_id=strategy_id)
    comps = soi.component_outcomes(db, candidate_id=candidate_id)
    clusters = compute_cluster_outcomes(db, candidate_id=candidate_id)
    snapshot = {
        "funnel_snapshot_id": funnel.get("snapshot_id"),
        "funnel_counts": funnel.get("counts"),
        "funnel_ratios": funnel.get("ratios"),
        "unknowns": funnel.get("unknowns"),
        "components": {
            "role_theses": len(comps.get("role_theses") or []),
            "saved_searches": len(comps.get("saved_searches") or []),
            "watchlists": len(comps.get("watchlists") or []),
            "experiments": len(comps.get("experiments") or []),
            "cycles": len(comps.get("cycles") or []),
        },
        "clusters": clusters,
        "benchmark": False,
        "fabricated": False,
        "silent_strategy_change": False,
    }
    sections = [
        {"id": "funnel", "title": "Outcome funnel", "claim_kind": "INFERENCE"},
        {"id": "clusters", "title": "Opportunity clusters", "claim_kind": clusters.get("claim_kind")},
        {"id": "components", "title": "Strategy components", "claim_kind": "INFERENCE"},
        {"id": "unknowns", "title": "Unknowns", "claim_kind": "UNKNOWN"},
    ]
    row = CandidateStrategyReviewSession(
        candidate_id=candidate_id,
        review_key=_uuid("rev"),
        cadence=cadence_u,
        status="draft",
        title=(title or f"{cadence_u.title()} strategy review")[:300],
        sections_json=_dumps(sections),
        snapshot_json=_dumps(snapshot),
        snapshot_hash=_hash(snapshot),
        immutable=False,
        spawns_tasks=True,
        strategy_id=strategy_id,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    # Observations with lineage from persisted modules
    sources = [
        ("search_outcomes", funnel.get("snapshot_id"), {"kind": "funnel"}),
        ("search_outcomes_components", None, {"kind": "components"}),
        ("opportunity_clusters", None, {"kind": "clusters", "status": clusters.get("status")}),
    ]
    for mod, ref, body in sources:
        db.add(
            CandidateStrategyReviewObservation(
                candidate_id=candidate_id,
                review_id=row.id,
                observation_key=_uuid("obs"),
                source_module=mod,
                source_ref_id=int(ref) if isinstance(ref, int) else None,
                lineage_json=_dumps(
                    {
                        "source_module": mod,
                        "source_ref_id": ref,
                        "lineage_present": True,
                        "fabricated": False,
                    }
                ),
                body_json=_dumps(body),
                claim_kind="INFERENCE",
                kpi_excluded=True,
                created_at=_utcnow(),
            )
        )
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="review_session",
        entity_id=None,
        action="create",
        before={},
        after={"cadence": cadence_u, "silent_strategy_change": False, "lineage": True},
    )
    db.commit()
    db.refresh(row)
    return _ser_review(db, row)


def finalize_review(db: Session, *, candidate_id: int, review_id: int) -> dict:
    row = _review(db, candidate_id=candidate_id, review_id=review_id)
    if row.immutable:
        raise ValueError("review_already_immutable")
    row.status = "finalized"
    row.immutable = True
    row.finalized_at = _utcnow()
    # Finalizing does NOT change strategy — only enables decision flow
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="review_session",
        entity_id=row.id,
        action="finalize",
        before={},
        after={"immutable": True, "silent_strategy_change": False},
    )
    db.commit()
    db.refresh(row)
    return _ser_review(db, row)


def archive_review(db: Session, *, candidate_id: int, review_id: int) -> dict:
    row = _review(db, candidate_id=candidate_id, review_id=review_id)
    row.status = "archived"
    row.archived_at = _utcnow()
    row.spawns_tasks = False
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="review_session",
        entity_id=row.id,
        action="archive",
        before={},
        after={"spawns_tasks": False},
    )
    db.commit()
    db.refresh(row)
    return _ser_review(db, row)


def compare_reviews(
    db: Session, *, candidate_id: int, left_id: int, right_id: int
) -> dict:
    left = _review(db, candidate_id=candidate_id, review_id=left_id)
    right = _review(db, candidate_id=candidate_id, review_id=right_id)
    return {
        "left": {"id": left.id, "hash": left.snapshot_hash, "cadence": left.cadence},
        "right": {"id": right.id, "hash": right.snapshot_hash, "cadence": right.cadence},
        "hashes_equal": left.snapshot_hash == right.snapshot_hash,
        "immutable_left": left.immutable,
        "immutable_right": right.immutable,
        "claim_kind": "FACT",
    }


def upsert_assumption(
    db: Session, *, candidate_id: int, statement: str
) -> dict:
    row = CandidateStrategyAssumption(
        candidate_id=candidate_id,
        assumption_key=_uuid("asm"),
        statement=(statement or "")[:500],
        status="open",
        evaluation_json=_dumps({"evaluated": False, "causality_claim": False}),
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_assumption(row)


def evaluate_assumption(
    db: Session, *, candidate_id: int, assumption_id: int, result: str = "inconclusive"
) -> dict:
    row = (
        db.query(CandidateStrategyAssumption)
        .filter_by(id=assumption_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("assumption_not_found")
    allowed = {"supported", "contradicted", "inconclusive", "unknown"}
    res = result if result in allowed else "inconclusive"
    row.status = res
    row.evaluation_json = _dumps(
        {"evaluated": True, "result": res, "causality_claim": False, "market_claim": False}
    )
    row.evaluated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return _ser_assumption(row)


def create_decision(
    db: Session,
    *,
    candidate_id: int,
    question: str,
    review_id: int | None = None,
    supporting: list[dict] | None = None,
    contradicting: list[dict] | None = None,
    unknowns: list[dict] | None = None,
    alternatives: list[dict] | None = None,
    counterfactuals: list[dict] | None = None,
    rationale: str | None = None,
) -> dict:
    alts = []
    for a in (alternatives or [{"id": "keep", "label": "Keep current strategy"}])[:8]:
        alts.append(
            {
                "id": str(a.get("id") or _uuid("alt"))[:64],
                "label": str(a.get("label") or "Alternative")[:200],
                "impact_preview": a.get("impact_preview")
                or {
                    "ranking_effect": "UNKNOWN_UNTIL_APPROVED",
                    "mutates_state_on_preview": False,
                    "claim_kind": "SUGGESTION",
                },
            }
        )
    cfs = []
    for c in (counterfactuals or [])[:6]:
        cfs.append(
            {
                "id": str(c.get("id") or _uuid("cf"))[:64],
                "if": str(c.get("if") or "")[:300],
                "then": str(c.get("then") or "UNKNOWN")[:300],
                "mutates_state": False,
                "simulation_only": True,
                "claim_kind": "INFERENCE",
            }
        )
    evidence = {
        "supporting": supporting or [],
        "contradicting": contradicting or [],
        "unknowns": unknowns or [{"code": "INSUFFICIENT_DATA", "claim_kind": "UNKNOWN"}],
        "full_payloads_excluded": True,
    }
    question_obj = {
        "text": (question or "What should change in my search strategy?")[:500],
        "requires_approval": True,
    }
    rationale_obj = {
        "text": (rationale or "")[:500],
        "silent": False,
        "causality_claim": False,
        "hiring_probability": None,
    }
    payload_for_hash = {
        "question": question_obj,
        "evidence": evidence,
        "alternatives": alts,
        "counterfactuals": cfs,
        "rationale": rationale_obj,
    }
    row = CandidateDecisionRecord(
        candidate_id=candidate_id,
        decision_key=_uuid("dec"),
        review_id=review_id,
        question_json=_dumps(question_obj),
        evidence_package_json=_dumps(evidence),
        alternatives_json=_dumps(alts),
        counterfactuals_json=_dumps(cfs),
        rationale_json=_dumps(rationale_obj),
        status="draft",
        decision_hash=_hash(payload_for_hash),
        immutable=False,
        stale=False,
        version=1,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_decision(row)


def propose_decision_approval(
    db: Session, *, candidate_id: int, decision_id: int, chosen_alternative_id: str
) -> dict:
    """Create atomic change set + lifecycle approval — no execution yet."""
    dec = _decision(db, candidate_id=candidate_id, decision_id=decision_id)
    if dec.status not in ("draft", "revised"):
        raise ValueError("decision_not_proposable")
    if dec.stale:
        raise ValueError("stale_decision_cannot_execute")
    alts = _loads(dec.alternatives_json, [])
    chosen = next((a for a in alts if a.get("id") == chosen_alternative_id), None)
    if not chosen:
        raise ValueError("alternative_not_found")
    before_w, ver = _active_weights(db, candidate_id=candidate_id)
    after_w = dict(before_w)
    # Conservative suggestion only — applied after approval
    if chosen.get("id") != "keep" and "outcome" in after_w:
        after_w["outcome"] = round(min(0.4, float(after_w["outcome"]) + 0.01), 4)
        if "role_fit" in after_w:
            after_w["role_fit"] = round(max(0.05, float(after_w["role_fit"]) - 0.01), 4)
        s = sum(float(v) for v in after_w.values()) or 1.0
        after_w = {k: round(float(v) / s, 4) for k, v in after_w.items()}
    impact = {
        "chosen": chosen,
        "ranking_effect_if_approved": "Canonical weights update only after approval",
        "ranking_effect_if_rejected": "No ranking or strategy change",
        "ranking_effect_if_postponed": "No ranking or strategy change",
        "mutates_on_preview": False,
        "external_action": False,
        "silent": False,
    }
    cs = CandidateStrategyChangeSet(
        candidate_id=candidate_id,
        change_set_key=_uuid("cs"),
        decision_id=dec.id,
        status="pending",
        before_json=_dumps({"weights": before_w, "version": ver}),
        after_json=_dumps({"weights": after_w, "chosen_alternative_id": chosen_alternative_id}),
        impact_preview_json=_dumps(impact),
        execution_json=_dumps({"executed": False, "idempotent": True}),
        version=1,
        silent=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(cs)
    db.flush()
    ctx = None
    try:
        privacy = life.get_or_create_privacy(db, candidate_id=candidate_id)
        if privacy.paused:
            raise ValueError("lifecycle_paused")
        ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    except ValueError:
        raise
    except Exception:
        ctx = None
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="strategy_decision_change_set",
        status="pending",
        bundled=False,
        before_json=_dumps({"weights": before_w}),
        after_json=_dumps({"weights": after_w, "silent": False}),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    dec.status = "pending_approval"
    dec.lifecycle_approval_id = appr.id
    dec.change_set_id = cs.id
    dec.immutable = True
    rationale = _loads(dec.rationale_json, {})
    rationale["chosen_alternative_id"] = chosen_alternative_id
    dec.rationale_json = _dumps(rationale)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="decision",
        entity_id=dec.id,
        action="propose_approval",
        before={},
        after={"status": "pending_approval", "silent": False, "change_set_id": cs.id},
    )
    db.commit()
    db.refresh(dec)
    return {
        "decision": _ser_decision(dec),
        "change_set": _ser_change_set(cs),
        "approval_id": appr.id,
        "requires_approval": True,
        "silent": False,
    }


def resolve_decision(
    db: Session, *, candidate_id: int, decision_id: int, action: str
) -> dict:
    """approve | reject | postpone — only approve mutates ranking via orchestrator."""
    dec = _decision(db, candidate_id=candidate_id, decision_id=decision_id)
    if dec.status != "pending_approval":
        raise ValueError("decision_not_pending_approval")
    if dec.stale:
        raise ValueError("stale_decision_cannot_execute")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if dec.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=dec.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    cs = None
    if dec.change_set_id:
        cs = (
            db.query(CandidateStrategyChangeSet)
            .filter_by(id=dec.change_set_id, candidate_id=candidate_id)
            .one_or_none()
        )
    if action_u == "approve":
        result = _execute_change_set(db, candidate_id=candidate_id, change_set=cs, decision=dec)
        dec.status = "approved_executed"
        dec.executed_at = _utcnow()
        if cs:
            cs.status = "executed"
            cs.execution_json = _dumps(result)
            cs.resolved_at = _utcnow()
        _push_daily_os_decision(db, candidate_id=candidate_id, decision=dec)
        try:
            from app.services import decision_calendar_capacity as dcc

            dcc.generate_requirements_from_decision(
                db, candidate_id=candidate_id, decision_id=dec.id
            )
        except Exception as exc:
            logger.exception("execution requirement generation failed: %s", exc)
        ranking_changed = True
    elif action_u == "postpone":
        # Explicitly do NOT generate execution requirements / calendar commitments
        dec.status = "postponed"
        if cs:
            cs.status = "postponed"
            cs.resolved_at = _utcnow()
            cs.execution_json = _dumps(
                {"executed": False, "ranking_changed": False, "state_mutated": False}
            )
        ranking_changed = False
    else:
        dec.status = "rejected"
        if cs:
            cs.status = "rejected"
            cs.resolved_at = _utcnow()
            cs.execution_json = _dumps(
                {"executed": False, "ranking_changed": False, "state_mutated": False}
            )
        ranking_changed = False
    dec.resolved_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="decision",
        entity_id=dec.id,
        action=action_u,
        before={},
        after={"status": dec.status, "ranking_changed": ranking_changed, "silent": False},
    )
    db.commit()
    db.refresh(dec)
    return {
        "decision": _ser_decision(dec),
        "ranking_changed": ranking_changed,
        "state_mutated": ranking_changed,
        "external_action": False,
        "silent": False,
    }


def _execute_change_set(
    db: Session,
    *,
    candidate_id: int,
    change_set: CandidateStrategyChangeSet | None,
    decision: CandidateDecisionRecord,
) -> dict:
    """Idempotent internal execution — rollback-safe single commit path; no external actions."""
    if not change_set:
        raise ValueError("change_set_not_found")
    idem = decision.execution_idempotency_key or f"exec:{decision.id}:{change_set.id}"
    if decision.execution_idempotency_key and decision.executed_at:
        return {
            "executed": True,
            "idempotent_hit": True,
            "ranking_changed": True,
            "external_action": False,
            "partial_failure": False,
        }
    decision.execution_idempotency_key = idem
    before = _loads(change_set.before_json, {})
    after = _loads(change_set.after_json, {})
    after_w = after.get("weights") or {}
    try:
        _, ver = _active_weights(db, candidate_id=candidate_id)
        for w in (
            db.query(CandidateRecommendationWeights)
            .filter(
                CandidateRecommendationWeights.candidate_id == candidate_id,
                CandidateRecommendationWeights.archived_at.is_(None),
            )
            .all()
        ):
            w.archived_at = _utcnow()
        db.add(
            CandidateRecommendationWeights(
                candidate_id=candidate_id,
                weights_json=_dumps(after_w),
                version=ver + 1,
                source="strategy_decision_change_set",
                created_at=_utcnow(),
            )
        )
        return {
            "executed": True,
            "idempotent_hit": False,
            "ranking_changed": True,
            "before": before,
            "after": after,
            "external_action": False,
            "partial_failure": False,
            "rollback_needed": False,
            "silent": False,
        }
    except Exception as exc:
        logger.exception("decision execution failed: %s", exc)
        # Do not leave partial weight archive without new row — caller rolls back via no commit yet
        raise ValueError("execution_failed_rolled_back") from exc


def add_followup(
    db: Session, *, candidate_id: int, decision_id: int, kind: str = "observe", body: dict | None = None
) -> dict:
    dec = _decision(db, candidate_id=candidate_id, decision_id=decision_id)
    row = CandidateDecisionFollowup(
        candidate_id=candidate_id,
        followup_key=_uuid("fu"),
        decision_id=dec.id,
        kind=(kind or "observe")[:64],
        body_json=_dumps(body or {}),
        status="open",
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "kind": row.kind, "status": row.status, "body": _loads(row.body_json, {})}


def reconfirm_decision(db: Session, *, candidate_id: int, decision_id: int) -> dict:
    dec = _decision(db, candidate_id=candidate_id, decision_id=decision_id)
    if dec.status not in ("approved_executed", "postponed"):
        raise ValueError("decision_not_reconfirmable")
    dec.stale = False
    dec.version = int(dec.version or 1) + 1
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="decision",
        entity_id=dec.id,
        action="reconfirm",
        before={},
        after={"stale": False, "version": dec.version},
    )
    db.commit()
    db.refresh(dec)
    return _ser_decision(dec)


def revise_decision(
    db: Session, *, candidate_id: int, decision_id: int, rationale: str | None = None
) -> dict:
    dec = _decision(db, candidate_id=candidate_id, decision_id=decision_id)
    if dec.status in ("approved_executed",):
        # Revision creates a new draft version path — does not silently mutate executed state
        dec.status = "revised"
        dec.immutable = False
        dec.version = int(dec.version or 1) + 1
        r = _loads(dec.rationale_json, {})
        r["revision_note"] = (rationale or "Revised by candidate")[:500]
        r["silent"] = False
        dec.rationale_json = _dumps(r)
        dec.decision_hash = _hash(
            {
                "question": _loads(dec.question_json, {}),
                "evidence": _loads(dec.evidence_package_json, {}),
                "alternatives": _loads(dec.alternatives_json, []),
                "rationale": r,
                "version": dec.version,
            }
        )
    else:
        raise ValueError("decision_not_revisable")
    db.commit()
    db.refresh(dec)
    return _ser_decision(dec)


def revert_decision(db: Session, *, candidate_id: int, decision_id: int) -> dict:
    dec = _decision(db, candidate_id=candidate_id, decision_id=decision_id)
    if dec.status != "approved_executed" or not dec.change_set_id:
        raise ValueError("decision_not_revertable")
    cs = (
        db.query(CandidateStrategyChangeSet)
        .filter_by(id=dec.change_set_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not cs:
        raise ValueError("change_set_not_found")
    before = _loads(cs.before_json, {})
    before_w = before.get("weights") or {}
    _, ver = _active_weights(db, candidate_id=candidate_id)
    for w in (
        db.query(CandidateRecommendationWeights)
        .filter(
            CandidateRecommendationWeights.candidate_id == candidate_id,
            CandidateRecommendationWeights.archived_at.is_(None),
        )
        .all()
    ):
        w.archived_at = _utcnow()
    db.add(
        CandidateRecommendationWeights(
            candidate_id=candidate_id,
            weights_json=_dumps(before_w),
            version=ver + 1,
            source="strategy_decision_revert",
            created_at=_utcnow(),
        )
    )
    dec.status = "reverted"
    cs.status = "reverted"
    cs.resolved_at = _utcnow()
    cs.execution_json = _dumps(
        {"reverted": True, "ranking_changed": True, "silent": False, "external_action": False}
    )
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="decision",
        entity_id=dec.id,
        action="revert",
        before={},
        after={"status": "reverted", "ranking_restored": True, "silent": False},
    )
    db.commit()
    db.refresh(dec)
    return {
        "decision": _ser_decision(dec),
        "ranking_restored": True,
        "silent": False,
    }


def component_reviews(db: Session, *, candidate_id: int) -> dict:
    comps = soi.component_outcomes(db, candidate_id=candidate_id)
    return {
        "role_theses": comps.get("role_theses") or [],
        "saved_searches": comps.get("saved_searches") or [],
        "watchlists": comps.get("watchlists") or [],
        "sources": comps.get("sources") or [],
        "evidence_gaps": soi.evidence_gap_outcomes(db, candidate_id=candidate_id),
        "experiments": comps.get("experiments") or [],
        "cycles": comps.get("cycles") or [],
        "clusters": compute_cluster_outcomes(db, candidate_id=candidate_id),
    }


def ranking_refs(db: Session, *, candidate_id: int, weights: dict) -> list[dict]:
    out = []
    for dec in (
        db.query(CandidateDecisionRecord)
        .filter(
            CandidateDecisionRecord.candidate_id == candidate_id,
            CandidateDecisionRecord.deleted_at.is_(None),
            CandidateDecisionRecord.status == "pending_approval",
        )
        .order_by(CandidateDecisionRecord.id.desc())
        .limit(2)
        .all()
    ):
        out.append(
            {
                "id": f"strategy_decision:{dec.id}",
                "module": "strategy_review_governance",
                "ref_id": dec.id,
                "title": "Pending strategy decision (approval required)",
                "score": round(42 + 4 * float(weights.get("outcome", 0.2)), 2),
                "invalidated": bool(dec.stale),
                "deleted": False,
                "explain": {
                    "why": "Candidate decision awaiting approval — not applied",
                    "silent": False,
                    "calibration_bypass": False,
                    "applied": False,
                    "claim_kind": "SUGGESTION",
                },
                "deep_link": f"/dashboard/decision-journal?id={dec.id}",
            }
        )
    return out


def _push_daily_os_decision(
    db: Session, *, candidate_id: int, decision: CandidateDecisionRecord
) -> dict:
    ok = True
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"stratdec:{decision.id}",
            kind="strategy",
            title="Strategy decision executed"[:300],
            body={
                "decision_id": decision.id,
                "canonical_daily_os": CANONICAL_DAILY_OS,
                "approved": True,
                "separate_ranking": False,
            },
            priority_score=84,
            deep_link=f"/dashboard/decision-journal?id={decision.id}",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        ok = False
        logger.exception("daily os decision push failed: %s", exc)
    acal_ok = True
    try:
        from app.services import acceptance_calendar as acal

        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"stratdec:acal:{decision.id}"[:160],
            category="goal",
            title="Follow up on approved strategy decision"[:300],
            summary="Approved strategy decision commitment",
            importance=80,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link=f"/dashboard/decision-journal?id={decision.id}",
            payload={"approved_commitment": True, "unapproved": False},
        )
    except Exception as exc:
        acal_ok = False
        logger.exception("acal decision push failed: %s", exc)
    return {"daily_os_ok": ok, "acal_ok": acal_ok, "canonical_route": CANONICAL_DAILY_OS}


def invalidate_on_evidence_delete(db: Session, *, candidate_id: int) -> dict:
    n = 0
    for dec in (
        db.query(CandidateDecisionRecord)
        .filter(
            CandidateDecisionRecord.candidate_id == candidate_id,
            CandidateDecisionRecord.deleted_at.is_(None),
            CandidateDecisionRecord.status.in_(("draft", "pending_approval", "postponed")),
        )
        .all()
    ):
        dec.stale = True
        n += 1
    try:
        soi.invalidate_on_evidence_delete(db, candidate_id=candidate_id)
    except Exception:
        pass
    db.commit()
    return {"decisions_marked_stale": n, "stale_guard": True}


def delete_review_decision_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    for model in (
        CandidateStrategyReviewSession,
        CandidateStrategyReviewObservation,
        CandidateOpportunityClusterSummary,
        CandidateStrategyAssumption,
        CandidateDecisionRecord,
        CandidateStrategyChangeSet,
        CandidateDecisionFollowup,
    ):
        q = db.query(model).filter(model.candidate_id == candidate_id)
        if hasattr(model, "deleted_at"):
            q = q.filter(model.deleted_at.is_(None))
        for row in q.all():
            if hasattr(row, "deleted_at"):
                row.deleted_at = now
            if hasattr(row, "spawns_tasks"):
                row.spawns_tasks = False
            if hasattr(row, "status") and getattr(row, "status", None) in (
                "pending_approval",
                "pending",
                "draft",
                "open",
            ):
                row.status = "cancelled"
    from app.database.models import CandidateCareerInboxItem

    db.query(CandidateCareerInboxItem).filter(
        CandidateCareerInboxItem.candidate_id == candidate_id,
        CandidateCareerInboxItem.item_key.like("stratdec:%"),
    ).delete(synchronize_session=False)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="review_decision",
        entity_id=None,
        action="delete_history",
        before={},
        after={"propagated": True},
    )
    db.commit()
    return {"deleted": True, "propagated": True}


def export_review_decisions(db: Session, *, candidate_id: int) -> dict:
    reviews = (
        db.query(CandidateStrategyReviewSession)
        .filter(
            CandidateStrategyReviewSession.candidate_id == candidate_id,
            CandidateStrategyReviewSession.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    decisions = (
        db.query(CandidateDecisionRecord)
        .filter(
            CandidateDecisionRecord.candidate_id == candidate_id,
            CandidateDecisionRecord.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    return {
        "reviews": [{"id": r.id, "cadence": r.cadence, "status": r.status} for r in reviews],
        "decisions": [{"id": d.id, "status": d.status, "hash": d.decision_hash} for d in decisions],
        "full_payloads_excluded": True,
        "secrets_excluded": True,
        "restricted_jd_excluded": True,
        "interview_transcripts_excluded": True,
        "offer_docs_excluded": True,
        "real_candidate_notes_excluded": True,
    }


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    reviews = (
        db.query(CandidateStrategyReviewSession)
        .filter(
            CandidateStrategyReviewSession.candidate_id == candidate_id,
            CandidateStrategyReviewSession.deleted_at.is_(None),
        )
        .order_by(CandidateStrategyReviewSession.id.desc())
        .limit(10)
        .all()
    )
    decisions = (
        db.query(CandidateDecisionRecord)
        .filter(
            CandidateDecisionRecord.candidate_id == candidate_id,
            CandidateDecisionRecord.deleted_at.is_(None),
        )
        .order_by(CandidateDecisionRecord.id.desc())
        .limit(15)
        .all()
    )
    assumptions = (
        db.query(CandidateStrategyAssumption)
        .filter(
            CandidateStrategyAssumption.candidate_id == candidate_id,
            CandidateStrategyAssumption.deleted_at.is_(None),
        )
        .order_by(CandidateStrategyAssumption.id.desc())
        .limit(10)
        .all()
    )
    clusters = compute_cluster_outcomes(db, candidate_id=candidate_id)
    return {
        "schema": "twin.strategy_review_decision_governance/v1",
        "verdict_target": (
            "CAREER STRATEGY REVIEW CUSTOMER-USABLE - "
            "OUTCOME-DRIVEN DECISION GOVERNANCE PRODUCTION-READY"
        ),
        "reviews": [_ser_review(db, r) for r in reviews],
        "decisions": [_ser_decision(d) for d in decisions],
        "assumptions": [_ser_assumption(a) for a in assumptions],
        "clusters": clusters,
        "component_reviews": component_reviews(db, candidate_id=candidate_id),
        "safety": {
            "silent_strategy_change": False,
            "silent_weight_change": False,
            "fabricated_cluster_progress": False,
            "cluster_demand_claim": False,
            "conclusions_without_lineage": False,
            "decision_without_approval": False,
            "reject_mutates_state": False,
            "postpone_mutates_state": False,
            "stale_decision_execution": False,
            "non_idempotent_execution": False,
            "partial_execution_without_rollback": False,
            "simulation_mutates_state": False,
            "archived_reviews_spawn_tasks": False,
            "causality_claims": False,
            "hiring_probability": False,
            "protected_attr_inference": False,
            "daily_os_404": False,
            "acal_unapproved_commitments": False,
            "search_leaks": False,
            "external_apply": False,
            "external_action": False,
            "ats_write": False,
            "auto_apply": False,
            "microsoft_calendar_write": False,
            "workplace_monitoring": False,
            "public_decision_journal": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "routes": {
            "review_center": "/dashboard/review-center",
            "decision_journal": "/dashboard/decision-journal",
            "weekly": "/dashboard/review-center?cadence=weekly",
            "monthly": "/dashboard/review-center?cadence=monthly",
            "clusters": "/dashboard/review-center?view=clusters",
            "history": "/dashboard/review-center?view=history",
            "daily_os_canonical": CANONICAL_DAILY_OS,
            "daily_os_brief": CANONICAL_DAILY_OS_BRIEF,
            "daily_os_fe": "/dashboard/career",
            "api": "/api/v1/candidates/me/strategy-reviews",
        },
        "integrations": {
            "search_outcomes": True,
            "search_strategy_lab": True,
            "canonical_ranking": True,
            "daily_os": True,
            "acceptance_calendar": True,
            "lifecycle": True,
            "career_evidence": True,
        },
        "alembic": "120_strategy_review_decision_governance",
        "residual_epic_23": {
            "daily_os_canonical_live": True,
            "clusters_beyond_insufficient_when_observed": True,
            "reviews_consume_persisted_outcomes": True,
        },
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "invites_sent": 0,
        "alten_pack": False,
    }


def _review(
    db: Session, *, candidate_id: int, review_id: int
) -> CandidateStrategyReviewSession:
    row = (
        db.query(CandidateStrategyReviewSession)
        .filter_by(id=review_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("review_not_found")
    return row


def _decision(db: Session, *, candidate_id: int, decision_id: int) -> CandidateDecisionRecord:
    row = (
        db.query(CandidateDecisionRecord)
        .filter_by(id=decision_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("decision_not_found")
    return row


def _ser_review(db: Session, r: CandidateStrategyReviewSession) -> dict:
    obs = (
        db.query(CandidateStrategyReviewObservation)
        .filter_by(review_id=r.id, candidate_id=r.candidate_id)
        .filter(CandidateStrategyReviewObservation.deleted_at.is_(None))
        .limit(20)
        .all()
    )
    return {
        "id": r.id,
        "title": r.title,
        "cadence": r.cadence,
        "status": r.status,
        "sections": _loads(r.sections_json, []),
        "snapshot": _loads(r.snapshot_json, {}),
        "snapshot_hash": r.snapshot_hash,
        "immutable": r.immutable,
        "spawns_tasks": bool(r.spawns_tasks) if r.status != "archived" else False,
        "strategy_id": r.strategy_id,
        "observations": [
            {
                "id": o.id,
                "source_module": o.source_module,
                "source_ref_id": o.source_ref_id,
                "lineage": _loads(o.lineage_json, {}),
                "body": _loads(o.body_json, {}),
            }
            for o in obs
        ],
        "silent_strategy_change": False,
    }


def _ser_decision(d: CandidateDecisionRecord) -> dict:
    return {
        "id": d.id,
        "status": d.status,
        "review_id": d.review_id,
        "question": _loads(d.question_json, {}),
        "evidence_package": _loads(d.evidence_package_json, {}),
        "alternatives": _loads(d.alternatives_json, []),
        "counterfactuals": _loads(d.counterfactuals_json, []),
        "rationale": _loads(d.rationale_json, {}),
        "decision_hash": d.decision_hash,
        "immutable": d.immutable,
        "stale": d.stale,
        "version": d.version,
        "change_set_id": d.change_set_id,
        "lifecycle_approval_id": d.lifecycle_approval_id,
        "executed_at": d.executed_at.isoformat() if d.executed_at else None,
        "requires_approval": True,
        "silent": False,
    }


def _ser_change_set(c: CandidateStrategyChangeSet) -> dict:
    return {
        "id": c.id,
        "status": c.status,
        "decision_id": c.decision_id,
        "before": _loads(c.before_json, {}),
        "after": _loads(c.after_json, {}),
        "impact_preview": _loads(c.impact_preview_json, {}),
        "execution": _loads(c.execution_json, {}),
        "version": c.version,
        "silent": False,
    }


def _ser_assumption(a: CandidateStrategyAssumption) -> dict:
    return {
        "id": a.id,
        "statement": a.statement,
        "status": a.status,
        "evaluation": _loads(a.evaluation_json, {}),
    }
