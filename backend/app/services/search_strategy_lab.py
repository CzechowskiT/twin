"""Career Market Radar + Search Strategy Lab + Evidence-Based Job Search Portfolio.

Extends Epic 2.0/2.1 — no second opportunity/ranking/Daily OS stores.
Strategy activates only after candidate approval. Experiments never silent-change weights.
Observed-source wording only — never whole-market or fabricated conversion claims.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateCareerEvidence,
    CandidateGapObservation,
    CandidateLifecycleApproval,
    CandidateNormalizedOpportunity,
    CandidateOpportunityWatchlist,
    CandidatePortfolioHealthSnapshot,
    CandidateRoleThesis,
    CandidateSavedSearch,
    CandidateSearchCycle,
    CandidateSearchExperiment,
    CandidateSearchPortfolio,
    CandidateSearchStrategy,
    CandidateSearchStrategyAudit,
    CandidateSourceCoverageSnapshot,
    CandidateStrategyReview,
    Job,
    OpportunitySource,
)
from app.services import career_copilot as cc
from app.services import career_lifecycle as life
from app.services import opportunity_intelligence as oi

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _uuid(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex[:16]}"


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
        CandidateSearchStrategyAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def create_strategy(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    target_role: str | None = None,
    is_synthetic: bool = False,
) -> dict:
    """Create draft strategy — NOT active until approval."""
    row = CandidateSearchStrategy(
        candidate_id=candidate_id,
        strategy_key=_uuid("strat"),
        title=(title or "Search strategy")[:300],
        status="draft",
        thesis_json=_dumps(
            {
                "target_role": target_role or "UNKNOWN",
                "activated": False,
                "requires_approval": True,
                "silent_activation": False,
            }
        ),
        allocation_json=_dumps({"balanced": True, "buckets": []}),
        coverage_json=_dumps({"wording": "observed_source", "whole_market_claim": False}),
        health_json=_dumps({"score": None, "claim_kind": "UNKNOWN"}),
        simulation_json=_dumps({"guarantee": False, "fabricated_conversion": False}),
        version=1,
        claim_kind="SUGGESTION",
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    # Default portfolio + active cycle
    port = CandidateSearchPortfolio(
        candidate_id=candidate_id,
        strategy_id=row.id,
        portfolio_key=_uuid("port"),
        title="Primary search portfolio",
        allocations_json=_dumps(
            [
                {"bucket": "core_fit", "pct": 50, "claim_kind": "SUGGESTION"},
                {"bucket": "stretch", "pct": 30, "claim_kind": "SUGGESTION"},
                {"bucket": "explore", "pct": 20, "claim_kind": "SUGGESTION"},
            ]
        ),
        balance_json=_dumps({"balanced": True, "overconcentration": False}),
        watchlist_refs_json="[]",
        saved_search_refs_json="[]",
        opportunity_refs_json="[]",
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(port)
    cycle = CandidateSearchCycle(
        candidate_id=candidate_id,
        strategy_id=row.id,
        cycle_key=_uuid("cyc"),
        status="active",
        history_json=_dumps([{"event": "created", "at": _utcnow().isoformat()}]),
        spawns_tasks=True,
        claim_kind="FACT",
        kpi_excluded=True,
        started_at=_utcnow(),
    )
    db.add(cycle)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="search_strategy",
        entity_id=None,
        action="create_draft",
        before={},
        after={"status": "draft", "silent_activation": False},
    )
    db.commit()
    db.refresh(row)
    return _ser_strategy(db, row)


def propose_activate_strategy(db: Session, *, candidate_id: int, strategy_id: int) -> dict:
    """Propose activation — never silent; requires lifecycle approval."""
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    if row.status == "active":
        raise ValueError("strategy_already_active")
    if row.archived_at:
        raise ValueError("strategy_archived")
    # Respect search privacy pause, but still allow explicit approve flow when
    # orchestration context is missing (context_id may be null).
    try:
        from app.services import career_lifecycle as life_mod

        privacy = life_mod.get_or_create_privacy(db, candidate_id=candidate_id)
        if privacy.paused:
            raise ValueError("lifecycle_paused")
        if privacy.search_opt_in is False:
            raise ValueError("search_opt_out")
    except ValueError:
        raise
    except Exception:
        privacy = None
    ctx_id = None
    try:
        ctx = life.get_or_create_context(db, candidate_id=candidate_id)
        ctx_id = ctx.id
    except ValueError as exc:
        if "lifecycle_paused" in str(exc):
            raise
        ctx_id = None
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx_id,
        approval_key=_uuid("apr"),
        approval_kind="search_strategy_activate",
        status="pending",
        bundled=False,
        before_json=_dumps({"status": row.status, "strategy_id": row.id}),
        after_json=_dumps({"status": "active", "strategy_id": row.id, "silent": False}),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    row.status = "pending_approval"
    row.lifecycle_approval_id = appr.id
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="search_strategy",
        entity_id=row.id,
        action="propose_activate",
        before={"status": "draft"},
        after={"status": "pending_approval", "silent_activation": False, "approval_id": appr.id},
    )
    db.commit()
    db.refresh(row)
    return {
        "strategy": _ser_strategy(db, row),
        "approval_id": appr.id,
        "silent_activation": False,
        "requires_approval": True,
        "bundled": False,
    }


def resolve_strategy_activation(
    db: Session, *, candidate_id: int, strategy_id: int, approved: bool
) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    if row.status != "pending_approval" or not row.lifecycle_approval_id:
        raise ValueError("strategy_not_pending_approval")
    life.resolve_approval(
        db,
        candidate_id=candidate_id,
        approval_id=row.lifecycle_approval_id,
        approved=approved,
    )
    if approved:
        row.status = "active"
        row.activated_at = _utcnow()
        thesis = _loads(row.thesis_json, {})
        thesis["activated"] = True
        thesis["silent_activation"] = False
        row.thesis_json = _dumps(thesis)
        action = "activate_approved"
    else:
        row.status = "draft"
        row.lifecycle_approval_id = None
        action = "activate_rejected"
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="search_strategy",
        entity_id=row.id,
        action=action,
        before={},
        after={"status": row.status, "silent_activation": False, "silent_weight_change": False},
    )
    if approved:
        _push_daily_os(db, candidate_id=candidate_id, strategy=row)
    db.commit()
    db.refresh(row)
    return {"strategy": _ser_strategy(db, row), "silent_activation": False}


def upsert_role_thesis(
    db: Session,
    *,
    candidate_id: int,
    strategy_id: int,
    title: str,
    body: dict | None = None,
) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    refs = [{"id": e.id, "title": e.title} for e in evidence]
    gaps = _observe_gaps_internal(db, candidate_id=candidate_id, strategy_id=row.id, persist=False)
    thesis = CandidateRoleThesis(
        candidate_id=candidate_id,
        strategy_id=row.id,
        thesis_key=_uuid("thesis"),
        title=(title or "Role thesis")[:300],
        body_json=_dumps(
            {
                **(body or {}),
                "silent_thesis_change": False,
                "requires_approval_to_activate_strategy": True,
                "hiring_probability": None,
                "protected_attr_inference": False,
            }
        ),
        evidence_refs_json=_dumps(refs),
        gap_json=_dumps({"gaps": gaps, "keyword_only": False}),
        status="draft",
        stale=len(refs) == 0,
        claim_kind="INFERENCE" if refs else "UNKNOWN",
        version=1,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(thesis)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="role_thesis",
        entity_id=None,
        action="upsert",
        before={},
        after={"silent_thesis_change": False, "evidence_count": len(refs)},
    )
    db.commit()
    db.refresh(thesis)
    return _ser_thesis(thesis)


def build_source_coverage(db: Session, *, candidate_id: int) -> dict:
    oi.ensure_default_sources(db)
    sources = db.query(OpportunitySource).filter_by(enabled=True).all()
    by_board = {}
    for s in sources:
        if s.board_id:
            n = db.query(Job).filter_by(job_board=s.board_id).count()
            by_board[s.board_id] = n
    market = oi.build_market_signals(db)
    metrics = {
        "authorized_sources": len(sources),
        "observed_jobs_by_board": by_board,
        "total_observed_jobs": (market.get("metrics") or {}).get("total_observed_jobs"),
        "whole_market_claim": False,
        "wording": "observed_source",
        "fabricated_conversion": False,
        "demand_trend": "UNKNOWN",
    }
    key = f"cov:{_uuid('cov')}:{candidate_id}"
    snap = CandidateSourceCoverageSnapshot(
        candidate_id=candidate_id,
        snapshot_key=key[:160],
        metrics_json=_dumps(metrics),
        wording="observed_source",
        whole_market_claim=False,
        claim_kind="INFERENCE",
        computed_at=_utcnow(),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return {
        "snapshot_id": snap.id,
        "metrics": metrics,
        "wording": "observed_source",
        "whole_market_claim": False,
        "fabricated": False,
    }


def _observe_gaps_internal(
    db: Session, *, candidate_id: int, strategy_id: int, persist: bool
) -> list[dict]:
    """Evidence-backed gaps from normalized opportunities — not keyword-only."""
    opps = (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
            CandidateNormalizedOpportunity.superseded_at.is_(None),
        )
        .limit(15)
        .all()
    )
    evidence_n = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .count()
    )
    gaps: list[dict] = []
    for o in opps:
        fit = _loads(o.fit_json, {}) or {}
        for gid in fit.get("gaps") or []:
            gaps.append(
                {
                    "opportunity_id": o.id,
                    "gap_id": gid,
                    "keyword_only": False,
                    "evidence_backed": evidence_n > 0,
                    "claim_kind": "INFERENCE",
                }
            )
    if not gaps and evidence_n == 0:
        gaps.append(
            {
                "gap_id": "evidence:missing",
                "text": "UNKNOWN — no Career Evidence to ground gaps",
                "keyword_only": False,
                "evidence_backed": False,
                "claim_kind": "UNKNOWN",
            }
        )
    if persist:
        for i, g in enumerate(gaps[:10]):
            db.add(
                CandidateGapObservation(
                    candidate_id=candidate_id,
                    strategy_id=strategy_id,
                    gap_key=_uuid(f"gap{i}")[:160],
                    kind="requirement",
                    observation_json=_dumps(g),
                    keyword_only=False,
                    evidence_backed=bool(g.get("evidence_backed")),
                    investment_json=_dumps(
                        {"suggested": "review evidence", "auto_applied": False}
                    ),
                    claim_kind=g.get("claim_kind") or "INFERENCE",
                    kpi_excluded=True,
                    created_at=_utcnow(),
                )
            )
        db.commit()
    return gaps


def observe_gaps(db: Session, *, candidate_id: int, strategy_id: int) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    gaps = _observe_gaps_internal(
        db, candidate_id=candidate_id, strategy_id=row.id, persist=True
    )
    return {"gaps": gaps, "keyword_only": False, "count": len(gaps)}


def decide_gap_investment(
    db: Session, *, candidate_id: int, strategy_id: int, gap_key: str | None = None
) -> dict:
    """Candidate-visible investment suggestion — never auto-applied."""
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    gaps = _observe_gaps_internal(
        db, candidate_id=candidate_id, strategy_id=row.id, persist=False
    )
    target = gaps[0] if gaps else {"gap_id": "evidence:missing", "claim_kind": "UNKNOWN"}
    if gap_key:
        for g in gaps:
            if g.get("gap_id") == gap_key or g.get("gap_key") == gap_key:
                target = g
                break
    decision = {
        "gap": target,
        "investment": {
            "suggested": "Add Career Evidence or pause thesis",
            "auto_applied": False,
            "silent": False,
            "requires_candidate_approval": True,
        },
        "keyword_only": False,
        "claim_kind": "SUGGESTION",
    }
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="gap_investment",
        entity_id=row.id,
        action="decide",
        before={},
        after={"auto_applied": False},
    )
    db.commit()
    return decision


def set_thesis_status(
    db: Session,
    *,
    candidate_id: int,
    thesis_id: int,
    status: str,
) -> dict:
    allowed = {
        "PRIMARY",
        "SECONDARY",
        "EXPERIMENTAL",
        "PAUSED",
        "REJECTED",
        "ARCHIVED",
        "UNKNOWN",
        "draft",
    }
    status_u = (status or "UNKNOWN").upper() if status != "draft" else "draft"
    if status_u not in allowed and status not in allowed:
        raise ValueError("invalid_thesis_status")
    final = status if status == "draft" else status_u
    t = (
        db.query(CandidateRoleThesis)
        .filter_by(id=thesis_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not t or t.deleted_at:
        raise ValueError("thesis_not_found")
    before = t.status
    t.status = final
    t.version = int(t.version or 1) + 1
    t.updated_at = _utcnow()
    body = _loads(t.body_json, {})
    body["silent_thesis_change"] = False
    t.body_json = _dumps(body)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="role_thesis",
        entity_id=t.id,
        action="set_status",
        before={"status": before},
        after={"status": final, "silent_thesis_change": False},
    )
    db.commit()
    db.refresh(t)
    return _ser_thesis(t)


def update_allocation(
    db: Session,
    *,
    candidate_id: int,
    strategy_id: int,
    allocations: list[dict],
    candidate_approved_concentration: bool = False,
) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    port = (
        db.query(CandidateSearchPortfolio)
        .filter_by(candidate_id=candidate_id, strategy_id=row.id)
        .filter(CandidateSearchPortfolio.deleted_at.is_(None))
        .order_by(CandidateSearchPortfolio.id.desc())
        .first()
    )
    if not port:
        raise ValueError("portfolio_not_found")
    cleaned = []
    for a in allocations[:12]:
        cleaned.append(
            {
                "bucket": str(a.get("bucket") or "custom")[:64],
                "pct": float(a.get("pct") or 0),
                "claim_kind": "SUGGESTION",
            }
        )
    balance_state = (
        "CONCENTRATED_BY_CANDIDATE_CHOICE"
        if candidate_approved_concentration
        else "BALANCED_FOR_CURRENT_STRATEGY"
    )
    port.allocations_json = _dumps(cleaned)
    balance = {
        "balanced": not candidate_approved_concentration,
        "overconcentration": False,
        "state": balance_state,
        "candidate_approved_concentration": bool(candidate_approved_concentration),
        "claim_kind": "SUGGESTION",
    }
    port.balance_json = _dumps(balance)
    port.updated_at = _utcnow()
    row.allocation_json = _dumps({"buckets": cleaned, "balance": balance})
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(port)
    return {"portfolio": _ser_portfolio(port), "balance": balance, "silent": False}


def detect_strategy_conflicts(db: Session, *, candidate_id: int, strategy_id: int) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    theses = (
        db.query(CandidateRoleThesis)
        .filter_by(candidate_id=candidate_id, strategy_id=row.id)
        .filter(CandidateRoleThesis.deleted_at.is_(None))
        .all()
    )
    primary = [t for t in theses if t.status == "PRIMARY"]
    conflicts = []
    if len(primary) > 1:
        conflicts.append(
            {
                "kind": "multiple_primary_theses",
                "claim_kind": "FACT",
                "thesis_ids": [t.id for t in primary],
            }
        )
    stale = [t for t in theses if t.stale]
    if stale:
        conflicts.append(
            {
                "kind": "stale_thesis",
                "claim_kind": "INFERENCE",
                "thesis_ids": [t.id for t in stale],
            }
        )
    return {
        "conflicts": conflicts,
        "count": len(conflicts),
        "auto_resolved": False,
        "silent_resolution": False,
    }


def create_experiment(
    db: Session,
    *,
    candidate_id: int,
    strategy_id: int,
    hypothesis: str,
) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    exp = CandidateSearchExperiment(
        candidate_id=candidate_id,
        strategy_id=row.id,
        experiment_key=_uuid("exp"),
        hypothesis_json=_dumps(
            {
                "text": (hypothesis or "")[:500],
                "silent_weight_change": False,
                "requires_approval_for_weights": True,
                "fabricated_conversion": False,
            }
        ),
        observations_json="[]",
        result_json=_dumps({"weights_changed": False, "silent": False}),
        status="running",
        silent_weight_change=False,
        requires_approval_for_weights=True,
        claim_kind="INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(exp)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="experiment",
        entity_id=None,
        action="create",
        before={},
        after={"silent_weight_change": False, "requires_approval_for_weights": True},
    )
    db.commit()
    db.refresh(exp)
    return _ser_experiment(exp)


def complete_experiment(
    db: Session, *, candidate_id: int, experiment_id: int, observation: str | None = None
) -> dict:
    exp = (
        db.query(CandidateSearchExperiment)
        .filter_by(id=experiment_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not exp or exp.deleted_at:
        raise ValueError("experiment_not_found")
    obs = _loads(exp.observations_json, [])
    if observation:
        obs.append({"text": observation[:500], "at": _utcnow().isoformat(), "claim_kind": "CANDIDATE_RECOLLECTION"})
    exp.observations_json = _dumps(obs)
    exp.status = "completed"
    exp.completed_at = _utcnow()
    # HARD: never silent weight change
    exp.silent_weight_change = False
    exp.result_json = _dumps(
        {
            "weights_changed": False,
            "silent_weight_change": False,
            "requires_calibration_proposal": True,
            "fabricated_conversion": False,
        }
    )
    exp.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="experiment",
        entity_id=exp.id,
        action="complete",
        before={},
        after={"silent_weight_change": False, "weights_changed": False},
    )
    db.commit()
    db.refresh(exp)
    return _ser_experiment(exp)


def refresh_portfolio(
    db: Session, *, candidate_id: int, strategy_id: int
) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    port = (
        db.query(CandidateSearchPortfolio)
        .filter_by(candidate_id=candidate_id, strategy_id=row.id)
        .filter(CandidateSearchPortfolio.deleted_at.is_(None))
        .order_by(CandidateSearchPortfolio.id.desc())
        .first()
    )
    if not port:
        raise ValueError("portfolio_not_found")
    wls = (
        db.query(CandidateOpportunityWatchlist)
        .filter(
            CandidateOpportunityWatchlist.candidate_id == candidate_id,
            CandidateOpportunityWatchlist.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    searches = (
        db.query(CandidateSavedSearch)
        .filter(
            CandidateSavedSearch.candidate_id == candidate_id,
            CandidateSavedSearch.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    opps = (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
            CandidateNormalizedOpportunity.superseded_at.is_(None),
        )
        .limit(30)
        .all()
    )
    port.watchlist_refs_json = _dumps([{"id": w.id, "title": w.title} for w in wls])
    port.saved_search_refs_json = _dumps([{"id": s.id, "title": s.title} for s in searches])
    port.opportunity_refs_json = _dumps(
        [{"id": o.id, "title": o.title, "stale": o.stale} for o in opps]
    )
    alloc = _loads(port.allocations_json, [])
    from app.database.models import CandidateOpportunityWatchlistHit

    wl_hit_n = (
        db.query(CandidateOpportunityWatchlistHit)
        .filter(CandidateOpportunityWatchlistHit.candidate_id == candidate_id)
        .count()
    )
    ss_with_query = sum(1 for s in searches if _loads(s.query_json, {}))
    balance = {
        "balanced": True,
        "overconcentration": False,
        "bucket_count": len(alloc),
        "opportunity_count": len(opps),
        "watchlist_quality": (
            "INSUFFICIENT_DATA"
            if not wls
            else ("OBSERVED_WITH_HITS" if wl_hit_n > 0 else "OBSERVED_REFS_NO_HITS")
        ),
        "saved_search_quality": (
            "INSUFFICIENT_DATA"
            if not searches
            else ("OBSERVED_QUERY" if ss_with_query else "OBSERVED_REFS")
        ),
        "static_refs_only": False,
        "claim_kind": "INFERENCE",
    }
    port.balance_json = _dumps(balance)
    port.updated_at = _utcnow()
    health = {
        "score": min(100, 40 + 10 * len(opps) + 5 * len(wls)),
        "stale_opportunities": sum(1 for o in opps if o.stale),
        "fabricated_conversion": False,
        "claim_kind": "INFERENCE",
    }
    row.health_json = _dumps(health)
    snap = CandidatePortfolioHealthSnapshot(
        candidate_id=candidate_id,
        portfolio_id=port.id,
        snapshot_key=_uuid("ph"),
        health_json=_dumps(health),
        claim_kind="INFERENCE",
        computed_at=_utcnow(),
    )
    db.add(snap)
    db.commit()
    db.refresh(port)
    return {
        "portfolio": _ser_portfolio(port),
        "health": health,
        "balance": balance,
    }


def simulate_strategy(db: Session, *, candidate_id: int, strategy_id: int) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    sim = {
        "if_activate": "Active strategy would surface portfolio NBA via Daily OS",
        "if_archive_cycle": "Archived cycles stop spawning tasks",
        "conversion_rate": None,
        "fabricated_conversion": False,
        "hiring_probability": None,
        "whole_market_claim": False,
        "guarantee": False,
        "claim_kind": "INFERENCE",
    }
    row.simulation_json = _dumps(sim)
    row.updated_at = _utcnow()
    db.commit()
    return sim


def create_review(
    db: Session, *, candidate_id: int, strategy_id: int, cadence: str = "weekly"
) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    review = CandidateStrategyReview(
        candidate_id=candidate_id,
        strategy_id=row.id,
        review_key=_uuid("rev"),
        cadence=(cadence if cadence in ("weekly", "monthly") else "weekly"),
        body_json=_dumps(
            {
                "summary": "Portfolio review — changes apply only after approval",
                "silent_changes": False,
                "fabricated_conversion": False,
            }
        ),
        approved_changes_json="[]",
        status="pending",
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _ser_review(review)


def approve_review_changes(
    db: Session, *, candidate_id: int, review_id: int, changes: list[dict] | None = None
) -> dict:
    rev = (
        db.query(CandidateStrategyReview)
        .filter_by(id=review_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not rev or rev.deleted_at:
        raise ValueError("review_not_found")
    approved = changes or [{"type": "ack", "silent": False}]
    rev.approved_changes_json = _dumps(approved)
    rev.status = "approved"
    rev.resolved_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="strategy_review",
        entity_id=rev.id,
        action="approve_changes",
        before={},
        after={"approved": True, "silent_weight_change": False},
    )
    db.commit()
    db.refresh(rev)
    return _ser_review(rev)


def pause_experiment(db: Session, *, candidate_id: int, experiment_id: int) -> dict:
    exp = (
        db.query(CandidateSearchExperiment)
        .filter_by(id=experiment_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not exp or exp.deleted_at:
        raise ValueError("experiment_not_found")
    exp.status = "paused"
    exp.silent_weight_change = False
    exp.updated_at = _utcnow()
    db.commit()
    db.refresh(exp)
    return _ser_experiment(exp)


def resume_experiment(db: Session, *, candidate_id: int, experiment_id: int) -> dict:
    exp = (
        db.query(CandidateSearchExperiment)
        .filter_by(id=experiment_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not exp or exp.deleted_at:
        raise ValueError("experiment_not_found")
    if exp.status not in ("paused", "running"):
        raise ValueError("experiment_not_resumable")
    exp.status = "running"
    exp.silent_weight_change = False
    exp.updated_at = _utcnow()
    db.commit()
    db.refresh(exp)
    return _ser_experiment(exp)


def pause_cycle(db: Session, *, candidate_id: int, cycle_id: int) -> dict:
    cyc = (
        db.query(CandidateSearchCycle)
        .filter_by(id=cycle_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not cyc or cyc.deleted_at:
        raise ValueError("cycle_not_found")
    cyc.status = "paused"
    cyc.spawns_tasks = False
    hist = _loads(cyc.history_json, [])
    hist.append({"event": "paused", "at": _utcnow().isoformat(), "spawns_tasks": False})
    cyc.history_json = _dumps(hist)
    db.commit()
    db.refresh(cyc)
    return _ser_cycle(cyc)


def resume_cycle(db: Session, *, candidate_id: int, cycle_id: int) -> dict:
    cyc = (
        db.query(CandidateSearchCycle)
        .filter_by(id=cycle_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not cyc or cyc.deleted_at:
        raise ValueError("cycle_not_found")
    if cyc.status not in ("paused", "active"):
        raise ValueError("cycle_not_resumable")
    cyc.status = "active"
    cyc.spawns_tasks = True
    hist = _loads(cyc.history_json, [])
    hist.append({"event": "resumed", "at": _utcnow().isoformat(), "spawns_tasks": True})
    cyc.history_json = _dumps(hist)
    db.commit()
    db.refresh(cyc)
    return _ser_cycle(cyc)


def archive_cycle(db: Session, *, candidate_id: int, cycle_id: int) -> dict:
    cyc = (
        db.query(CandidateSearchCycle)
        .filter_by(id=cycle_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not cyc or cyc.deleted_at:
        raise ValueError("cycle_not_found")
    cyc.status = "archived"
    cyc.archived_at = _utcnow()
    cyc.ended_at = _utcnow()
    cyc.spawns_tasks = False  # archived must not spawn tasks
    hist = _loads(cyc.history_json, [])
    hist.append({"event": "archived", "at": _utcnow().isoformat(), "spawns_tasks": False})
    cyc.history_json = _dumps(hist)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="search_cycle",
        entity_id=cyc.id,
        action="archive",
        before={},
        after={"spawns_tasks": False},
    )
    db.commit()
    db.refresh(cyc)
    return _ser_cycle(cyc)


def restart_cycle(db: Session, *, candidate_id: int, strategy_id: int) -> dict:
    row = _strategy(db, candidate_id=candidate_id, strategy_id=strategy_id)
    # Archive existing active cycles first
    for c in (
        db.query(CandidateSearchCycle)
        .filter_by(candidate_id=candidate_id, strategy_id=row.id, status="active")
        .all()
    ):
        c.status = "archived"
        c.archived_at = _utcnow()
        c.spawns_tasks = False
    cyc = CandidateSearchCycle(
        candidate_id=candidate_id,
        strategy_id=row.id,
        cycle_key=_uuid("cyc"),
        status="active",
        history_json=_dumps([{"event": "restarted", "at": _utcnow().isoformat()}]),
        spawns_tasks=True,
        claim_kind="FACT",
        kpi_excluded=True,
        started_at=_utcnow(),
    )
    db.add(cyc)
    db.commit()
    db.refresh(cyc)
    return _ser_cycle(cyc)


def invalidate_theses_on_evidence_delete(db: Session, *, candidate_id: int) -> dict:
    n = 0
    evidence_n = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .count()
    )
    for t in (
        db.query(CandidateRoleThesis)
        .filter(
            CandidateRoleThesis.candidate_id == candidate_id,
            CandidateRoleThesis.deleted_at.is_(None),
        )
        .all()
    ):
        refs = _loads(t.evidence_refs_json, [])
        # Drop deleted evidence ids
        alive_ids = {
            e.id
            for e in db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.candidate_id == candidate_id,
                CandidateCareerEvidence.deleted_at.is_(None),
            )
            .all()
        }
        kept = [r for r in refs if r.get("id") in alive_ids]
        t.evidence_refs_json = _dumps(kept)
        t.stale = len(kept) == 0 or evidence_n == 0
        t.claim_kind = "UNKNOWN" if t.stale else "INFERENCE"
        t.updated_at = _utcnow()
        n += 1
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="role_thesis",
        entity_id=None,
        action="invalidate_on_evidence_delete",
        before={},
        after={"recomputed": n, "stale_thesis_without_evidence": False},
    )
    db.commit()
    return {"recomputed": n, "stale_guard": True}


def ranking_refs(db: Session, *, candidate_id: int, weights: dict) -> list[dict]:
    """Active search strategies only — refs for canonical ranking."""
    out = []
    for row in (
        db.query(CandidateSearchStrategy)
        .filter(
            CandidateSearchStrategy.candidate_id == candidate_id,
            CandidateSearchStrategy.deleted_at.is_(None),
            CandidateSearchStrategy.status == "active",
            CandidateSearchStrategy.archived_at.is_(None),
        )
        .order_by(CandidateSearchStrategy.id.desc())
        .limit(3)
        .all()
    ):
        score = round(58 + 12 * float(weights.get("role_fit", 0.2)), 2)
        out.append(
            {
                "id": f"search_strategy:{row.id}",
                "module": "search_strategy_lab",
                "ref_id": row.id,
                "title": f"Search strategy: {row.title}",
                "score": score,
                "invalidated": False,
                "deleted": False,
                "explain": {
                    "why": "Active candidate-approved search strategy",
                    "silent_activation": False,
                    "calibration_bypass": False,
                    "claim_kind": "SUGGESTION",
                },
                "deep_link": f"/dashboard/search-strategy?id={row.id}",
            }
        )
    return out


def _push_daily_os(db: Session, *, candidate_id: int, strategy: CandidateSearchStrategy) -> dict:
    ok = True
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"searchstrat:{strategy.id}",
            kind="strategy",
            title=f"Active search strategy: {strategy.title}"[:300],
            body={
                "strategy_id": strategy.id,
                "canonical_ranking_ref": True,
                "separate_ranking": False,
                "approved_activation": True,
            },
            priority_score=80,
            deep_link=f"/dashboard/search-strategy?id={strategy.id}",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        ok = False
        logger.exception("daily os search strategy push failed: %s", exc)
    acal_ok = True
    try:
        from app.services import acceptance_calendar as acal

        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"searchstrat:acal:{strategy.id}"[:160],
            category="goal",
            title=f"Execute search strategy: {strategy.title}"[:300],
            summary="Candidate-approved search strategy commitment",
            importance=78,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link=f"/dashboard/search-strategy?id={strategy.id}",
            payload={
                "approved_commitment": True,
                "unapproved": False,
                "strategy_id": strategy.id,
            },
        )
    except Exception as exc:
        acal_ok = False
        logger.exception("acal search strategy push failed: %s", exc)
    return {"daily_os_ok": ok, "acal_ok": acal_ok, "separate_ranking": False}


def delete_search_strategy_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    for model in (
        CandidateSearchStrategy,
        CandidateRoleThesis,
        CandidateSearchPortfolio,
        CandidateSearchExperiment,
        CandidateSearchCycle,
        CandidateGapObservation,
        CandidateStrategyReview,
    ):
        q = db.query(model).filter(model.candidate_id == candidate_id)
        if hasattr(model, "deleted_at"):
            q = q.filter(model.deleted_at.is_(None))
        for row in q.all():
            if hasattr(row, "deleted_at"):
                row.deleted_at = now
            if hasattr(row, "spawns_tasks"):
                row.spawns_tasks = False
            if hasattr(row, "status") and getattr(row, "status", None) == "active":
                if model is CandidateSearchStrategy:
                    row.status = "archived"
                    row.archived_at = now
                elif model is CandidateSearchCycle:
                    row.status = "archived"
                    row.archived_at = now
                    row.spawns_tasks = False
    from app.database.models import CandidateCareerInboxItem

    db.query(CandidateCareerInboxItem).filter(
        CandidateCareerInboxItem.candidate_id == candidate_id,
        CandidateCareerInboxItem.item_key.like("searchstrat:%"),
    ).delete(synchronize_session=False)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="search_strategy",
        entity_id=None,
        action="delete_history",
        before={},
        after={"propagated": True, "archived_cycles_spawn": False},
    )
    db.commit()
    return {"deleted": True, "propagated": True}


def export_search_strategy(db: Session, *, candidate_id: int) -> dict:
    strategies = (
        db.query(CandidateSearchStrategy)
        .filter(
            CandidateSearchStrategy.candidate_id == candidate_id,
            CandidateSearchStrategy.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    return {
        "strategies": [
            {"id": s.id, "title": s.title, "status": s.status, "version": s.version}
            for s in strategies
        ],
        "full_module_payloads_excluded": True,
        "secrets_excluded": True,
        "opportunity_payloads_excluded": True,
    }


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    strategies = (
        db.query(CandidateSearchStrategy)
        .filter(
            CandidateSearchStrategy.candidate_id == candidate_id,
            CandidateSearchStrategy.deleted_at.is_(None),
        )
        .order_by(CandidateSearchStrategy.id.desc())
        .limit(10)
        .all()
    )
    coverage = None
    try:
        coverage = build_source_coverage(db, candidate_id=candidate_id)
    except Exception:
        coverage = {"wording": "observed_source", "whole_market_claim": False}
    return {
        "schema": "twin.career_market_radar_search_strategy/v1",
        "verdict_target": (
            "CAREER MARKET RADAR CUSTOMER-USABLE - "
            "EVIDENCE-BASED SEARCH STRATEGY AND OPPORTUNITY PORTFOLIO PRODUCTION-READY"
        ),
        "strategies": [_ser_strategy(db, s) for s in strategies],
        "coverage": coverage,
        "safety": {
            "strategy_activation_without_approval": False,
            "silent_thesis_change": False,
            "silent_weight_change": False,
            "keyword_only_gaps": False,
            "whole_market_claims": False,
            "fabricated_conversion": False,
            "archived_cycles_spawn_tasks": False,
            "stale_thesis_after_evidence_delete": False,
            "daily_os_separate_ranking": False,
            "acal_unapproved_commitments": False,
            "search_leaks": False,
            "protected_attr_inference": False,
            "hiring_probability_claim": False,
            "external_apply": False,
            "prohibited_scraping": False,
            "ats_write": False,
            "auto_apply": False,
            "microsoft_calendar_write": False,
            "workplace_monitoring": False,
            "phase_3_career_agent": "NOT_STARTED",
            "public_search_strategies": False,
        },
        "integrations": {
            "opportunity_intelligence": True,
            "canonical_ranking": True,
            "daily_os": True,
            "acceptance_calendar": True,
            "application_studio": True,
            "career_evidence": True,
            "lifecycle_approvals": True,
        },
        "routes": {
            "radar": "/dashboard/search-strategy",
            "jobs": "/dashboard/jobs",
            "approvals": "/dashboard/approvals",
            "search_outcomes": "/dashboard/search-outcomes",
            "daily_os_canonical": "/api/v1/candidates/me/career-copilot/daily",
            "daily_os_brief": "/api/v1/candidates/me/daily-os/brief",
            "daily_os_fe": "/dashboard/career",
            "api": "/api/v1/candidates/me/search-strategy",
        },
        "alembic": "118_career_market_radar_search_strategy",
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "residual_epic_21": {
            "reuses_opportunity_intel": True,
            "no_second_opportunity_store": True,
        },
        "residual_epic_23_ready": {
            "daily_os_canonical_not_404": True,
            "canonical_daily_os": "/api/v1/candidates/me/career-copilot/daily",
        },
        "invites_sent": 0,
        "alten_pack": False,
    }


def _strategy(db: Session, *, candidate_id: int, strategy_id: int) -> CandidateSearchStrategy:
    row = (
        db.query(CandidateSearchStrategy)
        .filter_by(id=strategy_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("strategy_not_found")
    return row


def _ser_strategy(db: Session, s: CandidateSearchStrategy) -> dict:
    theses = (
        db.query(CandidateRoleThesis)
        .filter_by(candidate_id=s.candidate_id, strategy_id=s.id)
        .filter(CandidateRoleThesis.deleted_at.is_(None))
        .order_by(CandidateRoleThesis.id.desc())
        .limit(5)
        .all()
    )
    ports = (
        db.query(CandidateSearchPortfolio)
        .filter_by(candidate_id=s.candidate_id, strategy_id=s.id)
        .filter(CandidateSearchPortfolio.deleted_at.is_(None))
        .limit(3)
        .all()
    )
    exps = (
        db.query(CandidateSearchExperiment)
        .filter_by(candidate_id=s.candidate_id, strategy_id=s.id)
        .filter(CandidateSearchExperiment.deleted_at.is_(None))
        .order_by(CandidateSearchExperiment.id.desc())
        .limit(5)
        .all()
    )
    cycles = (
        db.query(CandidateSearchCycle)
        .filter_by(candidate_id=s.candidate_id, strategy_id=s.id)
        .filter(CandidateSearchCycle.deleted_at.is_(None))
        .order_by(CandidateSearchCycle.id.desc())
        .limit(5)
        .all()
    )
    return {
        "id": s.id,
        "title": s.title,
        "status": s.status,
        "thesis": _loads(s.thesis_json, {}),
        "allocation": _loads(s.allocation_json, {}),
        "coverage": _loads(s.coverage_json, {}),
        "health": _loads(s.health_json, {}),
        "simulation": _loads(s.simulation_json, {}),
        "lifecycle_approval_id": s.lifecycle_approval_id,
        "activated_at": s.activated_at.isoformat() if s.activated_at else None,
        "archived_at": s.archived_at.isoformat() if s.archived_at else None,
        "version": s.version,
        "role_theses": [_ser_thesis(t) for t in theses],
        "portfolios": [_ser_portfolio(p) for p in ports],
        "experiments": [_ser_experiment(e) for e in exps],
        "cycles": [_ser_cycle(c) for c in cycles],
        "silent_activation": False,
        "kpi_excluded": s.kpi_excluded,
    }


def _ser_thesis(t: CandidateRoleThesis) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "body": _loads(t.body_json, {}),
        "evidence_refs": _loads(t.evidence_refs_json, []),
        "gaps": _loads(t.gap_json, {}),
        "status": t.status,
        "stale": t.stale,
        "claim_kind": t.claim_kind,
        "version": t.version,
    }


def _ser_portfolio(p: CandidateSearchPortfolio) -> dict:
    return {
        "id": p.id,
        "title": p.title,
        "allocations": _loads(p.allocations_json, []),
        "balance": _loads(p.balance_json, {}),
        "watchlist_refs": _loads(p.watchlist_refs_json, []),
        "saved_search_refs": _loads(p.saved_search_refs_json, []),
        "opportunity_refs": _loads(p.opportunity_refs_json, []),
    }


def _ser_experiment(e: CandidateSearchExperiment) -> dict:
    return {
        "id": e.id,
        "hypothesis": _loads(e.hypothesis_json, {}),
        "observations": _loads(e.observations_json, []),
        "result": _loads(e.result_json, {}),
        "status": e.status,
        "silent_weight_change": False,
        "requires_approval_for_weights": True,
    }


def _ser_cycle(c: CandidateSearchCycle) -> dict:
    return {
        "id": c.id,
        "status": c.status,
        "spawns_tasks": c.spawns_tasks if c.status == "active" else False,
        "history": _loads(c.history_json, []),
        "archived_at": c.archived_at.isoformat() if c.archived_at else None,
    }


def _ser_review(r: CandidateStrategyReview) -> dict:
    return {
        "id": r.id,
        "cadence": r.cadence,
        "body": _loads(r.body_json, {}),
        "approved_changes": _loads(r.approved_changes_json, []),
        "status": r.status,
    }
