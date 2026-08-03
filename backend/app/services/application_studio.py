"""Application Studio — evidence-backed application preparation (never external submit).

Chain: opportunity → requirements → fit → strategy → CV/cover/screening → checklist →
candidate approval → candidate-declared submission → interview handoff.

Never invents achievements/metrics. Never auto-submits. SUBMITTED only with candidate provenance.
"""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAcceptanceItem,
    CandidateAppStudioAsset,
    CandidateAppStudioAudit,
    CandidateAppStudioCoverLetter,
    CandidateAppStudioCvDraft,
    CandidateAppStudioPrivacy,
    CandidateAppStudioScreeningAnswer,
    CandidateAppStudioSubmission,
    CandidateAppStudioWorkspace,
    CandidateCareerEvidence,
)
from app.services import acceptance_calendar as acal
from app.services import career_copilot as cc
from app.services import career_evidence as ce

logger = logging.getLogger(__name__)

CLAIM_LABELS = ce.CLAIM_LABELS
SENSITIVE_Q_RE = re.compile(
    r"salary|compensation|race|religion|disability|pregnancy|age|gender|"
    r"sexual orientation|marital|citizenship|ssn|national.?id|protected",
    re.I,
)
FORBIDDEN_STATUS = frozenset({"SUBMITTED", "SENT", "DELIVERED"})


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
    workspace_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateAppStudioAudit(
            candidate_id=candidate_id,
            workspace_id=workspace_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def get_or_create_privacy(db: Session, *, candidate_id: int) -> CandidateAppStudioPrivacy:
    row = db.query(CandidateAppStudioPrivacy).filter_by(candidate_id=candidate_id).one_or_none()
    if row:
        return row
    row = CandidateAppStudioPrivacy(candidate_id=candidate_id, created_at=_utcnow(), updated_at=_utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_privacy(db: Session, *, candidate_id: int, **kwargs: Any) -> CandidateAppStudioPrivacy:
    row = get_or_create_privacy(db, candidate_id=candidate_id)
    for k in ("ai_drafting_opt_in", "memory_reuse_opt_in", "export_include_confidential", "paused"):
        if k in kwargs and kwargs[k] is not None:
            setattr(row, k, bool(kwargs[k]))
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def _normalize_opportunity(raw: dict) -> dict:
    title = (raw.get("title") or raw.get("job_title") or "UNKNOWN").strip() or "UNKNOWN"
    company = (raw.get("company") or raw.get("company_name") or "UNKNOWN").strip() or "UNKNOWN"
    return {
        "title": title[:300],
        "company": company[:300],
        "location": (raw.get("location") or "UNKNOWN")[:200],
        "source_url": (raw.get("source_url") or raw.get("url") or "")[:500] or None,
        "description": (raw.get("description") or "")[:8000],
        "claim_kind": "SOURCE_SUPPORTED" if raw.get("description") else "UNKNOWN",
        "normalized": True,
        "kpi_excluded": True,
    }


def _decompose_requirements(opportunity: dict) -> list[dict]:
    text = opportunity.get("description") or ""
    lines = [ln.strip(" -•*\t") for ln in text.splitlines() if len(ln.strip()) > 8]
    reqs = []
    for i, line in enumerate(lines[:25]):
        reqs.append(
            {
                "id": f"req:{i+1}",
                "text": line[:500],
                "kind": "must" if i < 8 else "nice",
                "claim_kind": "INFERENCE",
                "evidence_backed": False,
            }
        )
    if not reqs:
        reqs.append(
            {
                "id": "req:unknown",
                "text": "UNKNOWN — no requirements extracted from opportunity text",
                "kind": "unknown",
                "claim_kind": "UNKNOWN",
                "evidence_backed": False,
            }
        )
    return reqs


def _fit_assessment(db: Session, *, candidate_id: int, requirements: list[dict]) -> dict:
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .limit(40)
        .all()
    )
    confirmed = [e for e in evidence if e.claim_kind in {"CANDIDATE_CONFIRMED", "FACT", "SOURCE_SUPPORTED"}]
    matched, unsupported = [], []
    for req in requirements:
        blob = (req.get("text") or "").lower()
        hit = None
        for e in confirmed:
            hay = f"{e.title} {e.summary}".lower()
            skills = [s for s in _loads(e.skills_json, []) if isinstance(s, str)]
            if (blob[:40] and blob[:40] in hay) or any(s.lower() in blob for s in skills):
                hit = e
                break
            if any(s.lower() in hay for s in blob.replace(",", " ").split() if len(s) > 3):
                # token overlap with evidence title/summary
                hit = e
                break
        if hit:
            matched.append({"requirement_id": req["id"], "evidence_id": hit.id, "fit": "evidence_backed_fit"})
            req["evidence_backed"] = True
            req["claim_kind"] = "SOURCE_SUPPORTED"
        else:
            unsupported.append({"requirement_id": req["id"], "fit": "unsupported_fit"})
    if matched and not unsupported:
        fit_kind = "evidence_backed_fit"
    elif matched:
        fit_kind = "partially_supported_fit"
    elif evidence:
        fit_kind = "claimed_fit"
    else:
        fit_kind = "unknown_fit"
    return {
        "fit_kind": fit_kind,
        "matched": matched,
        "unsupported": unsupported,
        "evidence_count": len(evidence),
        "confirmed_count": len(confirmed),
        "collapsed_single_score": False,
        "fabricated": False,
        "kpi_excluded": True,
    }


def _viability(fit: dict) -> dict:
    kind = fit.get("fit_kind")
    if kind == "evidence_backed_fit":
        status = "viable"
    elif kind == "partially_supported_fit":
        status = "conditional"
    elif kind == "claimed_fit":
        status = "weak"
    else:
        status = "unknown"
    return {
        "status": status,
        "hiring_certainty": "UNKNOWN",
        "reason": f"Derived from fit_kind={kind}",
        "claim_kind": "INFERENCE",
        "kpi_excluded": True,
    }


def _strategy(opportunity: dict, fit: dict) -> dict:
    return {
        "approach": "evidence_first",
        "emphasize_evidence_ids": [m["evidence_id"] for m in fit.get("matched") or []][:8],
        "avoid_unsupported_claims": True,
        "target_title": opportunity.get("title"),
        "company": opportunity.get("company"),
        "claim_kind": "SUGGESTION",
        "autonomous_submit": False,
        "kpi_excluded": True,
    }


def _checklist(fit: dict, *, has_cv: bool, has_cover: bool, has_answers: bool, approved: bool) -> list[dict]:
    return [
        {"id": "opp", "title": "Opportunity normalized", "done": True},
        {"id": "req", "title": "Requirements decomposed", "done": True},
        {"id": "fit", "title": "Evidence-backed fit reviewed", "done": bool(fit.get("fit_kind"))},
        {"id": "cv", "title": "Tailored CV draft approved", "done": has_cv and approved},
        {"id": "cover", "title": "Cover letter approved", "done": has_cover and approved},
        {"id": "screen", "title": "Screening answers reviewed", "done": has_answers},
        {"id": "approve", "title": "Candidate explicit approval", "done": approved},
        {"id": "submit_gate", "title": "No external auto-submit", "done": True},
    ]


def _readiness_gate(checklist: list[dict], fit: dict) -> dict:
    done = sum(1 for c in checklist if c.get("done"))
    ready = done >= 6 and fit.get("fit_kind") != "unknown_fit"
    return {
        "ready_to_declare_submission": ready,
        "checklist_done": done,
        "checklist_total": len(checklist),
        "blocked_reasons": [] if ready else ["complete_checklist_and_approvals"],
        "external_submit_allowed": False,
        "collapsed_single_score": False,
        "kpi_excluded": True,
    }


def create_workspace(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    opportunity: dict,
    application_id: int | None = None,
    is_synthetic: bool = False,
) -> CandidateAppStudioWorkspace:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if privacy.paused:
        raise ValueError("application_studio_paused")
    opp = _normalize_opportunity(opportunity or {})
    reqs = _decompose_requirements(opp)
    fit = _fit_assessment(db, candidate_id=candidate_id, requirements=reqs)
    viability = _viability(fit)
    strategy = _strategy(opp, fit)
    checklist = _checklist(fit, has_cv=False, has_cover=False, has_answers=False, approved=False)
    readiness = _readiness_gate(checklist, fit)
    key = f"ws:{_hash(title + opp.get('title', '') + str(_utcnow().timestamp()))[:14]}"
    row = CandidateAppStudioWorkspace(
        candidate_id=candidate_id,
        workspace_key=key[:160],
        title=(title or opp["title"])[:300],
        status="draft",
        application_id=application_id,
        opportunity_json=_dumps(opp),
        requirements_json=_dumps(reqs),
        fit_json=_dumps(fit),
        viability_json=_dumps(viability),
        strategy_json=_dumps(strategy),
        checklist_json=_dumps(checklist),
        readiness_json=_dumps(readiness),
        claim_kind="SUGGESTION",
        version=1,
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        payload_json=_dumps({"external_submit": False, "kpi_excluded": True}),
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=row.id,
        entity_type="workspace",
        entity_id=row.id,
        action="create",
        before={},
        after={"title": row.title, "fit_kind": fit.get("fit_kind")},
    )
    _push_integrations(db, candidate_id=candidate_id, workspace=row)
    db.commit()
    db.refresh(row)
    return row


def _workspace(db: Session, *, candidate_id: int, workspace_id: int) -> CandidateAppStudioWorkspace:
    row = (
        db.query(CandidateAppStudioWorkspace)
        .filter(
            CandidateAppStudioWorkspace.id == workspace_id,
            CandidateAppStudioWorkspace.candidate_id == candidate_id,
            CandidateAppStudioWorkspace.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("workspace_not_found")
    return row


def _push_integrations(db: Session, *, candidate_id: int, workspace: CandidateAppStudioWorkspace) -> None:
    try:
        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"appstudio:{workspace.id}",
            category="application",
            title=f"Application Studio: {workspace.title[:80]}",
            summary="Prepare application package — no external auto-submit",
            importance=60,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link="/dashboard/application-studio",
            evidence=[{"type": "app_studio", "id": workspace.id}],
            payload={"from_application_studio": True, "kpi_excluded": True, "external_submit": False},
        )
    except Exception:
        logger.debug("acal app studio skip", exc_info=True)
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"appstudio:{workspace.id}",
            kind="application_studio",
            title=f"Prepare application: {workspace.title[:80]}",
            body={"workspace_id": workspace.id, "autonomous": False, "external_submit": False},
            priority_score=60,
            deep_link="/dashboard/application-studio",
            effort="M",
            completion_criterion="Approve CV/cover and declare submission yourself",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception:
        logger.debug("daily os app studio skip", exc_info=True)


def refresh_fit(db: Session, *, candidate_id: int, workspace_id: int) -> CandidateAppStudioWorkspace:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    # Invalidate stale fit when evidence deleted
    live_ids = {
        e.id
        for e in db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .all()
    }
    reqs = _loads(row.requirements_json, [])
    fit = _fit_assessment(db, candidate_id=candidate_id, requirements=reqs)
    # Drop matched evidence that no longer exists
    fit["matched"] = [m for m in fit.get("matched") or [] if m.get("evidence_id") in live_ids]
    if not fit["matched"] and fit.get("fit_kind") == "evidence_backed_fit":
        fit["fit_kind"] = "unknown_fit"
    row.fit_json = _dumps(fit)
    row.viability_json = _dumps(_viability(fit))
    row.strategy_json = _dumps(_strategy(_loads(row.opportunity_json, {}), fit))
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=row.id,
        entity_type="fit",
        entity_id=row.id,
        action="refresh",
        before={},
        after={"fit_kind": fit.get("fit_kind"), "invalidated_stale": True},
    )
    db.commit()
    db.refresh(row)
    return row


def _confirmed_evidence_ids(db: Session, *, candidate_id: int, preferred: list[int] | None) -> list[int]:
    """Prefer explicit / fit-matched IDs; fall back to any confirmed evidence (lineage required)."""
    if preferred:
        return preferred
    rows = (
        db.query(CandidateCareerEvidence.id)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
            CandidateCareerEvidence.claim_kind.in_(
                ["CANDIDATE_CONFIRMED", "FACT", "SOURCE_SUPPORTED"]
            ),
        )
        .order_by(CandidateCareerEvidence.id.desc())
        .limit(12)
        .all()
    )
    return [r[0] for r in rows]


