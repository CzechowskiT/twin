"""Search Outcome Intelligence — candidate-specific funnel learning + calibration.

Extends Epic 2.2 Search Lab + 2.1 OI + 2.0 ranking. No second opportunity/strategy stores.
Never fabricate benchmarks, silent weight changes, or stage upgrades from silence.
EXTERNAL_CONFIRMED only when source truly confirms. Feedback ≠ offer.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateLifecycleApproval,
    CandidateNormalizedOpportunity,
    CandidateOpportunityWatchlist,
    CandidateRecommendationWeights,
    CandidateRoleThesis,
    CandidateSavedSearch,
    CandidateSearchCycle,
    CandidateSearchExperiment,
    CandidateSearchFunnelSnapshot,
    CandidateSearchOutcomeAttribution,
    CandidateSearchOutcomeAudit,
    CandidateSearchOutcomeCalibration,
    CandidateSearchOutcomeEvent,
    CandidateSearchOutcomeFeedback,
    CandidateSearchOutcomeLinkage,
    CandidateSearchOutcomeReview,
    CandidateSearchStrategy,
)
from app.services import career_copilot as cc
from app.services import career_lifecycle as life

logger = logging.getLogger(__name__)

STAGES = (
    "STRATEGY_ACTIVE",
    "THESIS_SET",
    "SOURCE_COVERED",
    "SAVED_SEARCH",
    "WATCHLIST",
    "OPPORTUNITY_SEEN",
    "CANDIDATE_ACTION",
    "STUDIO_PREP",
    "PACKAGE_APPROVED",
    "APPLICATION_DECLARED",
    "INTERVIEW_DECLARED",
    "OFFER_DECLARED",
    "DECISION_DECLARED",
    "TRANSITION_DECLARED",
    "OUTCOME_DECLARED",
    "REJECTED_DECLARED",
    "UNKNOWN",
    "INSUFFICIENT_DATA",
)

PROVENANCE = (
    "CANDIDATE_DECLARED",
    "EXTERNAL_CONFIRMED",
    "SYSTEM_OBSERVED",
    "INFERENCE",
    "UNKNOWN",
)

CANONICAL_DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"
CANONICAL_DAILY_OS_BRIEF = "/api/v1/candidates/me/daily-os/brief"
DAILY_OS_FE = "/dashboard/career"


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
        CandidateSearchOutcomeAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def stage_taxonomy() -> dict:
    return {
        "stages": list(STAGES),
        "provenance": list(PROVENANCE),
        "rules": {
            "no_silent_stage_upgrade": True,
            "no_infer_from_silence": True,
            "no_infer_from_feedback_to_offer": True,
            "no_package_approval_equals_submission": True,
            "external_confirmed_only_when_source_confirms": True,
            "rejection_from_delay_inference": False,
            "fabricated_benchmarks": False,
            "hiring_probability": False,
        },
    }


def upsert_linkage(
    db: Session,
    *,
    candidate_id: int,
    stage: str = "UNKNOWN",
    provenance: str = "CANDIDATE_DECLARED",
    strategy_id: int | None = None,
    thesis_id: int | None = None,
    opportunity_ref_id: int | None = None,
    saved_search_ref_id: int | None = None,
    watchlist_ref_id: int | None = None,
    source_key: str | None = None,
    experiment_id: int | None = None,
    cycle_id: int | None = None,
    studio_ref_id: int | None = None,
    interview_ref_id: int | None = None,
    outcome_ref_id: int | None = None,
    refs: dict | None = None,
    is_synthetic: bool = False,
) -> dict:
    stage_u = stage if stage in STAGES else "UNKNOWN"
    prov = provenance if provenance in PROVENANCE else "UNKNOWN"
    if prov == "EXTERNAL_CONFIRMED" and not (refs or {}).get("external_source_confirmed"):
        # Hard rule: never claim EXTERNAL_CONFIRMED without true confirmation flag
        prov = "CANDIDATE_DECLARED"
    row = CandidateSearchOutcomeLinkage(
        candidate_id=candidate_id,
        linkage_key=_uuid("lnk"),
        strategy_id=strategy_id,
        thesis_id=thesis_id,
        opportunity_ref_id=opportunity_ref_id,
        saved_search_ref_id=saved_search_ref_id,
        watchlist_ref_id=watchlist_ref_id,
        source_key=(source_key or "")[:64] or None,
        experiment_id=experiment_id,
        cycle_id=cycle_id,
        studio_ref_id=studio_ref_id,
        interview_ref_id=interview_ref_id,
        outcome_ref_id=outcome_ref_id,
        stage=stage_u,
        provenance=prov,
        refs_json=_dumps(refs or {}),
        claim_kind="FACT" if prov in ("CANDIDATE_DECLARED", "EXTERNAL_CONFIRMED") else "INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="linkage",
        entity_id=None,
        action="upsert",
        before={},
        after={"stage": stage_u, "provenance": prov, "silent_upgrade": False},
    )
    db.commit()
    db.refresh(row)
    return _ser_linkage(row)


def normalize_event(
    db: Session,
    *,
    candidate_id: int,
    linkage_id: int | None,
    to_stage: str,
    provenance: str = "CANDIDATE_DECLARED",
    payload: dict | None = None,
) -> dict:
    """Normalize a stage transition — never silent upgrade; never infer offer from feedback."""
    to_u = to_stage if to_stage in STAGES else "UNKNOWN"
    prov = provenance if provenance in PROVENANCE else "UNKNOWN"
    payload = dict(payload or {})
    if payload.get("is_feedback") and to_u in ("OFFER_DECLARED", "DECISION_DECLARED"):
        raise ValueError("feedback_is_not_offer")
    if payload.get("package_approved") and to_u == "APPLICATION_DECLARED":
        raise ValueError("package_approval_is_not_submission")
    if prov == "EXTERNAL_CONFIRMED" and not payload.get("external_source_confirmed"):
        raise ValueError("external_confirmed_requires_source")

    from_stage = None
    link = None
    if linkage_id:
        link = (
            db.query(CandidateSearchOutcomeLinkage)
            .filter_by(id=linkage_id, candidate_id=candidate_id)
            .one_or_none()
        )
        if not link or link.deleted_at:
            raise ValueError("linkage_not_found")
        from_stage = link.stage

    ev = CandidateSearchOutcomeEvent(
        candidate_id=candidate_id,
        linkage_id=linkage_id,
        event_key=_uuid("evt"),
        from_stage=from_stage,
        to_stage=to_u,
        provenance=prov,
        payload_json=_dumps({**payload, "silent_upgrade": False, "inferred_from_silence": False}),
        silent_upgrade=False,
        claim_kind="FACT" if prov in ("CANDIDATE_DECLARED", "EXTERNAL_CONFIRMED") else "INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(ev)
    if link:
        link.stage = to_u
        link.provenance = prov
        link.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="event",
        entity_id=None,
        action="normalize",
        before={"from": from_stage},
        after={"to": to_u, "silent_upgrade": False},
    )
    db.commit()
    db.refresh(ev)
    return _ser_event(ev)


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
            {
                "role_fit": 0.25,
                "evidence": 0.2,
                "freshness": 0.15,
                "outcome": 0.2,
                "effort": 0.2,
            },
            1,
        )
    return _loads(row.weights_json, {}), int(row.version or 1)


def compute_funnel(db: Session, *, candidate_id: int, strategy_id: int | None = None) -> dict:
    q = db.query(CandidateSearchOutcomeLinkage).filter(
        CandidateSearchOutcomeLinkage.candidate_id == candidate_id,
        CandidateSearchOutcomeLinkage.deleted_at.is_(None),
    )
    if strategy_id:
        q = q.filter(CandidateSearchOutcomeLinkage.strategy_id == strategy_id)
    links = q.limit(500).all()
    counts: dict[str, int] = {s: 0 for s in STAGES}
    for ln in links:
        counts[ln.stage if ln.stage in counts else "UNKNOWN"] = (
            counts.get(ln.stage if ln.stage in counts else "UNKNOWN", 0) + 1
        )
    seen = counts.get("OPPORTUNITY_SEEN", 0) or 0
    actions = counts.get("CANDIDATE_ACTION", 0) or 0
    apps = counts.get("APPLICATION_DECLARED", 0) or 0
    interviews = counts.get("INTERVIEW_DECLARED", 0) or 0
    offers = counts.get("OFFER_DECLARED", 0) or 0
    denominators = {
        "opportunity_seen": seen,
        "candidate_action": actions,
        "application_declared": apps,
        "interview_declared": interviews,
        "disclosed": True,
        "hidden_denominators": False,
    }
    def _ratio(num: int, den: int) -> dict:
        if den <= 0:
            return {"value": None, "status": "INSUFFICIENT_DATA", "denominator": den}
        return {"value": round(num / den, 4), "status": "OBSERVED", "denominator": den, "numerator": num}

    ratios = {
        "action_per_seen": _ratio(actions, seen),
        "application_per_action": _ratio(apps, actions),
        "interview_per_application": _ratio(interviews, apps),
        "offer_per_interview": _ratio(offers, interviews),
        "benchmark": {"status": "NOT_PROVIDED", "fabricated": False},
    }
    unknowns = []
    if seen == 0:
        unknowns.append({"code": "NO_OPPORTUNITIES", "claim_kind": "UNKNOWN"})
    if any(v.get("status") == "INSUFFICIENT_DATA" for v in ratios.values() if isinstance(v, dict) and "status" in v):
        unknowns.append({"code": "INSUFFICIENT_DATA_FOR_RATIOS", "claim_kind": "UNKNOWN"})

    # time-to-stage: only when both stages declared with timestamps — else UNKNOWN
    events = (
        db.query(CandidateSearchOutcomeEvent)
        .filter(
            CandidateSearchOutcomeEvent.candidate_id == candidate_id,
            CandidateSearchOutcomeEvent.deleted_at.is_(None),
        )
        .order_by(CandidateSearchOutcomeEvent.id.asc())
        .limit(200)
        .all()
    )
    time_to = {
        "status": "INSUFFICIENT_DATA" if len(events) < 2 else "OBSERVED_TRANSITIONS_ONLY",
        "rejection_from_delay_inference": False,
        "samples": len(events),
        "claim_kind": "INFERENCE" if len(events) >= 2 else "UNKNOWN",
    }
    snap = CandidateSearchFunnelSnapshot(
        candidate_id=candidate_id,
        snapshot_key=_uuid("fun"),
        strategy_id=strategy_id,
        counts_json=_dumps(counts),
        ratios_json=_dumps(ratios),
        denominators_json=_dumps(denominators),
        time_to_stage_json=_dumps(time_to),
        unknowns_json=_dumps(unknowns),
        benchmark_json=_dumps({"status": "NOT_PROVIDED", "fabricated": False, "market_benchmark": False}),
        wording="candidate_specific",
        claim_kind="INFERENCE",
        kpi_excluded=True,
        computed_at=_utcnow(),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return {
        "snapshot_id": snap.id,
        "counts": counts,
        "ratios": ratios,
        "denominators": denominators,
        "time_to_stage": time_to,
        "unknowns": unknowns,
        "benchmark": {"status": "NOT_PROVIDED", "fabricated": False},
        "wording": "candidate_specific",
    }


def _cluster_component_summary(
    db: Session, *, candidate_id: int, links: list
) -> dict:
    """Observed cluster status from linkages — never fabricate progress/demand."""
    by_source: dict[str, int] = {}
    for ln in links:
        key = ln.source_key or "unknown_source"
        by_source[key] = by_source.get(key, 0) + 1
    if not by_source:
        return {
            "status": "INSUFFICIENT_DATA",
            "claim_kind": "UNKNOWN",
            "clusters": [],
            "demand_claim": False,
            "fabricated_progress": False,
        }
    clusters = [
        {
            "cluster_key": f"src:{k}",
            "opportunity_count": n,
            "status": "OBSERVED",
            "demand_claim": False,
            "fabricated_progress": False,
            "claim_kind": "INFERENCE",
        }
        for k, n in list(by_source.items())[:12]
    ]
    return {
        "status": "OBSERVED",
        "claim_kind": "INFERENCE",
        "clusters": clusters,
        "demand_claim": False,
        "fabricated_progress": False,
    }


def component_outcomes(db: Session, *, candidate_id: int) -> dict:
    """Role thesis / saved search / watchlist / source / cluster / experiment / cycle summaries."""
    theses = (
        db.query(CandidateRoleThesis)
        .filter(
            CandidateRoleThesis.candidate_id == candidate_id,
            CandidateRoleThesis.deleted_at.is_(None),
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
    watchlists = (
        db.query(CandidateOpportunityWatchlist)
        .filter(
            CandidateOpportunityWatchlist.candidate_id == candidate_id,
            CandidateOpportunityWatchlist.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    links = (
        db.query(CandidateSearchOutcomeLinkage)
        .filter(
            CandidateSearchOutcomeLinkage.candidate_id == candidate_id,
            CandidateSearchOutcomeLinkage.deleted_at.is_(None),
        )
        .limit(200)
        .all()
    )
    by_thesis: dict[int, int] = {}
    by_ss: dict[int, int] = {}
    by_wl: dict[int, int] = {}
    by_source: dict[str, int] = {}
    for ln in links:
        if ln.thesis_id:
            by_thesis[ln.thesis_id] = by_thesis.get(ln.thesis_id, 0) + 1
        if ln.saved_search_ref_id:
            by_ss[ln.saved_search_ref_id] = by_ss.get(ln.saved_search_ref_id, 0) + 1
        if ln.watchlist_ref_id:
            by_wl[ln.watchlist_ref_id] = by_wl.get(ln.watchlist_ref_id, 0) + 1
        if ln.source_key:
            by_source[ln.source_key] = by_source.get(ln.source_key, 0) + 1

    thesis_out = []
    for t in theses:
        thesis_out.append(
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "stale": t.stale,
                "readiness": "STALE" if t.stale else ("READY" if not t.stale else "UNKNOWN"),
                "linked_outcomes": by_thesis.get(t.id, 0),
                "skill_mastery_inference": False,
                "claim_kind": "INFERENCE",
            }
        )
    ss_out = []
    for s in searches:
        n = by_ss.get(s.id, 0)
        quality = "INSUFFICIENT_DATA" if n == 0 else "OBSERVED_OUTCOME_LINKS"
        ss_out.append(
            {
                "id": s.id,
                "title": s.title,
                "linked_outcomes": n,
                "quality": quality,
                "static_refs_only": False,
                "claim_kind": "INFERENCE" if n else "UNKNOWN",
            }
        )
    wl_out = []
    for w in watchlists:
        n = by_wl.get(w.id, 0)
        quality = "INSUFFICIENT_DATA" if n == 0 else "OBSERVED_OUTCOME_LINKS"
        wl_out.append(
            {
                "id": w.id,
                "title": w.title,
                "linked_outcomes": n,
                "quality": quality,
                "static_refs_only": False,
                "claim_kind": "INFERENCE" if n else "UNKNOWN",
            }
        )

    experiments = (
        db.query(CandidateSearchExperiment)
        .filter(
            CandidateSearchExperiment.candidate_id == candidate_id,
            CandidateSearchExperiment.deleted_at.is_(None),
        )
        .order_by(CandidateSearchExperiment.id.desc())
        .limit(10)
        .all()
    )
    exp_out = []
    for e in experiments:
        result = _loads(e.result_json, {})
        inconclusive = e.status == "completed" and not result.get("weights_changed")
        exp_out.append(
            {
                "id": e.id,
                "status": e.status,
                "silent_weight_change": False,
                "weights_changed": bool(result.get("weights_changed")),
                "inconclusive": inconclusive or e.status != "completed",
                "evaluation": "INCONCLUSIVE" if inconclusive or e.status != "completed" else "OBSERVED",
                "claim_kind": "INFERENCE",
            }
        )

    cycles = (
        db.query(CandidateSearchCycle)
        .filter(
            CandidateSearchCycle.candidate_id == candidate_id,
            CandidateSearchCycle.deleted_at.is_(None),
        )
        .order_by(CandidateSearchCycle.id.desc())
        .limit(10)
        .all()
    )
    cyc_out = []
    for c in cycles:
        cyc_out.append(
            {
                "id": c.id,
                "status": c.status,
                "spawns_tasks": bool(c.spawns_tasks) if c.status == "active" else False,
                "archived_spawns_tasks": False if c.status == "archived" else None,
                "claim_kind": "FACT",
            }
        )

    # Persist attributions (refs only)
    for ctype, items in (
        ("role_thesis", thesis_out),
        ("saved_search", ss_out),
        ("watchlist", wl_out),
    ):
        for it in items[:10]:
            key = f"{ctype}:{it['id']}"
            existing = (
                db.query(CandidateSearchOutcomeAttribution)
                .filter_by(candidate_id=candidate_id, attribution_key=key)
                .one_or_none()
            )
            if existing:
                existing.summary_json = _dumps(it)
                existing.causality_claim = False
                existing.component_type = ctype
                existing.component_ref_id = it["id"]
                existing.claim_kind = it.get("claim_kind") or "INFERENCE"
                existing.deleted_at = None
                existing.updated_at = _utcnow()
            else:
                db.add(
                    CandidateSearchOutcomeAttribution(
                        candidate_id=candidate_id,
                        attribution_key=key,
                        component_type=ctype,
                        component_ref_id=it["id"],
                        summary_json=_dumps(it),
                        causality_claim=False,
                        conflicts_json="[]",
                        claim_kind=it.get("claim_kind") or "INFERENCE",
                        kpi_excluded=True,
                        created_at=_utcnow(),
                        updated_at=_utcnow(),
                    )
                )
    db.commit()
    return {
        "role_theses": thesis_out,
        "saved_searches": ss_out,
        "watchlists": wl_out,
        "sources": [{"source_key": k, "linked_outcomes": v, "claim_kind": "INFERENCE"} for k, v in by_source.items()],
        "clusters": _cluster_component_summary(db, candidate_id=candidate_id, links=links),
        "experiments": exp_out,
        "cycles": cyc_out,
        "causality_claims": False,
        "skill_mastery_inference": False,
        "automatic_activity_monitoring": False,
    }


def build_attribution(db: Session, *, candidate_id: int) -> dict:
    comps = component_outcomes(db, candidate_id=candidate_id)
    conflicts = detect_attribution_conflicts(db, candidate_id=candidate_id)
    return {
        "components": comps,
        "causality_claim": False,
        "conflicts": conflicts,
        "claim_kind": "INFERENCE",
    }


def detect_attribution_conflicts(db: Session, *, candidate_id: int) -> dict:
    conflicts = []
    # Same opportunity linked to multiple mutually exclusive stages
    links = (
        db.query(CandidateSearchOutcomeLinkage)
        .filter(
            CandidateSearchOutcomeLinkage.candidate_id == candidate_id,
            CandidateSearchOutcomeLinkage.deleted_at.is_(None),
            CandidateSearchOutcomeLinkage.opportunity_ref_id.isnot(None),
        )
        .all()
    )
    by_opp: dict[int, set[str]] = {}
    for ln in links:
        oid = int(ln.opportunity_ref_id or 0)
        by_opp.setdefault(oid, set()).add(ln.stage)
    for oid, stages in by_opp.items():
        if "OFFER_DECLARED" in stages and "REJECTED_DECLARED" in stages:
            conflicts.append(
                {
                    "kind": "offer_and_rejected",
                    "opportunity_ref_id": oid,
                    "auto_resolved": False,
                    "claim_kind": "FACT",
                }
            )
    return {"conflicts": conflicts, "count": len(conflicts), "silent_resolution": False}


def evidence_gap_outcomes(db: Session, *, candidate_id: int) -> dict:
    theses = (
        db.query(CandidateRoleThesis)
        .filter(
            CandidateRoleThesis.candidate_id == candidate_id,
            CandidateRoleThesis.deleted_at.is_(None),
        )
        .all()
    )
    gaps = []
    for t in theses:
        g = _loads(t.gap_json, {})
        gaps.append(
            {
                "thesis_id": t.id,
                "stale": t.stale,
                "readiness": "STALE" if t.stale else "READY",
                "gaps": g,
                "skill_mastery_inference": False,
                "keyword_only": False,
            }
        )
    return {"gaps": gaps, "skill_mastery_inference": False, "claim_kind": "INFERENCE"}


def preparation_effort(db: Session, *, candidate_id: int) -> dict:
    return {
        "status": "UNKNOWN",
        "automatic_activity_monitoring": False,
        "workplace_monitoring": False,
        "candidate_declared_only": True,
        "claim_kind": "UNKNOWN",
    }


def propose_calibration(
    db: Session,
    *,
    candidate_id: int,
    strategy_id: int | None = None,
    rationale: str | None = None,
) -> dict:
    """Propose weight nudge from observed funnel — never silent; never applies until approve."""
    before, ver = _active_weights(db, candidate_id=candidate_id)
    after = dict(before)
    # Tiny conservative nudge toward outcome weight — suggestion only
    if "outcome" in after:
        after["outcome"] = round(min(0.4, float(after["outcome"]) + 0.02), 4)
    if "role_fit" in after:
        after["role_fit"] = round(max(0.05, float(after["role_fit"]) - 0.02), 4)
    s = sum(float(v) for v in after.values()) or 1.0
    after = {k: round(float(v) / s, 4) for k, v in after.items()}
    preview = {
        "before": before,
        "after": after,
        "ranking_effect_if_approved": "Canonical weights update only after approval",
        "ranking_effect_if_rejected": "No ranking change",
        "silent": False,
        "fabricated_conversion": False,
        "guarantee": False,
    }
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
        approval_kind="search_outcome_calibration",
        status="pending",
        bundled=False,
        before_json=_dumps({"weights": before, "version": ver}),
        after_json=_dumps({"weights": after, "silent": False}),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    cal = CandidateSearchOutcomeCalibration(
        candidate_id=candidate_id,
        calibration_key=_uuid("ocal"),
        strategy_id=strategy_id,
        status="pending",
        before_weights_json=_dumps(before),
        after_weights_json=_dumps(after),
        preview_json=_dumps(preview),
        impact_json=_dumps({"applied": False, "silent": False}),
        explain_json=_dumps(
            {
                "rationale": (rationale or "Candidate-specific funnel observation")[:500],
                "silent": False,
                "requires_approval": True,
                "causality_claim": False,
                "benchmark": False,
            }
        ),
        version=1,
        lifecycle_approval_id=appr.id,
        silent=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(cal)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="calibration",
        entity_id=None,
        action="propose",
        before={"weights": before},
        after={"weights": after, "silent": False},
    )
    db.commit()
    db.refresh(cal)
    return _ser_calibration(cal)


def preview_calibration(db: Session, *, candidate_id: int, calibration_id: int) -> dict:
    cal = _calibration(db, candidate_id=candidate_id, calibration_id=calibration_id)
    return {
        "calibration_id": cal.id,
        "preview": _loads(cal.preview_json, {}),
        "silent": False,
        "applied": False,
    }


def resolve_calibration(
    db: Session, *, candidate_id: int, calibration_id: int, approved: bool
) -> dict:
    cal = _calibration(db, candidate_id=candidate_id, calibration_id=calibration_id)
    if cal.status != "pending":
        raise ValueError("calibration_not_pending")
    if cal.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=cal.lifecycle_approval_id,
            approved=approved,
        )
    cal.status = "approved" if approved else "rejected"
    cal.resolved_at = _utcnow()
    cal.silent = False
    if approved:
        before, ver = _active_weights(db, candidate_id=candidate_id)
        after = _loads(cal.after_weights_json, {})
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
                weights_json=_dumps(after),
                version=ver + 1,
                source="search_outcome_calibration",
                created_at=_utcnow(),
            )
        )
        cal.impact_json = _dumps(
            {"applied": True, "silent": False, "ranking_changed": True, "before": before, "after": after}
        )
        action = "approve"
        _push_daily_os_calibration(db, candidate_id=candidate_id, cal=cal)
    else:
        cal.impact_json = _dumps(
            {"applied": False, "silent": False, "ranking_changed": False}
        )
        action = "reject"
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="calibration",
        entity_id=cal.id,
        action=action,
        before={},
        after={"status": cal.status, "silent": False, "ranking_changed": approved},
    )
    db.commit()
    db.refresh(cal)
    return _ser_calibration(cal)


def revert_calibration(db: Session, *, candidate_id: int, calibration_id: int) -> dict:
    cal = _calibration(db, candidate_id=candidate_id, calibration_id=calibration_id)
    if cal.status != "approved":
        raise ValueError("calibration_not_approved")
    before = _loads(cal.before_weights_json, {})
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
            weights_json=_dumps(before),
            version=ver + 1,
            source="search_outcome_calibration_revert",
            created_at=_utcnow(),
        )
    )
    cal.status = "reverted"
    cal.resolved_at = _utcnow()
    cal.impact_json = _dumps(
        {"applied": False, "reverted": True, "ranking_changed": True, "silent": False}
    )
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="calibration",
        entity_id=cal.id,
        action="revert",
        before={},
        after={"status": "reverted", "silent": False},
    )
    db.commit()
    db.refresh(cal)
    return _ser_calibration(cal)


def add_feedback(
    db: Session,
    *,
    candidate_id: int,
    kind: str = "usefulness",
    body: dict | None = None,
    linkage_id: int | None = None,
) -> dict:
    body = dict(body or {})
    # Feedback must never be treated as offer
    if body.get("is_offer") or kind == "offer":
        raise ValueError("feedback_is_not_offer")
    fb = CandidateSearchOutcomeFeedback(
        candidate_id=candidate_id,
        feedback_key=_uuid("fb"),
        linkage_id=linkage_id,
        kind=(kind or "usefulness")[:64],
        body_json=_dumps({**body, "is_offer": False}),
        is_offer=False,
        claim_kind="CANDIDATE_RECOLLECTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {
        "id": fb.id,
        "kind": fb.kind,
        "is_offer": False,
        "body": _loads(fb.body_json, {}),
    }


def create_review(
    db: Session, *, candidate_id: int, cadence: str = "weekly"
) -> dict:
    """Weekly/monthly review consumes persisted outcomes via Epic 2.4 registry."""
    from app.services import strategy_review_governance as srg

    session = srg.create_review_session(db, candidate_id=candidate_id, cadence=cadence)
    funnel = compute_funnel(db, candidate_id=candidate_id)
    rev = CandidateSearchOutcomeReview(
        candidate_id=candidate_id,
        review_key=_uuid("orev"),
        cadence=cadence if cadence in ("weekly", "monthly") else "weekly",
        body_json=_dumps(
            {
                "funnel_snapshot_id": funnel.get("snapshot_id"),
                "strategy_review_session_id": session.get("id"),
                "snapshot_hash": session.get("snapshot_hash"),
                "consumes_persisted_outcomes": True,
                "static_form": False,
                "benchmark": False,
                "silent_changes": False,
                "unknowns": funnel.get("unknowns"),
                "lineage_present": True,
            }
        ),
        status="pending",
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return {
        "id": rev.id,
        "cadence": rev.cadence,
        "status": rev.status,
        "body": _loads(rev.body_json, {}),
        "strategy_review": session,
        "consumes_persisted_outcomes": True,
        "static_form": False,
    }


def resolve_unknowns(db: Session, *, candidate_id: int) -> dict:
    funnel = compute_funnel(db, candidate_id=candidate_id)
    return {
        "unknowns": funnel.get("unknowns") or [],
        "auto_filled": False,
        "fabricated": False,
        "claim_kind": "UNKNOWN",
    }


def ranking_refs(db: Session, *, candidate_id: int, weights: dict) -> list[dict]:
    """Surface pending/approved outcome calibration awareness — no bypass."""
    out = []
    pending = (
        db.query(CandidateSearchOutcomeCalibration)
        .filter(
            CandidateSearchOutcomeCalibration.candidate_id == candidate_id,
            CandidateSearchOutcomeCalibration.deleted_at.is_(None),
            CandidateSearchOutcomeCalibration.status == "pending",
        )
        .order_by(CandidateSearchOutcomeCalibration.id.desc())
        .limit(2)
        .all()
    )
    for cal in pending:
        out.append(
            {
                "id": f"search_outcome_cal:{cal.id}",
                "module": "search_outcome_intelligence",
                "ref_id": cal.id,
                "title": "Pending search-outcome calibration (approval required)",
                "score": round(40 + 5 * float(weights.get("outcome", 0.2)), 2),
                "invalidated": False,
                "deleted": False,
                "explain": {
                    "why": "Candidate-specific funnel calibration awaiting approval",
                    "silent": False,
                    "calibration_bypass": False,
                    "applied": False,
                    "claim_kind": "SUGGESTION",
                },
                "deep_link": f"/dashboard/search-outcomes?calibration={cal.id}",
            }
        )
    return out


def _push_daily_os_calibration(
    db: Session, *, candidate_id: int, cal: CandidateSearchOutcomeCalibration
) -> dict:
    ok = True
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"searchout:cal:{cal.id}",
            kind="strategy",
            title="Search outcome calibration applied"[:300],
            body={
                "calibration_id": cal.id,
                "canonical_daily_os": CANONICAL_DAILY_OS,
                "separate_ranking": False,
                "approved": True,
            },
            priority_score=82,
            deep_link=f"/dashboard/search-outcomes?calibration={cal.id}",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        ok = False
        logger.exception("daily os search outcome push failed: %s", exc)
    acal_ok = True
    try:
        from app.services import acceptance_calendar as acal

        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"searchout:acal:{cal.id}"[:160],
            category="goal",
            title="Review calibrated search strategy"[:300],
            summary="Approved search-outcome calibration commitment",
            importance=76,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link=f"/dashboard/search-outcomes?calibration={cal.id}",
            payload={"approved_commitment": True, "unapproved": False},
        )
    except Exception as exc:
        acal_ok = False
        logger.exception("acal search outcome push failed: %s", exc)
    return {"daily_os_ok": ok, "acal_ok": acal_ok, "canonical_route": CANONICAL_DAILY_OS}


def invalidate_on_evidence_delete(db: Session, *, candidate_id: int) -> dict:
    from app.services import search_strategy_lab as sslab

    thesis = sslab.invalidate_theses_on_evidence_delete(db, candidate_id=candidate_id)
    # Mark attributions referencing stale theses
    n = 0
    for attr in (
        db.query(CandidateSearchOutcomeAttribution)
        .filter(
            CandidateSearchOutcomeAttribution.candidate_id == candidate_id,
            CandidateSearchOutcomeAttribution.deleted_at.is_(None),
            CandidateSearchOutcomeAttribution.component_type == "role_thesis",
        )
        .all()
    ):
        summary = _loads(attr.summary_json, {})
        summary["stale"] = True
        summary["readiness"] = "STALE"
        attr.summary_json = _dumps(summary)
        attr.updated_at = _utcnow()
        n += 1
    db.commit()
    return {"thesis": thesis, "attributions_marked_stale": n, "stale_guard": True}


def delete_outcome_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    for model in (
        CandidateSearchOutcomeLinkage,
        CandidateSearchOutcomeEvent,
        CandidateSearchOutcomeAttribution,
        CandidateSearchOutcomeCalibration,
        CandidateSearchOutcomeFeedback,
        CandidateSearchOutcomeReview,
    ):
        q = db.query(model).filter(model.candidate_id == candidate_id)
        if hasattr(model, "deleted_at"):
            q = q.filter(model.deleted_at.is_(None))
        for row in q.all():
            if hasattr(row, "deleted_at"):
                row.deleted_at = now
            if hasattr(row, "status") and getattr(row, "status", None) == "pending":
                row.status = "cancelled"
    from app.database.models import CandidateCareerInboxItem

    db.query(CandidateCareerInboxItem).filter(
        CandidateCareerInboxItem.candidate_id == candidate_id,
        CandidateCareerInboxItem.item_key.like("searchout:%"),
    ).delete(synchronize_session=False)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="search_outcomes",
        entity_id=None,
        action="delete_history",
        before={},
        after={"propagated": True},
    )
    db.commit()
    return {"deleted": True, "propagated": True}


def export_outcomes(db: Session, *, candidate_id: int) -> dict:
    links = (
        db.query(CandidateSearchOutcomeLinkage)
        .filter(
            CandidateSearchOutcomeLinkage.candidate_id == candidate_id,
            CandidateSearchOutcomeLinkage.deleted_at.is_(None),
        )
        .limit(50)
        .all()
    )
    return {
        "linkages": [
            {"id": l.id, "stage": l.stage, "provenance": l.provenance} for l in links
        ],
        "full_payloads_excluded": True,
        "secrets_excluded": True,
        "restricted_jd_excluded": True,
        "interview_transcripts_excluded": True,
    }


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    funnel = None
    try:
        funnel = compute_funnel(db, candidate_id=candidate_id)
    except Exception:
        funnel = {"wording": "candidate_specific", "benchmark": {"fabricated": False}}
    comps = component_outcomes(db, candidate_id=candidate_id)
    cals = (
        db.query(CandidateSearchOutcomeCalibration)
        .filter(
            CandidateSearchOutcomeCalibration.candidate_id == candidate_id,
            CandidateSearchOutcomeCalibration.deleted_at.is_(None),
        )
        .order_by(CandidateSearchOutcomeCalibration.id.desc())
        .limit(10)
        .all()
    )
    return {
        "schema": "twin.search_outcome_intelligence/v1",
        "verdict_target": (
            "SEARCH OUTCOME INTELLIGENCE CUSTOMER-USABLE - "
            "CANDIDATE-SPECIFIC FUNNEL LEARNING AND STRATEGY CALIBRATION PRODUCTION-READY"
        ),
        "taxonomy": stage_taxonomy(),
        "funnel": funnel,
        "components": comps,
        "calibrations": [_ser_calibration(c) for c in cals],
        "safety": {
            "fabricated_benchmarks": False,
            "hidden_denominators": False,
            "silent_stage_upgrade": False,
            "silent_weight_change": False,
            "silent_experiment_weights": False,
            "feedback_as_offer": False,
            "package_approval_as_submission": False,
            "rejection_from_delay": False,
            "causality_claims": False,
            "hiring_probability": False,
            "protected_attr_inference": False,
            "skill_mastery_inference": False,
            "automatic_activity_monitoring": False,
            "archived_cycles_spawn_tasks": False,
            "stale_thesis_after_evidence_delete": False,
            "daily_os_404": False,
            "search_leaks": False,
            "external_apply": False,
            "ats_write": False,
            "auto_apply": False,
            "microsoft_calendar_write": False,
            "workplace_monitoring": False,
            "public_outcome_analytics": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "routes": {
            "dashboard": "/dashboard/search-outcomes",
            "funnel": "/dashboard/search-outcomes?view=funnel",
            "history": "/dashboard/search-outcomes?view=history",
            "search_lab": "/dashboard/search-strategy",
            "daily_os_canonical": CANONICAL_DAILY_OS,
            "daily_os_brief": CANONICAL_DAILY_OS_BRIEF,
            "daily_os_fe": DAILY_OS_FE,
            "api": "/api/v1/candidates/me/search-outcomes",
        },
        "integrations": {
            "search_strategy_lab": True,
            "opportunity_intelligence": True,
            "canonical_ranking": True,
            "daily_os": True,
            "acceptance_calendar": True,
            "application_studio": True,
            "interview_decision": True,
            "career_transition": True,
            "career_evidence": True,
            "lifecycle": True,
        },
        "alembic": "119_search_outcome_intelligence",
        "residual_epic_22": {
            "daily_os_path_fixed": True,
            "canonical_daily_os": CANONICAL_DAILY_OS,
            "archived_cycles_no_spawn": True,
            "experiments_no_silent_weights": True,
        },
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "invites_sent": 0,
        "alten_pack": False,
    }


def _calibration(
    db: Session, *, candidate_id: int, calibration_id: int
) -> CandidateSearchOutcomeCalibration:
    row = (
        db.query(CandidateSearchOutcomeCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("calibration_not_found")
    return row


def _ser_linkage(l: CandidateSearchOutcomeLinkage) -> dict:
    return {
        "id": l.id,
        "stage": l.stage,
        "provenance": l.provenance,
        "strategy_id": l.strategy_id,
        "thesis_id": l.thesis_id,
        "opportunity_ref_id": l.opportunity_ref_id,
        "saved_search_ref_id": l.saved_search_ref_id,
        "watchlist_ref_id": l.watchlist_ref_id,
        "source_key": l.source_key,
        "refs": _loads(l.refs_json, {}),
    }


def _ser_event(e: CandidateSearchOutcomeEvent) -> dict:
    return {
        "id": e.id,
        "linkage_id": e.linkage_id,
        "from_stage": e.from_stage,
        "to_stage": e.to_stage,
        "provenance": e.provenance,
        "silent_upgrade": False,
        "payload": _loads(e.payload_json, {}),
    }


def _ser_calibration(c: CandidateSearchOutcomeCalibration) -> dict:
    return {
        "id": c.id,
        "status": c.status,
        "strategy_id": c.strategy_id,
        "before_weights": _loads(c.before_weights_json, {}),
        "after_weights": _loads(c.after_weights_json, {}),
        "preview": _loads(c.preview_json, {}),
        "impact": _loads(c.impact_json, {}),
        "explain": _loads(c.explain_json, {}),
        "version": c.version,
        "silent": False,
        "lifecycle_approval_id": c.lifecycle_approval_id,
        "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
    }
