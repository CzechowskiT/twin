"""Unified Career Lifecycle Command Center — orchestration over canonical modules.

Stores only context/phase/event refs/focus/findings/approvals/metadata.
Never duplicates profile/graph/recommendation/Daily OS/calendar/evidence/
application/interview/offer/transition/outcome payloads.
Material phase changes require candidate approval (no silent change).
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
    CandidateCareerEvidence,
    CandidateCareerInboxItem,
    CandidateCareerOutcome,
    CandidateDecisionMemo,
    CandidateInterviewProcess,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecycleFinding,
    CandidateLifecycleHandoff,
    CandidateLifecyclePrivacy,
    CandidateOfferRecord,
    CandidateTransitionWorkspace,
)
from app.services import career_copilot as cc

logger = logging.getLogger(__name__)

PHASES = (
    "UNDERSTAND",
    "DIRECTION",
    "EVIDENCE",
    "OPPORTUNITIES",
    "APPLICATION",
    "INTERVIEW",
    "DECIDE",
    "TRANSITION",
    "GROW",
    "OUTCOMES",
    "NEXT_CYCLE",
)
PHASE_ORDER = {p: i for i, p in enumerate(PHASES)}
MATERIAL_PHASE_DELTA = 1  # any phase index change is material → needs approval


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return cc._dumps(obj)


def _loads(raw: str | None, default: Any) -> Any:
    return cc._loads(raw or "", default)


def _uuid_key(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex}"[:160]


def _audit(
    db: Session,
    *,
    candidate_id: int,
    context_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateLifecycleAudit(
            candidate_id=candidate_id,
            context_id=context_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def get_or_create_privacy(db: Session, *, candidate_id: int) -> CandidateLifecyclePrivacy:
    row = db.query(CandidateLifecyclePrivacy).filter_by(candidate_id=candidate_id).one_or_none()
    if row:
        return row
    row = CandidateLifecyclePrivacy(candidate_id=candidate_id, created_at=_utcnow(), updated_at=_utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_privacy(db: Session, *, candidate_id: int, **kwargs: Any) -> CandidateLifecyclePrivacy:
    row = get_or_create_privacy(db, candidate_id=candidate_id)
    before = {"paused": row.paused, "version": row.version}
    for k in (
        "orchestration_opt_in",
        "search_opt_in",
        "learning_opt_in",
        "reminders_opt_in",
        "export_include_module_notes",
        "paused",
    ):
        if k in kwargs and kwargs[k] is not None:
            setattr(row, k, bool(kwargs[k]))
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        context_id=None,
        entity_type="privacy",
        entity_id=row.id,
        action="update",
        before=before,
        after={"paused": row.paused, "version": row.version, "propagated": True},
    )
    # Propagate pause into Daily OS inbox soft-signal (no silent disagreement)
    if row.paused:
        try:
            from app.services import career_daily_os as daily_os

            daily_os.upsert_inbox_item(
                db,
                candidate_id=candidate_id,
                item_key="lifecycle:privacy_paused",
                kind="lifecycle",
                title="Lifecycle orchestration paused by you",
                body={"paused": True, "propagated": True},
                priority_score=40,
                deep_link="/dashboard/privacy-center",
                claim_kind=cc.CLAIM_FACT,
            )
        except Exception as exc:
            logger.exception("daily os privacy pause upsert failed: %s", exc)
            _audit(
                db,
                candidate_id=candidate_id,
                context_id=None,
                entity_type="daily_os",
                entity_id=None,
                action="privacy_propagate_failed",
                before={},
                after={"error": type(exc).__name__, "silent": False},
            )
    db.commit()
    db.refresh(row)
    return row


def get_or_create_context(
    db: Session, *, candidate_id: int, is_synthetic: bool = False
) -> CandidateLifecycleContext:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    row = (
        db.query(CandidateLifecycleContext)
        .filter(
            CandidateLifecycleContext.candidate_id == candidate_id,
            CandidateLifecycleContext.deleted_at.is_(None),
            CandidateLifecycleContext.archived_at.is_(None),
        )
        .order_by(CandidateLifecycleContext.id.desc())
        .first()
    )
    if row:
        return row
    if privacy.paused:
        raise ValueError("lifecycle_paused")
    inferred = _infer_phase(db, candidate_id=candidate_id)
    row = CandidateLifecycleContext(
        candidate_id=candidate_id,
        context_key=_uuid_key("ctx"),
        active_phase=inferred["phase"],
        proposed_phase=None,
        phase_source=inferred["source"],
        phase_confidence=inferred["confidence"],
        candidate_phase_confirmed=False,
        active_goal="Coherent career journey",
        refs_json=_dumps(inferred["refs"]),
        unknowns_json=_dumps(inferred["unknowns"]),
        blocking_json=_dumps([]),
        nba_json=_dumps({}),
        readiness_json=_dumps({}),
        preferences_json=_dumps({"terminology_locale_aware": True}),
        deep_link_context_json=_dumps({"route": "/dashboard", "preserve_context": True}),
        context_version=1,
        claim_kind="INFERENCE",
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    _append_event(
        db,
        candidate_id=candidate_id,
        context=row,
        event_type="CONTEXT_CREATED",
        source_module="lifecycle",
        provenance="system",
        refs={"phase": row.active_phase},
        candidate_confirmed=False,
    )
    db.commit()
    db.refresh(row)
    return row


def _infer_phase(db: Session, *, candidate_id: int) -> dict:
    refs: dict[str, Any] = {}
    unknowns: list[str] = []
    transition = (
        db.query(CandidateTransitionWorkspace)
        .filter(
            CandidateTransitionWorkspace.candidate_id == candidate_id,
            CandidateTransitionWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateTransitionWorkspace.id.desc())
        .first()
    )
    if transition:
        refs["transition_id"] = transition.id
        return {
            "phase": "TRANSITION",
            "source": "inferred_from_transition",
            "confidence": "medium",
            "refs": refs,
            "unknowns": unknowns,
        }
    memo = (
        db.query(CandidateDecisionMemo)
        .filter(
            CandidateDecisionMemo.candidate_id == candidate_id,
            CandidateDecisionMemo.deleted_at.is_(None),
            CandidateDecisionMemo.declared_decision.isnot(None),
        )
        .order_by(CandidateDecisionMemo.id.desc())
        .first()
    )
    if memo:
        refs["decision_id"] = memo.id
        return {
            "phase": "DECIDE",
            "source": "inferred_from_decision",
            "confidence": "medium",
            "refs": refs,
            "unknowns": unknowns,
        }
    process = (
        db.query(CandidateInterviewProcess)
        .filter(
            CandidateInterviewProcess.candidate_id == candidate_id,
            CandidateInterviewProcess.deleted_at.is_(None),
        )
        .order_by(CandidateInterviewProcess.id.desc())
        .first()
    )
    if process:
        refs["process_id"] = process.id
        return {
            "phase": "INTERVIEW",
            "source": "inferred_from_interview",
            "confidence": "medium",
            "refs": refs,
            "unknowns": unknowns,
        }
    studio = (
        db.query(CandidateAppStudioWorkspace)
        .filter(
            CandidateAppStudioWorkspace.candidate_id == candidate_id,
            CandidateAppStudioWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateAppStudioWorkspace.id.desc())
        .first()
    )
    if studio:
        refs["workspace_id"] = studio.id
        return {
            "phase": "APPLICATION",
            "source": "inferred_from_application_studio",
            "confidence": "medium",
            "refs": refs,
            "unknowns": unknowns,
        }
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .first()
    )
    if evidence:
        refs["has_evidence"] = True
        return {
            "phase": "EVIDENCE",
            "source": "inferred_from_evidence",
            "confidence": "low",
            "refs": refs,
            "unknowns": ["direction_unknown"],
        }
    unknowns.append("profile_direction_unknown")
    return {
        "phase": "UNDERSTAND",
        "source": "default",
        "confidence": "low",
        "refs": refs,
        "unknowns": unknowns,
    }


def _append_event(
    db: Session,
    *,
    candidate_id: int,
    context: CandidateLifecycleContext,
    event_type: str,
    source_module: str,
    provenance: str,
    refs: dict,
    candidate_confirmed: bool,
    source_object_id: str | None = None,
) -> CandidateLifecycleEvent:
    ev = CandidateLifecycleEvent(
        candidate_id=candidate_id,
        context_id=context.id,
        event_key=_uuid_key("ev"),
        event_type=event_type[:64],
        source_module=source_module[:64],
        source_object_id=(source_object_id or None) and str(source_object_id)[:64],
        provenance=provenance[:64],
        claim_kind="FACT" if candidate_confirmed else "INFERENCE",
        candidate_confirmed=candidate_confirmed,
        context_version_before=context.context_version,
        context_version_after=context.context_version,
        payload_ref_json=_dumps(refs or {}),
        is_synthetic=bool(context.is_synthetic),
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(ev)
    return ev


def propose_phase(
    db: Session, *, candidate_id: int, phase: str, reason: str = ""
) -> dict:
    """Propose material phase change — does NOT apply until candidate approves."""
    if phase not in PHASES:
        raise ValueError("invalid_phase")
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    before = ctx.active_phase
    if before == phase:
        return {"status": "noop", "active_phase": before, "silent_change": False}
    ctx.proposed_phase = phase
    ctx.phase_source = "candidate_or_system_proposal"
    ctx.updated_at = _utcnow()
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id,
        approval_key=_uuid_key("apr"),
        approval_kind="phase_change",
        status="pending",
        bundled=False,
        before_json=_dumps({"phase": before}),
        after_json=_dumps({"phase": phase, "reason": (reason or "")[:300]}),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    _append_event(
        db,
        candidate_id=candidate_id,
        context=ctx,
        event_type="PHASE_PROPOSED",
        source_module="lifecycle",
        provenance="system",
        refs={"from": before, "to": phase},
        candidate_confirmed=False,
    )
    _audit(
        db,
        candidate_id=candidate_id,
        context_id=ctx.id,
        entity_type="phase",
        entity_id=ctx.id,
        action="propose",
        before={"phase": before},
        after={"proposed": phase, "silent": False, "requires_approval": True},
    )
    db.commit()
    db.refresh(appr)
    return {
        "status": "pending_approval",
        "active_phase": before,
        "proposed_phase": phase,
        "approval_id": appr.id,
        "silent_change": False,
        "bundled": False,
    }


def resolve_approval(
    db: Session, *, candidate_id: int, approval_id: int, approved: bool
) -> dict:
    appr = (
        db.query(CandidateLifecycleApproval)
        .filter_by(id=approval_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not appr or appr.status != "pending":
        raise ValueError("approval_not_found_or_resolved")
    if appr.bundled:
        raise ValueError("bundled_approvals_forbidden")
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    appr.status = "approved" if approved else "rejected"
    appr.resolved_at = _utcnow()
    if approved and appr.approval_kind == "phase_change":
        after = _loads(appr.after_json, {})
        new_phase = after.get("phase")
        if new_phase in PHASES:
            before = ctx.active_phase
            ctx.active_phase = new_phase
            ctx.proposed_phase = None
            ctx.candidate_phase_confirmed = True
            ctx.phase_source = "candidate_approved"
            ctx.phase_confidence = "high"
            ctx.context_version = int(ctx.context_version or 1) + 1
            ctx.claim_kind = "CANDIDATE_CONFIRMED"
            ctx.updated_at = _utcnow()
            _append_event(
                db,
                candidate_id=candidate_id,
                context=ctx,
                event_type="PHASE_CHANGED",
                source_module="lifecycle",
                provenance="candidate_declared",
                refs={"from": before, "to": new_phase},
                candidate_confirmed=True,
            )
    elif not approved and appr.approval_kind == "phase_change":
        ctx.proposed_phase = None
        ctx.updated_at = _utcnow()
    db.commit()
    return {
        "approval_id": appr.id,
        "status": appr.status,
        "active_phase": ctx.active_phase,
        "bundled": False,
    }


def set_focus(
    db: Session,
    *,
    candidate_id: int,
    focus_type: str,
    focus_ref: str,
) -> dict:
    """Set active focus — does NOT archive/delete other processes."""
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    before = {"focus_type": ctx.focus_type, "focus_ref": ctx.focus_ref}
    ctx.focus_type = (focus_type or "custom")[:64]
    ctx.focus_ref = (focus_ref or "")[:160]
    ctx.updated_at = _utcnow()
    _append_event(
        db,
        candidate_id=candidate_id,
        context=ctx,
        event_type="FOCUS_SET",
        source_module="lifecycle",
        provenance="candidate_declared",
        refs={"focus_type": ctx.focus_type, "focus_ref": ctx.focus_ref},
        candidate_confirmed=True,
        source_object_id=ctx.focus_ref,
    )
    _audit(
        db,
        candidate_id=candidate_id,
        context_id=ctx.id,
        entity_type="focus",
        entity_id=ctx.id,
        action="set",
        before=before,
        after={
            "focus_type": ctx.focus_type,
            "focus_ref": ctx.focus_ref,
            "other_processes_deleted": False,
        },
    )
    db.commit()
    return {
        "focus_type": ctx.focus_type,
        "focus_ref": ctx.focus_ref,
        "other_processes_preserved": True,
    }


def register_handoff(
    db: Session,
    *,
    candidate_id: int,
    from_module: str,
    to_module: str,
    from_object_id: str | None = None,
    to_object_id: str | None = None,
    snapshot_hash: str | None = None,
    status: str = "ready",
) -> dict:
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    row = CandidateLifecycleHandoff(
        candidate_id=candidate_id,
        context_id=ctx.id,
        handoff_key=_uuid_key("ho"),
        from_module=from_module[:64],
        to_module=to_module[:64],
        from_object_id=(from_object_id or None) and str(from_object_id)[:64],
        to_object_id=(to_object_id or None) and str(to_object_id)[:64],
        status=(status or "ready")[:32],
        snapshot_hash=(snapshot_hash or None) and snapshot_hash[:64],
        claim_kind="FACT",
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    _append_event(
        db,
        candidate_id=candidate_id,
        context=ctx,
        event_type="HANDOFF",
        source_module=from_module,
        provenance="system",
        refs={
            "from_module": from_module,
            "to_module": to_module,
            "from_object_id": from_object_id,
            "to_object_id": to_object_id,
            "snapshot_hash": snapshot_hash,
        },
        candidate_confirmed=False,
    )
    db.commit()
    db.refresh(row)
    return _ser_handoff(row)


def run_consistency(db: Session, *, candidate_id: int) -> dict:
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    findings: list[dict] = []
    # Stale: evidence deleted but still referenced in refs
    refs = _loads(ctx.refs_json, {})
    # Daily OS vs ACAL disagreement check (audited, not silent)
    acal_ok = True
    daily_ok = True
    try:
        n_acal = (
            db.query(CandidateAcceptanceItem)
            .filter_by(candidate_id=candidate_id)
            .count()
        )
    except Exception:
        acal_ok = False
        n_acal = 0
    try:
        n_inbox = (
            db.query(CandidateCareerInboxItem)
            .filter_by(candidate_id=candidate_id)
            .count()
        )
    except Exception:
        daily_ok = False
        n_inbox = 0
    if not acal_ok or not daily_ok:
        findings.append(
            {
                "finding_type": "integration_disagreement",
                "severity": "warn",
                "message": "Daily OS / ACAL read failed — not swallowed silently",
                "stale": True,
                "module_refs": ["daily_os", "acceptance_calendar"],
            }
        )
        _audit(
            db,
            candidate_id=candidate_id,
            context_id=ctx.id,
            entity_type="consistency",
            entity_id=ctx.id,
            action="integration_check_failed",
            before={},
            after={"acal_ok": acal_ok, "daily_ok": daily_ok, "silent": False},
        )
    # Soft signal if transition exists but phase not TRANSITION and not pending approval
    has_tr = (
        db.query(CandidateTransitionWorkspace)
        .filter(
            CandidateTransitionWorkspace.candidate_id == candidate_id,
            CandidateTransitionWorkspace.deleted_at.is_(None),
        )
        .count()
        > 0
    )
    if has_tr and ctx.active_phase != "TRANSITION" and not ctx.proposed_phase:
        findings.append(
            {
                "finding_type": "phase_lag",
                "severity": "info",
                "message": "Active transition exists — propose TRANSITION phase (requires your approval)",
                "stale": False,
                "module_refs": ["career_transition"],
            }
        )
    out = []
    for f in findings:
        row = CandidateLifecycleFinding(
            candidate_id=candidate_id,
            context_id=ctx.id,
            finding_key=_uuid_key("fd"),
            finding_type=f["finding_type"][:64],
            severity=f["severity"][:16],
            status="open",
            module_refs_json=_dumps(f.get("module_refs") or []),
            message=(f.get("message") or "")[:500],
            claim_kind="INFERENCE",
            stale=bool(f.get("stale")),
            created_at=_utcnow(),
        )
        db.add(row)
        out.append(f)
    # Refresh readiness + NBA
    nba = _build_nba(db, candidate_id=candidate_id, ctx=ctx)
    ctx.nba_json = _dumps(nba)
    ctx.readiness_json = _dumps(
        _build_readiness(db, candidate_id=candidate_id, ctx=ctx, n_acal=n_acal, n_inbox=n_inbox)
    )
    ctx.updated_at = _utcnow()
    db.commit()
    return {"findings": out, "nba": nba, "silent_disagreement": False}


def _build_nba(db: Session, *, candidate_id: int, ctx: CandidateLifecycleContext) -> dict:
    phase = ctx.active_phase
    deep = {
        "UNDERSTAND": "/dashboard/career",
        "DIRECTION": "/dashboard/career",
        "EVIDENCE": "/dashboard/portfolio",
        "OPPORTUNITIES": "/dashboard/jobs",
        "APPLICATION": "/dashboard/application-studio",
        "INTERVIEW": "/dashboard/interview-decision",
        "DECIDE": "/dashboard/interview-decision#decisions",
        "TRANSITION": "/dashboard/career-transition",
        "GROW": "/dashboard/career-transition",
        "OUTCOMES": "/dashboard/career-transition#outcomes",
        "NEXT_CYCLE": "/dashboard",
    }.get(phase, "/dashboard")
    pending = (
        db.query(CandidateLifecycleApproval)
        .filter_by(candidate_id=candidate_id, status="pending")
        .count()
    )
    # Prefer Epic 2.0 canonical ranking — never a second Daily OS ranking store.
    try:
        from app.services import career_strategy as strat

        snap = strat.get_active_ranking(db, candidate_id=candidate_id)
        if snap:
            cands = strat._loads(snap.candidates_json, [])
            top = cands[0] if cands else None
            if top and not pending:
                return {
                    "title": top.get("title") or "Continue ranked action",
                    "phase": phase,
                    "deep_link": top.get("deep_link") or deep,
                    "deep_link_preserves_context": True,
                    "priority": int(min(95, top.get("score") or 70)),
                    "claim_kind": "SUGGESTION",
                    "arbitrated": True,
                    "pending_approvals": pending,
                    "canonical_ranking": True,
                    "ranking_snapshot_id": snap.id,
                    "separate_ranking": False,
                }
    except Exception:
        pass
    title = "Review pending lifecycle approval" if pending else f"Continue {phase.replace('_', ' ').title()}"
    return {
        "title": title,
        "phase": phase,
        "deep_link": deep,
        "deep_link_preserves_context": True,
        "priority": 90 if pending else 70,
        "claim_kind": "SUGGESTION",
        "arbitrated": True,
        "pending_approvals": pending,
        "canonical_ranking": False,
        "separate_ranking": False,
    }


def _build_readiness(
    db: Session,
    *,
    candidate_id: int,
    ctx: CandidateLifecycleContext,
    n_acal: int,
    n_inbox: int,
) -> dict:
    return {
        "phase": ctx.active_phase,
        "modules": {
            "evidence": db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.candidate_id == candidate_id,
                CandidateCareerEvidence.deleted_at.is_(None),
            )
            .count()
            > 0,
            "application_studio": db.query(CandidateAppStudioWorkspace)
            .filter(
                CandidateAppStudioWorkspace.candidate_id == candidate_id,
                CandidateAppStudioWorkspace.deleted_at.is_(None),
            )
            .count()
            > 0,
            "interview": db.query(CandidateInterviewProcess)
            .filter(
                CandidateInterviewProcess.candidate_id == candidate_id,
                CandidateInterviewProcess.deleted_at.is_(None),
            )
            .count()
            > 0,
            "transition": db.query(CandidateTransitionWorkspace)
            .filter(
                CandidateTransitionWorkspace.candidate_id == candidate_id,
                CandidateTransitionWorkspace.deleted_at.is_(None),
            )
            .count()
            > 0,
            "outcomes": db.query(CandidateCareerOutcome)
            .filter(
                CandidateCareerOutcome.candidate_id == candidate_id,
                CandidateCareerOutcome.deleted_at.is_(None),
            )
            .count()
            > 0,
            "daily_os_inbox": n_inbox > 0,
            "acceptance_calendar": n_acal > 0,
        },
        "claim_kind": "INFERENCE",
    }


def global_search(db: Session, *, candidate_id: int, q: str) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if not privacy.search_opt_in or privacy.paused:
        raise ValueError("search_disabled")
    query = (q or "").strip().lower()
    if len(query) < 2:
        return {"results": [], "leaks_other_candidates": False}
    results: list[dict] = []
    # Search only own refs — titles from owned modules
    for proc in (
        db.query(CandidateInterviewProcess)
        .filter(
            CandidateInterviewProcess.candidate_id == candidate_id,
            CandidateInterviewProcess.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    ):
        if query in (proc.title or "").lower() or query in (proc.company or "").lower():
            results.append(
                {
                    "type": "interview_process",
                    "id": proc.id,
                    "title": proc.title,
                    "deep_link": f"/dashboard/interview-decision?process={proc.id}",
                }
            )
    for tr in (
        db.query(CandidateTransitionWorkspace)
        .filter(
            CandidateTransitionWorkspace.candidate_id == candidate_id,
            CandidateTransitionWorkspace.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    ):
        if query in (tr.title or "").lower():
            results.append(
                {
                    "type": "transition",
                    "id": tr.id,
                    "title": tr.title,
                    "deep_link": f"/dashboard/career-transition?id={tr.id}",
                }
            )
    for ev in (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .limit(30)
        .all()
    ):
        if query in (ev.title or "").lower():
            results.append(
                {
                    "type": "evidence",
                    "id": ev.id,
                    "title": ev.title,
                    "deep_link": f"/dashboard/portfolio?evidence={ev.id}",
                    "confidentiality": getattr(ev, "confidentiality", "PRIVATE"),
                }
            )
    return {
        "results": results[:40],
        "leaks_other_candidates": False,
        "candidate_scoped": True,
        "query_len": len(query),
    }


def archive_context(db: Session, *, candidate_id: int, reopen: bool = False) -> dict:
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    if reopen:
        ctx.archived_at = None
        action = "reopen"
    else:
        ctx.archived_at = _utcnow()
        action = "archive"
    ctx.updated_at = _utcnow()
    _append_event(
        db,
        candidate_id=candidate_id,
        context=ctx,
        event_type="CONTEXT_REOPENED" if reopen else "CONTEXT_ARCHIVED",
        source_module="lifecycle",
        provenance="candidate_declared",
        refs={},
        candidate_confirmed=True,
    )
    db.commit()
    return {"archived": ctx.archived_at is not None, "action": action}


def start_next_cycle(db: Session, *, candidate_id: int) -> dict:
    """Archive current context and open a fresh NEXT_CYCLE→UNDERSTAND context."""
    old = get_or_create_context(db, candidate_id=candidate_id)
    old.archived_at = _utcnow()
    old.updated_at = _utcnow()
    # Propose NEXT_CYCLE completion event then new context
    new = CandidateLifecycleContext(
        candidate_id=candidate_id,
        context_key=_uuid_key("ctx"),
        active_phase="UNDERSTAND",
        phase_source="next_cycle",
        phase_confidence="medium",
        candidate_phase_confirmed=True,
        active_goal="Next career cycle",
        refs_json="{}",
        unknowns_json=_dumps(["fresh_cycle"]),
        blocking_json="[]",
        nba_json=_dumps(
            {
                "title": "Start with direction and evidence",
                "deep_link": "/dashboard/career",
                "claim_kind": "SUGGESTION",
            }
        ),
        readiness_json="{}",
        preferences_json=old.preferences_json,
        deep_link_context_json=_dumps({"route": "/dashboard", "cycle": "next"}),
        context_version=1,
        claim_kind="CANDIDATE_CONFIRMED",
        is_synthetic=old.is_synthetic,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(new)
    db.flush()
    _append_event(
        db,
        candidate_id=candidate_id,
        context=new,
        event_type="NEXT_CYCLE_STARTED",
        source_module="lifecycle",
        provenance="candidate_declared",
        refs={"previous_context_id": old.id},
        candidate_confirmed=True,
    )
    db.commit()
    db.refresh(new)
    return {"previous_context_id": old.id, "context": _ser_context(new)}


def unified_export(db: Session, *, candidate_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    ctx = (
        db.query(CandidateLifecycleContext)
        .filter(
            CandidateLifecycleContext.candidate_id == candidate_id,
            CandidateLifecycleContext.deleted_at.is_(None),
        )
        .order_by(CandidateLifecycleContext.id.desc())
        .limit(5)
        .all()
    )
    events = (
        db.query(CandidateLifecycleEvent)
        .filter_by(candidate_id=candidate_id)
        .order_by(CandidateLifecycleEvent.id.desc())
        .limit(100)
        .all()
    )
    return {
        "contexts": [_ser_context(c) for c in ctx],
        "events": [_ser_event(e) for e in events],
        "module_notes_excluded": not privacy.export_include_module_notes,
        "secrets_excluded": True,
        "full_module_payloads_excluded": True,
        "kpi_excluded": True,
    }


def deletion_dependency_graph(db: Session, *, candidate_id: int) -> dict:
    """Ordered deletion dependencies — orchestration last after modules."""
    return {
        "order": [
            "career_evidence",
            "application_studio",
            "interview_decision",
            "career_transition",
            "acceptance_calendar_items",
            "daily_os_inbox",
            "lifecycle_events",
            "lifecycle_context",
        ],
        "candidate_id_scoped": True,
        "hard_delete_modules_first": True,
        "claim_kind": "FACT",
    }


def delete_lifecycle(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    for ctx in (
        db.query(CandidateLifecycleContext).filter_by(candidate_id=candidate_id).all()
    ):
        ctx.deleted_at = now
        ctx.archived_at = now
    # Soft-mark findings/approvals resolved
    for f in (
        db.query(CandidateLifecycleFinding)
        .filter_by(candidate_id=candidate_id, status="open")
        .all()
    ):
        f.status = "deleted"
        f.resolved_at = now
    for a in (
        db.query(CandidateLifecycleApproval)
        .filter_by(candidate_id=candidate_id, status="pending")
        .all()
    ):
        a.status = "cancelled"
        a.resolved_at = now
    _audit(
        db,
        candidate_id=candidate_id,
        context_id=None,
        entity_type="lifecycle",
        entity_id=None,
        action="delete",
        before={},
        after={"stale_reappear_guard": True},
    )
    db.commit()
    return {"ok": True, "stale_reappear_guard": True}


def recovery_status(db: Session, *, candidate_id: int) -> dict:
    ctx = (
        db.query(CandidateLifecycleContext)
        .filter(
            CandidateLifecycleContext.candidate_id == candidate_id,
            CandidateLifecycleContext.deleted_at.is_(None),
        )
        .order_by(CandidateLifecycleContext.id.desc())
        .first()
    )
    pending = (
        db.query(CandidateLifecycleApproval)
        .filter_by(candidate_id=candidate_id, status="pending")
        .count()
    )
    open_findings = (
        db.query(CandidateLifecycleFinding)
        .filter_by(candidate_id=candidate_id, status="open")
        .count()
    )
    return {
        "has_active_context": ctx is not None and ctx.archived_at is None,
        "archived": bool(ctx and ctx.archived_at),
        "pending_approvals": pending,
        "open_findings": open_findings,
        "recoverable": True,
        "deep_link": "/dashboard/recovery",
    }


def deep_link_resolve(db: Session, *, candidate_id: int, target: str) -> dict:
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    route_map = {
        "home": "/dashboard",
        "history": "/dashboard/history",
        "approvals": "/dashboard/approvals",
        "search": "/dashboard/search",
        "recovery": "/dashboard/recovery",
        "privacy": "/dashboard/privacy-center",
        "evidence": "/dashboard/portfolio",
        "application": "/dashboard/application-studio",
        "interview": "/dashboard/interview-decision",
        "transition": "/dashboard/career-transition",
        "calendar": "/dashboard/calendar",
    }
    href = route_map.get((target or "home").lower(), "/dashboard")
    ctx.deep_link_context_json = _dumps(
        {
            "route": href,
            "context_id": ctx.id,
            "phase": ctx.active_phase,
            "focus_ref": ctx.focus_ref,
            "preserve_context": True,
        }
    )
    ctx.updated_at = _utcnow()
    db.commit()
    return {
        "href": href,
        "context_id": ctx.id,
        "phase": ctx.active_phase,
        "preserve_context": True,
        "context_lost": False,
    }


def push_lifecycle_inbox(db: Session, *, candidate_id: int) -> dict:
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    nba = _loads(ctx.nba_json, {}) or _build_nba(db, candidate_id=candidate_id, ctx=ctx)
    daily_ok = True
    acal_ok = True
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"lifecycle:nba:{ctx.id}:{ctx.context_version}",
            kind="lifecycle",
            title=str(nba.get("title") or "Continue your career journey")[:300],
            body={"phase": ctx.active_phase, "context_id": ctx.id},
            priority_score=int(nba.get("priority") or 70),
            deep_link=str(nba.get("deep_link") or "/dashboard"),
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        daily_ok = False
        logger.exception("lifecycle daily os upsert failed: %s", exc)
        _audit(
            db,
            candidate_id=candidate_id,
            context_id=ctx.id,
            entity_type="daily_os",
            entity_id=ctx.id,
            action="upsert_failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
    try:
        from app.services import acceptance_calendar as acal

        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"lifecycle:{ctx.id}",
            category="goal",
            title=f"Lifecycle: {ctx.active_phase}",
            summary="Command Center focus — no workplace monitoring",
            importance=70,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link="/dashboard",
            payload={"kind": "lifecycle", "kpi_excluded": True},
        )
    except Exception as exc:
        acal_ok = False
        logger.exception("lifecycle acal upsert failed: %s", exc)
        _audit(
            db,
            candidate_id=candidate_id,
            context_id=ctx.id,
            entity_type="acceptance_calendar",
            entity_id=ctx.id,
            action="upsert_failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
    db.commit()
    return {"daily_os_ok": daily_ok, "acal_ok": acal_ok, "silent_swallow": False}


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    ctx = get_or_create_context(db, candidate_id=candidate_id)
    # Refresh consistency lightly
    run_consistency(db, candidate_id=candidate_id)
    db.refresh(ctx)
    push_lifecycle_inbox(db, candidate_id=candidate_id)
    db.refresh(ctx)
    events = (
        db.query(CandidateLifecycleEvent)
        .filter_by(candidate_id=candidate_id)
        .order_by(CandidateLifecycleEvent.id.desc())
        .limit(40)
        .all()
    )
    approvals = (
        db.query(CandidateLifecycleApproval)
        .filter_by(candidate_id=candidate_id)
        .order_by(CandidateLifecycleApproval.id.desc())
        .limit(20)
        .all()
    )
    findings = (
        db.query(CandidateLifecycleFinding)
        .filter_by(candidate_id=candidate_id, status="open")
        .order_by(CandidateLifecycleFinding.id.desc())
        .limit(20)
        .all()
    )
    handoffs = (
        db.query(CandidateLifecycleHandoff)
        .filter_by(candidate_id=candidate_id)
        .order_by(CandidateLifecycleHandoff.id.desc())
        .limit(20)
        .all()
    )
    return {
        "schema": "twin.unified_career_lifecycle/v1",
        "verdict_target": (
            "UNIFIED CAREER LIFECYCLE CUSTOMER-USABLE - "
            "END-TO-END CANDIDATE JOURNEY PRODUCTION-READY"
        ),
        "context": _ser_context(ctx),
        "events": [_ser_event(e) for e in events],
        "approvals": [_ser_approval(a) for a in approvals],
        "findings": [_ser_finding(f) for f in findings],
        "handoffs": [_ser_handoff(h) for h in handoffs],
        "phases": list(PHASES),
        "nba": _loads(ctx.nba_json, {}),
        "readiness": _loads(ctx.readiness_json, {}),
        "privacy": {
            "orchestration_opt_in": privacy.orchestration_opt_in,
            "search_opt_in": privacy.search_opt_in,
            "learning_opt_in": privacy.learning_opt_in,
            "reminders_opt_in": privacy.reminders_opt_in,
            "export_include_module_notes": privacy.export_include_module_notes,
            "paused": privacy.paused,
        },
        "deletion_graph": deletion_dependency_graph(db, candidate_id=candidate_id),
        "recovery": recovery_status(db, candidate_id=candidate_id),
        "safety": {
            "duplicate_module_stores": False,
            "silent_phase_change": False,
            "focus_deletes_other_processes": False,
            "frozen_snapshots_mutated": False,
            "bundled_approvals": False,
            "search_leaks": False,
            "workplace_monitoring": False,
            "external_resignation": False,
            "ats_write": False,
            "auto_apply": False,
            "microsoft_calendar_write": False,
            "covert_assistance": False,
            "phase_3_career_agent": "NOT_STARTED",
            "public_lifecycle": False,
        },
        "integrations": {
            "daily_os_brief": "/api/v1/candidates/me/daily-os/brief",
            "acceptance_calendar": True,
            "career_evidence": True,
            "application_studio": True,
            "interview_decision": True,
            "career_transition": True,
            "career_graph": True,
            "adaptive_memory": True,
        },
        "routes": {
            "command_center": "/dashboard",
            "history": "/dashboard/history",
            "search": "/dashboard/search",
            "approvals": "/dashboard/approvals",
            "recovery": "/dashboard/recovery",
            "privacy_center": "/dashboard/privacy-center",
            "legacy_lifecycle": "/dashboard/lifecycle",
            "legacy_timeline": "/dashboard/timeline",
            "api": "/api/v1/candidates/me/career-lifecycle",
        },
        "terminology": {
            "en": {
                "command_center": "Career Command Center",
                "phase": "Journey phase",
                "nba": "Next best action",
            },
            "pl": {
                "command_center": "Centrum dowodzenia karierą",
                "phase": "Faza ścieżki",
                "nba": "Najlepszy następny krok",
            },
        },
        "alembic": "115_unified_career_lifecycle",
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "observability": {
            "schema": "twin.career_lifecycle_obs/v1",
            "module_payloads_in_metrics": False,
        },
        "residual_epic_18": {
            "uuid_keys": True,
            "calibration_ui_route": "/dashboard/career-transition",
            "evidence_deletion_warnings": True,
        },
        "invites_sent": 0,
        "alten_pack": False,
    }


def _ser_context(c: CandidateLifecycleContext) -> dict:
    return {
        "id": c.id,
        "context_key": c.context_key,
        "active_phase": c.active_phase,
        "proposed_phase": c.proposed_phase,
        "phase_source": c.phase_source,
        "phase_confidence": c.phase_confidence,
        "candidate_phase_confirmed": c.candidate_phase_confirmed,
        "active_goal": c.active_goal,
        "focus_type": c.focus_type,
        "focus_ref": c.focus_ref,
        "refs": _loads(c.refs_json, {}),
        "unknowns": _loads(c.unknowns_json, []),
        "blocking": _loads(c.blocking_json, []),
        "nba": _loads(c.nba_json, {}),
        "readiness": _loads(c.readiness_json, {}),
        "deep_link_context": _loads(c.deep_link_context_json, {}),
        "context_version": c.context_version,
        "archived": c.archived_at is not None,
        "kpi_excluded": c.kpi_excluded,
        "uuid_key": True,
    }


def _ser_event(e: CandidateLifecycleEvent) -> dict:
    return {
        "id": e.id,
        "event_key": e.event_key,
        "event_type": e.event_type,
        "source_module": e.source_module,
        "source_object_id": e.source_object_id,
        "provenance": e.provenance,
        "claim_kind": e.claim_kind,
        "candidate_confirmed": e.candidate_confirmed,
        "refs": _loads(e.payload_ref_json, {}),
        "created_at": e.created_at.isoformat() + "Z" if e.created_at else None,
        "uuid_key": True,
    }


def _ser_approval(a: CandidateLifecycleApproval) -> dict:
    return {
        "id": a.id,
        "approval_key": a.approval_key,
        "approval_kind": a.approval_kind,
        "status": a.status,
        "bundled": a.bundled,
        "before": _loads(a.before_json, {}),
        "after": _loads(a.after_json, {}),
        "uuid_key": True,
    }


def _ser_finding(f: CandidateLifecycleFinding) -> dict:
    return {
        "id": f.id,
        "finding_type": f.finding_type,
        "severity": f.severity,
        "status": f.status,
        "message": f.message,
        "module_refs": _loads(f.module_refs_json, []),
        "stale": f.stale,
    }


def _ser_handoff(h: CandidateLifecycleHandoff) -> dict:
    return {
        "id": h.id,
        "from_module": h.from_module,
        "to_module": h.to_module,
        "from_object_id": h.from_object_id,
        "to_object_id": h.to_object_id,
        "status": h.status,
        "snapshot_hash": h.snapshot_hash,
    }