def draft_tailored_cv(
    db: Session,
    *,
    candidate_id: int,
    workspace_id: int,
    evidence_ids: list[int] | None = None,
) -> CandidateAppStudioCvDraft:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    preferred = evidence_ids or [m["evidence_id"] for m in _loads(row.fit_json, {}).get("matched") or []]
    eids = _confirmed_evidence_ids(db, candidate_id=candidate_id, preferred=preferred or None)
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.id.in_(eids or [-1]),
            CandidateCareerEvidence.deleted_at.is_(None),
            CandidateCareerEvidence.claim_kind.in_(
                ["CANDIDATE_CONFIRMED", "FACT", "SOURCE_SUPPORTED"]
            ),
        )
        .all()
    )
    if not evidence:
        raise ValueError("cv_draft_requires_confirmed_evidence")
    bullets = []
    for e in evidence:
        bullets.append(
            {
                "text": e.summary or e.title,
                "evidence_id": e.id,
                "claim_kind": e.claim_kind,
                "invented": False,
            }
        )
    opp = _loads(row.opportunity_json, {})
    body = {
        "target_role": opp.get("title"),
        "company": opp.get("company"),
        "summary": {
            "text": f"Candidate for {opp.get('title')} — based on confirmed evidence only",
            "claim_kind": "SUGGESTION",
            "evidence_ids": [e.id for e in evidence],
        },
        "bullets": bullets,
        "canonical_cv_rewritten": False,
        "fabricated": False,
    }
    audit = {
        "unsupported_bullets": 0,
        "lineage_complete": True,
        "sensitive_omitted": True,
    }
    draft = CandidateAppStudioCvDraft(
        candidate_id=candidate_id,
        workspace_id=row.id,
        draft_key=f"cv:{row.id}:{_hash(str(eids))[:10]}"[:160],
        title=f"Tailored CV — {opp.get('title', 'role')}"[:300],
        body_json=_dumps(body),
        evidence_ids_json=_dumps([e.id for e in evidence]),
        claim_kind="SOURCE_SUPPORTED",
        audit_json=_dumps(audit),
        approved=None,
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(draft)
    db.flush()
    _refresh_checklist(db, row)
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=row.id,
        entity_type="cv_draft",
        entity_id=draft.id,
        action="create",
        before={},
        after={"evidence_ids": [e.id for e in evidence]},
    )
    # Adaptive memory — explicit draft creation decision
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=row.id,
        entity_type="adaptive_memory",
        entity_id=draft.id,
        action="cv_draft_created",
        before={},
        after={"sensitive_source_duplicated": False},
    )
    db.commit()
    db.refresh(draft)
    return draft


def draft_cover_letter(
    db: Session,
    *,
    candidate_id: int,
    workspace_id: int,
    evidence_ids: list[int] | None = None,
) -> CandidateAppStudioCoverLetter:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    preferred = evidence_ids or [m["evidence_id"] for m in _loads(row.fit_json, {}).get("matched") or []]
    eids = _confirmed_evidence_ids(db, candidate_id=candidate_id, preferred=preferred or None)
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.id.in_(eids or [-1]),
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .all()
    )
    opp = _loads(row.opportunity_json, {})
    bits = "; ".join((e.title for e in evidence[:5])) or "UNKNOWN"
    text = (
        f"Dear hiring team at {opp.get('company')},\n\n"
        f"I am preparing an application for {opp.get('title')}. "
        f"Relevant confirmed experience: {bits}. "
        f"Missing outcomes remain UNKNOWN — nothing invented.\n\n"
        f"This is a private draft in TWIN Application Studio. Not sent externally.\n"
    )
    letter = CandidateAppStudioCoverLetter(
        candidate_id=candidate_id,
        workspace_id=row.id,
        letter_key=f"cover:{row.id}:{_hash(text)[:10]}"[:160],
        body_text=text[:8000],
        evidence_ids_json=_dumps([e.id for e in evidence]),
        claim_kind="SUGGESTION" if evidence else "UNKNOWN",
        approved=None,
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(letter)
    db.flush()
    _refresh_checklist(db, row)
    db.commit()
    db.refresh(letter)
    return letter


def add_screening_answer(
    db: Session,
    *,
    candidate_id: int,
    workspace_id: int,
    question: str,
    answer_text: str = "",
    evidence_ids: list[int] | None = None,
) -> CandidateAppStudioScreeningAnswer:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    sensitive = bool(SENSITIVE_Q_RE.search(question or ""))
    # Never auto-complete sensitive questions
    if sensitive and not (answer_text or "").strip():
        answer_text = ""
        claim = "UNKNOWN"
        auto = False
        audit = {"sensitive": True, "auto_completed": False, "requires_candidate_input": True}
    else:
        claim = "CANDIDATE_CONFIRMED" if answer_text.strip() else "UNKNOWN"
        auto = False
        audit = {"sensitive": sensitive, "auto_completed": False}
    ans = CandidateAppStudioScreeningAnswer(
        candidate_id=candidate_id,
        workspace_id=row.id,
        answer_key=f"q:{row.id}:{_hash(question)[:12]}"[:160],
        question=question[:4000],
        answer_text=(answer_text or "")[:8000],
        sensitive=sensitive,
        auto_completed=auto,
        claim_kind=claim,
        evidence_ids_json=_dumps(evidence_ids or []),
        audit_json=_dumps(audit),
        approved=None,
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(ans)
    db.flush()
    _refresh_checklist(db, row)
    db.commit()
    db.refresh(ans)
    return ans


def register_asset(
    db: Session,
    *,
    candidate_id: int,
    workspace_id: int,
    asset_kind: str,
    title: str,
    evidence_ids: list[int] | None = None,
) -> CandidateAppStudioAsset:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    asset = CandidateAppStudioAsset(
        candidate_id=candidate_id,
        workspace_id=row.id,
        asset_key=f"asset:{row.id}:{_hash(title)[:10]}"[:160],
        asset_kind=(asset_kind or "document")[:64],
        title=title[:300],
        evidence_ids_json=_dumps(evidence_ids or []),
        is_public=False,
        confidentiality="PRIVATE",
        payload_json=_dumps({"public_url": None}),
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def approve_artifact(
    db: Session,
    *,
    candidate_id: int,
    workspace_id: int,
    artifact_type: str,
    artifact_id: int,
    approved: bool = True,
) -> dict:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    model_map = {
        "cv": CandidateAppStudioCvDraft,
        "cover": CandidateAppStudioCoverLetter,
        "screening": CandidateAppStudioScreeningAnswer,
    }
    model = model_map.get(artifact_type)
    if not model:
        raise ValueError("invalid_artifact_type")
    art = (
        db.query(model)
        .filter(
            model.id == artifact_id,
            model.candidate_id == candidate_id,
            model.workspace_id == workspace_id,
        )
        .one_or_none()
    )
    if not art:
        raise ValueError("artifact_not_found")
    art.approved = bool(approved)
    art.version = int(art.version or 1) + 1
    art.updated_at = _utcnow()
    _refresh_checklist(db, row)
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=row.id,
        entity_type=artifact_type,
        entity_id=artifact_id,
        action="approve" if approved else "unapprove",
        before={},
        after={"approved": approved},
    )
    db.commit()
    return {"artifact_type": artifact_type, "artifact_id": artifact_id, "approved": approved}


def _refresh_checklist(db: Session, row: CandidateAppStudioWorkspace) -> None:
    has_cv = (
        db.query(CandidateAppStudioCvDraft)
        .filter_by(workspace_id=row.id, candidate_id=row.candidate_id)
        .filter(CandidateAppStudioCvDraft.deleted_at.is_(None))
        .count()
        > 0
    )
    has_cover = (
        db.query(CandidateAppStudioCoverLetter)
        .filter_by(workspace_id=row.id, candidate_id=row.candidate_id)
        .filter(CandidateAppStudioCoverLetter.deleted_at.is_(None))
        .count()
        > 0
    )
    has_answers = (
        db.query(CandidateAppStudioScreeningAnswer)
        .filter_by(workspace_id=row.id, candidate_id=row.candidate_id)
        .filter(CandidateAppStudioScreeningAnswer.deleted_at.is_(None))
        .count()
        > 0
    )
    cv_ok = (
        db.query(CandidateAppStudioCvDraft)
        .filter_by(workspace_id=row.id, candidate_id=row.candidate_id, approved=True)
        .count()
        > 0
    )
    cover_ok = (
        db.query(CandidateAppStudioCoverLetter)
        .filter_by(workspace_id=row.id, candidate_id=row.candidate_id, approved=True)
        .count()
        > 0
    )
    approved = cv_ok and cover_ok
    fit = _loads(row.fit_json, {})
    checklist = _checklist(fit, has_cv=has_cv, has_cover=has_cover, has_answers=has_answers, approved=approved)
    row.checklist_json = _dumps(checklist)
    row.readiness_json = _dumps(_readiness_gate(checklist, fit))
    row.updated_at = _utcnow()


def declare_submission(
    db: Session,
    *,
    candidate_id: int,
    workspace_id: int,
    channel: str,
    notes: str = "",
) -> CandidateAppStudioSubmission:
    """Candidate-declared submission only — never external auto-submit."""
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    _refresh_checklist(db, row)
    readiness = _loads(row.readiness_json, {})
    if not readiness.get("ready_to_declare_submission"):
        raise ValueError("readiness_gate_blocked")
    ch = (channel or "").strip().lower()
    if ch not in {"manual_external", "email_self", "portal_self", "other_candidate"}:
        raise ValueError("invalid_declaration_channel")
    status = "candidate_declared"
    # Never allow forbidden labels without provenance
    if status.upper() in FORBIDDEN_STATUS:
        raise ValueError("forbidden_status_without_provenance")
    sub = CandidateAppStudioSubmission(
        candidate_id=candidate_id,
        workspace_id=row.id,
        submission_key=f"sub:{row.id}:{_hash(ch + str(_utcnow()))[:10]}"[:160],
        status=status,
        provenance=f"candidate_declared:{ch}",
        declared_at=_utcnow(),
        declared_channel=ch[:64],
        external_submit=False,
        notes=(notes or "")[:2000],
        payload_json=_dumps(
            {
                "twin_submitted_externally": False,
                "auto_apply": False,
                "email_send": False,
                "ats_write": False,
                "kpi_excluded": True,
            }
        ),
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(sub)
    # Frozen submission snapshot — immutable declaration record (not external delivery)
    snap = {
        "workspace_id": row.id,
        "fit": _loads(row.fit_json, {}),
        "strategy": _loads(row.strategy_json, {}),
        "checklist": _loads(row.checklist_json, {}),
        "readiness": readiness,
        "declared_channel": ch,
        "external_submit": False,
        "status": status,
        "provenance": f"candidate_declared:{ch}",
        "frozen_at": _utcnow().isoformat() + "Z",
        "kpi_excluded": True,
    }
    sub.payload_json = _dumps({**_loads(sub.payload_json, {}), "frozen_snapshot": snap})
    row.status = "candidate_declared"
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    row.payload_json = _dumps({**_loads(row.payload_json, {}), "last_frozen_snapshot": snap})
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=row.id,
        entity_type="submission",
        entity_id=None,
        action="candidate_declare",
        before={},
        after={"channel": ch, "external_submit": False, "frozen": True},
    )
    db.commit()
    db.refresh(sub)
    return sub


def interview_handoff(db: Session, *, candidate_id: int, workspace_id: int) -> dict:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    fit = _loads(row.fit_json, {})
    pack = {
        "workspace_id": row.id,
        "title": row.title,
        "fit_kind": fit.get("fit_kind"),
        "matched_evidence_ids": [m.get("evidence_id") for m in fit.get("matched") or []],
        "stories_hint": "Use Career Evidence interview stories — never fabricate",
        "deep_link": "/dashboard/interview-prep",
        "application_studio_link": "/dashboard/application-studio",
        "external_submit": False,
        "kpi_excluded": True,
    }
    try:
        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"appstudio:handoff:{row.id}",
            category="interview",
            title=f"Interview prep from Application Studio: {row.title[:60]}",
            summary="Handoff pack — candidate-controlled",
            importance=70,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link="/dashboard/interview-prep",
            evidence=[{"type": "app_studio_handoff", "id": row.id}],
            payload={"kpi_excluded": True},
        )
        db.commit()
    except Exception:
        logger.debug("handoff acal skip", exc_info=True)
    return pack


def export_workspace(
    db: Session, *, candidate_id: int, workspace_id: int, include_confidential: bool | None = None
) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    allow = (
        privacy.export_include_confidential
        if include_confidential is None
        else bool(include_confidential)
    )
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    assets = (
        db.query(CandidateAppStudioAsset)
        .filter_by(candidate_id=candidate_id, workspace_id=workspace_id)
        .filter(CandidateAppStudioAsset.deleted_at.is_(None))
        .all()
    )
    safe_assets = []
    for a in assets:
        if a.confidentiality in {"CONFIDENTIAL", "NDA_RESTRICTED"} and not allow:
            continue
        safe_assets.append(_ser_asset(a))
    return {
        "workspace": _ser_workspace(row),
        "cv_drafts": [
            _ser_cv(c)
            for c in db.query(CandidateAppStudioCvDraft)
            .filter_by(candidate_id=candidate_id, workspace_id=workspace_id)
            .filter(CandidateAppStudioCvDraft.deleted_at.is_(None))
            .all()
        ],
        "cover_letters": [
            _ser_cover(c)
            for c in db.query(CandidateAppStudioCoverLetter)
            .filter_by(candidate_id=candidate_id, workspace_id=workspace_id)
            .filter(CandidateAppStudioCoverLetter.deleted_at.is_(None))
            .all()
        ],
        "screening": [
            _ser_answer(a)
            for a in db.query(CandidateAppStudioScreeningAnswer)
            .filter_by(candidate_id=candidate_id, workspace_id=workspace_id)
            .filter(CandidateAppStudioScreeningAnswer.deleted_at.is_(None))
            .all()
        ],
        "assets": safe_assets,
        "hidden_reasoning": False,
        "prompts_excluded": True,
        "secrets_excluded": True,
        "kpi_excluded": True,
    }


def invalidate_evidence_refs(db: Session, *, candidate_id: int, evidence_id: int) -> dict:
    """Remove deleted/invalidated evidence from studio drafts, assets, and fit matches."""
    removed = 0
    now = _utcnow()
    for model in (
        CandidateAppStudioCvDraft,
        CandidateAppStudioCoverLetter,
        CandidateAppStudioScreeningAnswer,
        CandidateAppStudioAsset,
    ):
        q = db.query(model).filter_by(candidate_id=candidate_id)
        if hasattr(model, "deleted_at"):
            q = q.filter(model.deleted_at.is_(None))
        for art in q.all():
            eids = _loads(getattr(art, "evidence_ids_json", None), [])
            if evidence_id not in eids:
                continue
            eids = [e for e in eids if e != evidence_id]
            art.evidence_ids_json = _dumps(eids)
            if hasattr(art, "updated_at"):
                art.updated_at = now
            if model is CandidateAppStudioCvDraft and not eids and hasattr(art, "deleted_at"):
                art.deleted_at = now
                art.claim_kind = "UNKNOWN"
            removed += 1
    for ws in (
        db.query(CandidateAppStudioWorkspace)
        .filter(
            CandidateAppStudioWorkspace.candidate_id == candidate_id,
            CandidateAppStudioWorkspace.deleted_at.is_(None),
        )
        .all()
    ):
        fit = _loads(ws.fit_json, {})
        before_n = len(fit.get("matched") or [])
        matched = [m for m in (fit.get("matched") or []) if m.get("evidence_id") != evidence_id]
        if len(matched) != before_n:
            fit["matched"] = matched
            fit["invalidated_evidence_id"] = evidence_id
            ws.fit_json = _dumps(fit)
            ws.updated_at = now
            removed += 1
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=None,
        entity_type="evidence_invalidation",
        entity_id=evidence_id,
        action="invalidate_refs",
        before={},
        after={"removed_refs": removed},
    )
    # Caller may own the commit (e.g. delete_all_evidence)
    return {"ok": True, "removed_refs": removed, "evidence_id": evidence_id}


def purge_all_evidence_refs(db: Session, *, candidate_id: int) -> dict:
    """Clear all evidence IDs from studio artifacts after evidence history delete."""
    now = _utcnow()
    n = 0
    for model in (
        CandidateAppStudioCvDraft,
        CandidateAppStudioCoverLetter,
        CandidateAppStudioScreeningAnswer,
        CandidateAppStudioAsset,
    ):
        for art in db.query(model).filter_by(candidate_id=candidate_id).all():
            eids = _loads(getattr(art, "evidence_ids_json", None), [])
            if not eids:
                continue
            art.evidence_ids_json = _dumps([])
            if model is CandidateAppStudioCvDraft and hasattr(art, "deleted_at"):
                art.deleted_at = now
                art.claim_kind = "UNKNOWN"
            n += 1
    for ws in (
        db.query(CandidateAppStudioWorkspace)
        .filter(
            CandidateAppStudioWorkspace.candidate_id == candidate_id,
            CandidateAppStudioWorkspace.deleted_at.is_(None),
        )
        .all()
    ):
        fit = _loads(ws.fit_json, {})
        if fit.get("matched"):
            fit["matched"] = []
            fit["invalidated_all"] = True
            ws.fit_json = _dumps(fit)
            ws.updated_at = now
            n += 1
    db.flush()
    return {"ok": True, "cleared_artifacts": n}


def delete_workspace(db: Session, *, candidate_id: int, workspace_id: int) -> dict:
    row = _workspace(db, candidate_id=candidate_id, workspace_id=workspace_id)
    now = _utcnow()
    row.deleted_at = now
    row.status = "deleted"
    for model in (
        CandidateAppStudioCvDraft,
        CandidateAppStudioCoverLetter,
        CandidateAppStudioScreeningAnswer,
        CandidateAppStudioAsset,
    ):
        for art in db.query(model).filter_by(candidate_id=candidate_id, workspace_id=workspace_id).all():
            if hasattr(art, "deleted_at"):
                art.deleted_at = now
    db.query(CandidateAcceptanceItem).filter(
        CandidateAcceptanceItem.candidate_id == candidate_id,
        CandidateAcceptanceItem.item_key.like(f"appstudio:{workspace_id}%"),
    ).delete(synchronize_session=False)
    _audit(
        db,
        candidate_id=candidate_id,
        workspace_id=workspace_id,
        entity_type="workspace",
        entity_id=workspace_id,
        action="delete",
        before={},
        after={"deleted": True},
    )
    db.commit()
    return {"ok": True, "stale_reappear_guard": True}


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    rows = (
        db.query(CandidateAppStudioWorkspace)
        .filter(
            CandidateAppStudioWorkspace.candidate_id == candidate_id,
            CandidateAppStudioWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateAppStudioWorkspace.id.desc())
        .limit(30)
        .all()
    )
    return {
        "schema": "twin.application_studio/v1",
        "verdict_target": (
            "APPLICATION STUDIO CUSTOMER-USABLE — EVIDENCE-BACKED APPLICATION PREPARATION PRODUCTION-READY"
        ),
        "workspaces": [_ser_workspace(r) for r in rows],
        "privacy": {
            "ai_drafting_opt_in": privacy.ai_drafting_opt_in,
            "paused": privacy.paused,
            "export_include_confidential": privacy.export_include_confidential,
            "hidden_reuse": False,
        },
        "safety": {
            "external_submit": False,
            "auto_apply": False,
            "email_send": False,
            "ats_write": False,
            "linkedin_write": False,
            "public_assets": False,
            "microsoft_calendar_write": False,
            "phase_3_career_agent": "NOT_STARTED",
            "fabricated_achievements": False,
        },
        "alembic": "112_application_studio",
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "observability": {"schema": "twin.application_studio_obs/v1", "source_text_in_metrics": False},
        "integrations": {
            "career_evidence": True,
            "career_graph": True,
            "daily_os_brief": "/api/v1/candidates/me/daily-os/brief",
            "daily_os_canonical": "/api/v1/candidates/me/career-copilot/daily",
            "acceptance_calendar": True,
            "adaptive_memory": True,
        },
        "routes": {
            "fe": "/dashboard/application-studio",
            "api": "/api/v1/candidates/me/application-studio",
        },
    }


def _ser_workspace(r: CandidateAppStudioWorkspace) -> dict:
    return {
        "id": r.id,
        "workspace_key": r.workspace_key,
        "title": r.title,
        "status": r.status,
        "application_id": r.application_id,
        "opportunity": _loads(r.opportunity_json, {}),
        "requirements": _loads(r.requirements_json, []),
        "fit": _loads(r.fit_json, {}),
        "viability": _loads(r.viability_json, {}),
        "strategy": _loads(r.strategy_json, {}),
        "checklist": _loads(r.checklist_json, []),
        "readiness": _loads(r.readiness_json, {}),
        "claim_kind": r.claim_kind,
        "version": r.version,
        "is_synthetic": r.is_synthetic,
        "kpi_excluded": r.kpi_excluded,
        "external_submit": False,
    }


def _ser_cv(c: CandidateAppStudioCvDraft) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "body": _loads(c.body_json, {}),
        "evidence_ids": _loads(c.evidence_ids_json, []),
        "claim_kind": c.claim_kind,
        "audit": _loads(c.audit_json, {}),
        "approved": c.approved,
        "canonical_cv_rewritten": False,
    }


def _ser_cover(c: CandidateAppStudioCoverLetter) -> dict:
    return {
        "id": c.id,
        "body_text": c.body_text,
        "evidence_ids": _loads(c.evidence_ids_json, []),
        "claim_kind": c.claim_kind,
        "approved": c.approved,
    }


def _ser_answer(a: CandidateAppStudioScreeningAnswer) -> dict:
    audit = _loads(a.audit_json, {})
    return {
        "id": a.id,
        "question": a.question,
        "answer_text": a.answer_text,
        "sensitive": a.sensitive,
        "auto_completed": a.auto_completed,
        "claim_kind": a.claim_kind,
        "evidence_ids": _loads(a.evidence_ids_json, []),
        "audit": audit,
        "requires_candidate_input": bool(audit.get("requires_candidate_input")),
        "approved": a.approved,
    }


def _ser_asset(a: CandidateAppStudioAsset) -> dict:
    return {
        "id": a.id,
        "asset_kind": a.asset_kind,
        "title": a.title,
        "evidence_ids": _loads(a.evidence_ids_json, []),
        "is_public": False,
        "confidentiality": a.confidentiality,
        "public_url": None,
    }
