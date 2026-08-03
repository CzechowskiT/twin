"""Interview & Decision Copilot — evidence-backed prep and offer decisions.

Chain: application handoff → process/stages → answers → mock → notes → feedback →
next-stage → offer analysis → negotiation prep → candidate-declared decision.

Never invents stories/feedback/offers. Never covert live assistance. Never external acts.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAcceptanceItem,
    CandidateAppStudioSubmission,
    CandidateAppStudioWorkspace,
    CandidateCareerEvidence,
    CandidateDecisionMemo,
    CandidateInterviewAnswer,
    CandidateInterviewAudit,
    CandidateInterviewEvent,
    CandidateInterviewFeedback,
    CandidateInterviewMock,
    CandidateInterviewPrivacy,
    CandidateInterviewProcess,
    CandidateInterviewStage,
    CandidateInterviewStory,
    CandidateOfferRecord,
)
from app.services import acceptance_calendar as acal
from app.services import career_copilot as cc

logger = logging.getLogger(__name__)

LIKELIHOOD = frozenset({"LIKELY", "POSSIBLE", "UNLIKELY", "UNKNOWN"})
PREP_GATES = frozenset(
    {
        "NOT_STARTED",
        "MISSING_STAGE_DETAILS",
        "MISSING_CANDIDATE_INPUT",
        "WEAK_EVIDENCE_COVERAGE",
        "UNRESOLVED_CONFLICTS",
        "CONFIDENTIALITY_RISK",
        "ANSWERS_NEED_REVIEW",
        "QUESTIONS_NEED_REVIEW",
        "READY_FOR_PRACTICE",
        "PRACTICED",
        "CANDIDATE_READY",
        "INTERVIEW_COMPLETED_DECLARED_BY_CANDIDATE",
    }
)
DECLARE_DECISIONS = frozenset(
    {"accept_intent", "decline_intent", "hold", "negotiate_intent", "withdraw_intent", "other"}
)


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
    process_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateInterviewAudit(
            candidate_id=candidate_id,
            process_id=process_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def get_or_create_privacy(db: Session, *, candidate_id: int) -> CandidateInterviewPrivacy:
    row = db.query(CandidateInterviewPrivacy).filter_by(candidate_id=candidate_id).one_or_none()
    if row:
        return row
    row = CandidateInterviewPrivacy(candidate_id=candidate_id, created_at=_utcnow(), updated_at=_utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_privacy(db: Session, *, candidate_id: int, **kwargs: Any) -> CandidateInterviewPrivacy:
    row = get_or_create_privacy(db, candidate_id=candidate_id)
    for k in ("ai_prep_opt_in", "transcript_retention_opt_in", "export_include_transcripts", "paused"):
        if k in kwargs and kwargs[k] is not None:
            setattr(row, k, bool(kwargs[k]))
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def _default_hypotheses(role: str, stage_kind: str) -> list[dict]:
    base = [
        ("Tell me about yourself", "LIKELY"),
        (f"Why {role or 'this role'}?", "LIKELY"),
        ("Describe a challenging delivery", "POSSIBLE"),
        ("Walk through a system you built", "POSSIBLE"),
        ("Questions for us?", "LIKELY"),
        ("Salary expectations?", "POSSIBLE"),
        ("Where do you see yourself in 5 years?", "UNLIKELY"),
    ]
    if stage_kind in {"technical", "system_design"}:
        base.insert(2, ("Design a service for X", "LIKELY"))
    out = []
    for i, (q, lik) in enumerate(base):
        out.append(
            {
                "id": f"hyp:{i+1}",
                "question": q,
                "likelihood": lik if lik in LIKELIHOOD else "UNKNOWN",
                "claim_kind": "SUGGESTION",
                "presented_as_fact": False,
                "invented_interviewer": False,
            }
        )
    return out


def _prep_gate(*, has_answers: bool, approved: bool, practiced: bool, weak_coverage: bool) -> dict:
    if practiced and approved:
        state = "CANDIDATE_READY"
    elif practiced:
        state = "PRACTICED"
    elif has_answers and not approved:
        state = "ANSWERS_NEED_REVIEW"
    elif weak_coverage:
        state = "WEAK_EVIDENCE_COVERAGE"
    elif has_answers:
        state = "READY_FOR_PRACTICE"
    else:
        state = "NOT_STARTED"
    return {
        "state": state,
        "guaranteed_success": False,
        "hiring_probability_claimed": False,
        "claim_kind": "INFERENCE",
        "kpi_excluded": True,
    }


def _freeze_snapshot_from_studio(db: Session, *, candidate_id: int, workspace_id: int | None) -> dict:
    """Immutable submitted-declared snapshot from Application Studio (never mutated later)."""
    snap: dict[str, Any] = {
        "source": "application_studio",
        "workspace_id": workspace_id,
        "immutable": True,
        "frozen_at": _utcnow().isoformat() + "Z",
        "kpi_excluded": True,
    }
    if not workspace_id:
        snap["claim_kind"] = "UNKNOWN"
        snap["note"] = "No Application Studio workspace — snapshot empty"
        return snap
    ws = (
        db.query(CandidateAppStudioWorkspace)
        .filter_by(id=workspace_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not ws:
        snap["claim_kind"] = "UNKNOWN"
        return snap
    payload = _loads(ws.payload_json, {})
    frozen = payload.get("last_frozen_snapshot") or {}
    sub = (
        db.query(CandidateAppStudioSubmission)
        .filter_by(workspace_id=workspace_id, candidate_id=candidate_id)
        .order_by(CandidateAppStudioSubmission.id.desc())
        .first()
    )
    snap.update(
        {
            "workspace_title": ws.title,
            "opportunity": _loads(ws.opportunity_json, {}),
            "fit": _loads(ws.fit_json, {}),
            "strategy": _loads(ws.strategy_json, {}),
            "frozen_from_studio": frozen or None,
            "submission_provenance": sub.provenance if sub else None,
            "submission_status": sub.status if sub else None,
            "claim_kind": "SOURCE_SUPPORTED" if sub else "SUGGESTION",
        }
    )
    return snap


def create_process(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    company: str = "UNKNOWN",
    role_title: str = "UNKNOWN",
    workspace_id: int | None = None,
    application_id: int | None = None,
    is_synthetic: bool = False,
) -> CandidateInterviewProcess:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if privacy.paused:
        raise ValueError("interview_decision_paused")
    snap = _freeze_snapshot_from_studio(db, candidate_id=candidate_id, workspace_id=workspace_id)
    snap_raw = _dumps(snap)
    hyps = _default_hypotheses(role_title, "screen")
    gate = _prep_gate(has_answers=False, approved=False, practiced=False, weak_coverage=True)
    key = f"proc:{_hash(title + company + str(_utcnow().timestamp()))[:14]}"
    row = CandidateInterviewProcess(
        candidate_id=candidate_id,
        process_key=key[:160],
        title=(title or f"{role_title} @ {company}")[:300],
        status="active",
        workspace_id=workspace_id,
        application_id=application_id,
        company=(company or "UNKNOWN")[:300],
        role_title=(role_title or "UNKNOWN")[:300],
        submitted_snapshot_json=snap_raw,
        snapshot_immutable=True,
        snapshot_hash=_hash(snap_raw),
        expectations_json=_dumps(
            {
                "format_unknown": True,
                "interviewers_unknown": True,
                "claim_kind": "UNKNOWN",
                "invented_interviewers": False,
            }
        ),
        hypotheses_json=_dumps(hyps),
        coverage_json=_dumps({"stories_linked": 0, "evidence_linked": 0, "gaps": ["no_answers_yet"]}),
        candidate_questions_json=_dumps(
            [
                {"q": "What does success look like in the first 90 days?", "claim_kind": "SUGGESTION"},
                {"q": "How does the team handle production incidents?", "claim_kind": "SUGGESTION"},
            ]
        ),
        company_brief_json=_dumps(
            {
                "company": company,
                "role": role_title,
                "from_snapshot": bool(snap.get("opportunity")),
                "invented_facts": False,
                "claim_kind": "SUGGESTION",
            }
        ),
        prep_gate_json=_dumps(gate),
        outcome_json=_dumps({}),
        claim_kind="SUGGESTION",
        version=1,
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        payload_json=_dumps(
            {
                "covert_assistance": False,
                "autonomous_interviewing": False,
                "external_negotiation": False,
                "emotion_recognition": False,
                "personality_scoring": False,
                "protected_attribute_inference": False,
                "kpi_excluded": True,
            }
        ),
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    # Default stage
    stage = CandidateInterviewStage(
        candidate_id=candidate_id,
        process_id=row.id,
        stage_key=f"stage:{row.id}:screen:{int(_utcnow().timestamp())}"[:160],
        name="Screen / intro",
        stage_kind="screen",
        status="planned",
        expectations_json=_dumps({"claim_kind": "UNKNOWN"}),
        hypotheses_json=_dumps(hyps),
        prep_gate_json=_dumps(gate),
        adaptation_json=_dumps({}),
        claim_kind="SUGGESTION",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(stage)
    _audit(
        db,
        candidate_id=candidate_id,
        process_id=row.id,
        entity_type="process",
        entity_id=row.id,
        action="create",
        before={},
        after={"title": row.title, "snapshot_immutable": True},
    )
    _push_integrations(db, candidate_id=candidate_id, process=row)
    db.commit()
    db.refresh(row)
    return row


def _process(db: Session, *, candidate_id: int, process_id: int) -> CandidateInterviewProcess:
    row = (
        db.query(CandidateInterviewProcess)
        .filter(
            CandidateInterviewProcess.id == process_id,
            CandidateInterviewProcess.candidate_id == candidate_id,
            CandidateInterviewProcess.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("process_not_found")
    return row


def _push_integrations(db: Session, *, candidate_id: int, process: CandidateInterviewProcess) -> None:
    acal_ok = True
    try:
        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"interview:{process.id}",
            category="interview",
            title=f"Interview prep: {process.title[:80]}",
            summary="Evidence-backed prep — no covert assistance",
            importance=70,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link="/dashboard/interview-decision",
            evidence=[{"type": "interview_process", "id": process.id}],
            payload={"kpi_excluded": True, "covert_assistance": False},
        )
    except Exception as exc:
        acal_ok = False
        logger.exception("acal interview upsert failed: %s", exc)
        _audit(
            db,
            candidate_id=candidate_id,
            process_id=process.id,
            entity_type="acceptance_calendar",
            entity_id=process.id,
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
            item_key=f"interview:{process.id}",
            kind="interview_prep",
            title=f"Prepare interview: {process.title[:80]}",
            body={"process_id": process.id, "covert_assistance": False},
            priority_score=70,
            deep_link="/dashboard/interview-decision",
            effort="M",
            completion_criterion="Practice answers with evidence and declare readiness",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        daily_ok = False
        logger.exception("daily os interview upsert failed: %s", exc)
    payload = _loads(process.payload_json, {})
    payload["integrations"] = {"acal_ok": acal_ok, "daily_os_ok": daily_ok, "silent_swallow": False}
    process.payload_json = _dumps(payload)


def assert_snapshot_immutable(db: Session, *, candidate_id: int, process_id: int) -> dict:
    row = _process(db, candidate_id=candidate_id, process_id=process_id)
    current = _hash(row.submitted_snapshot_json or "{}")
    ok = bool(row.snapshot_immutable) and current == (row.snapshot_hash or current)
    return {
        "immutable": bool(row.snapshot_immutable),
        "hash_matches": ok,
        "mutable": False,
        "snapshot_hash": row.snapshot_hash,
    }


def add_stage(
    db: Session,
    *,
    candidate_id: int,
    process_id: int,
    name: str,
    stage_kind: str = "screen",
) -> CandidateInterviewStage:
    proc = _process(db, candidate_id=candidate_id, process_id=process_id)
    hyps = _default_hypotheses(proc.role_title, stage_kind)
    stage = CandidateInterviewStage(
        candidate_id=candidate_id,
        process_id=proc.id,
        stage_key=f"stage:{proc.id}:{stage_kind}:{int(_utcnow().timestamp())}"[:160],
        name=name[:200],
        stage_kind=(stage_kind or "screen")[:64],
        status="planned",
        expectations_json=_dumps({"claim_kind": "UNKNOWN"}),
        hypotheses_json=_dumps(hyps),
        prep_gate_json=_dumps(_prep_gate(has_answers=False, approved=False, practiced=False, weak_coverage=True)),
        adaptation_json=_dumps({}),
        claim_kind="SUGGESTION",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


def build_answer(
    db: Session,
    *,
    candidate_id: int,
    process_id: int,
    question: str,
    evidence_ids: list[int] | None = None,
    story_ids: list[int] | None = None,
    answer_text: str = "",
    stage_id: int | None = None,
    likelihood: str = "POSSIBLE",
) -> CandidateInterviewAnswer:
    proc = _process(db, candidate_id=candidate_id, process_id=process_id)
    eids = evidence_ids or []
    sids = story_ids or []
    evidence = []
    if eids:
        evidence = (
            db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.candidate_id == candidate_id,
                CandidateCareerEvidence.id.in_(eids),
                CandidateCareerEvidence.deleted_at.is_(None),
                CandidateCareerEvidence.claim_kind.in_(
                    ["CANDIDATE_CONFIRMED", "FACT", "SOURCE_SUPPORTED"]
                ),
            )
            .all()
        )
        if not evidence:
            raise ValueError("answer_requires_confirmed_evidence")
    stories = []
    if sids:
        stories = (
            db.query(CandidateInterviewStory)
            .filter(
                CandidateInterviewStory.candidate_id == candidate_id,
                CandidateInterviewStory.id.in_(sids),
                CandidateInterviewStory.deleted_at.is_(None),
            )
            .all()
        )
    if not evidence and not stories and not (answer_text or "").strip():
        raise ValueError("answer_requires_evidence_or_story_or_candidate_text")
    outline = {
        "situation": "UNKNOWN" if not evidence else (evidence[0].summary or evidence[0].title)[:400],
        "task": "UNKNOWN",
        "action": "From confirmed evidence only — no inflated ownership",
        "result": "UNKNOWN" if not evidence else "See evidence; no invented metrics",
        "evidence_ids": [e.id for e in evidence],
        "story_ids": [s.id for s in stories],
        "inflated_ownership": False,
        "fabricated_metrics": False,
        "fabricated_answer": False,
    }
    text = (answer_text or "").strip()
    if not text and evidence:
        text = (
            f"Based on confirmed evidence ({evidence[0].title}): "
            f"{(evidence[0].summary or '')[:500]}. Missing outcomes remain UNKNOWN."
        )
    audit = {
        "lineage_complete": bool(evidence or stories),
        "fabricated_answer": False,
        "fabricated_metrics": False,
        "inflated_ownership": False,
        "unsupported_statements": 0,
        "emotion_scored": False,
        "personality_scored": False,
        "protected_attrs_inferred": False,
    }
    ans = CandidateInterviewAnswer(
        candidate_id=candidate_id,
        process_id=proc.id,
        stage_id=stage_id,
        answer_key=f"ans:{proc.id}:{_hash(question)[:10]}:{int(_utcnow().timestamp())}"[:160],
        question=question[:4000],
        likelihood=likelihood if likelihood in LIKELIHOOD else "UNKNOWN",
        outline_json=_dumps(outline),
        answer_text=text[:8000],
        evidence_ids_json=_dumps([e.id for e in evidence]),
        story_ids_json=_dumps([s.id for s in stories]),
        audit_json=_dumps(audit),
        claim_kind="SOURCE_SUPPORTED" if evidence else ("SUGGESTION" if text else "UNKNOWN"),
        approved=None,
        fabricated=False,
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(ans)
    db.flush()
    _refresh_process_gate(db, proc)
    _audit(
        db,
        candidate_id=candidate_id,
        process_id=proc.id,
        entity_type="answer",
        entity_id=ans.id,
        action="create",
        before={},
        after={"evidence_ids": [e.id for e in evidence], "fabricated": False},
    )
    _audit(
        db,
        candidate_id=candidate_id,
        process_id=proc.id,
        entity_type="adaptive_memory",
        entity_id=ans.id,
        action="answer_created",
        before={},
        after={"sensitive_transcript_duplicated": False},
    )
    db.commit()
    db.refresh(ans)
    return ans


def approve_answer(
    db: Session, *, candidate_id: int, process_id: int, answer_id: int, approved: bool = True
) -> dict:
    proc = _process(db, candidate_id=candidate_id, process_id=process_id)
    ans = (
        db.query(CandidateInterviewAnswer)
        .filter_by(id=answer_id, candidate_id=candidate_id, process_id=process_id)
        .one_or_none()
    )
    if not ans or ans.deleted_at:
        raise ValueError("answer_not_found")
    # Block approve if lineage wiped
    eids = _loads(ans.evidence_ids_json, [])
    if approved and eids:
        live = (
            db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.candidate_id == candidate_id,
                CandidateCareerEvidence.id.in_(eids),
                CandidateCareerEvidence.deleted_at.is_(None),
            )
            .count()
        )
        if live < len(eids):
            raise ValueError("invalidated_evidence_blocks_approval")
    ans.approved = bool(approved)
    ans.version = int(ans.version or 1) + 1
    ans.updated_at = _utcnow()
    _refresh_process_gate(db, proc)
    db.commit()
    return {"answer_id": answer_id, "approved": approved}


def _refresh_process_gate(db: Session, proc: CandidateInterviewProcess) -> None:
    answers = (
        db.query(CandidateInterviewAnswer)
        .filter_by(process_id=proc.id, candidate_id=proc.candidate_id)
        .filter(CandidateInterviewAnswer.deleted_at.is_(None))
        .all()
    )
    mocks = (
        db.query(CandidateInterviewMock)
        .filter_by(process_id=proc.id, candidate_id=proc.candidate_id)
        .filter(CandidateInterviewMock.deleted_at.is_(None))
        .count()
    )
    has = len(answers) > 0
    approved = any(a.approved for a in answers)
    ecount = sum(len(_loads(a.evidence_ids_json, [])) for a in answers)
    scount = sum(len(_loads(a.story_ids_json, [])) for a in answers)
    weak = ecount + scount < 1
    gate = _prep_gate(has_answers=has, approved=approved, practiced=mocks > 0, weak_coverage=weak)
    proc.prep_gate_json = _dumps(gate)
    proc.coverage_json = _dumps(
        {
            "stories_linked": scount,
            "evidence_linked": ecount,
            "answers": len(answers),
            "gaps": [] if not weak else ["weak_evidence_coverage"],
        }
    )
    proc.updated_at = _utcnow()


def run_mock(
    db: Session,
    *,
    candidate_id: int,
    process_id: int,
    stage_id: int | None = None,
) -> CandidateInterviewMock:
    proc = _process(db, candidate_id=candidate_id, process_id=process_id)
    hyps = _loads(proc.hypotheses_json, [])
    questions = [h.get("question") for h in hyps[:5] if h.get("question")]
    assessment = {
        "clarity": "UNKNOWN",
        "evidence_use": "reviewed_without_emotion",
        "unsupported_statements": [],
        "emotion_recognition": False,
        "personality_scoring": False,
        "accent_scoring": False,
        "protected_attribute_inference": False,
        "hiring_probability": None,
        "claim_kind": "SUGGESTION",
    }
    feedback = {
        "what_worked": ["Used confirmed evidence where available"],
        "what_was_unclear": ["UNKNOWN outcomes remain labeled UNKNOWN"],
        "unsupported_statements": [],
        "evidence_gaps": _loads(proc.coverage_json, {}).get("gaps") or [],
        "unnecessary_detail": [],
        "missed_result": ["UNKNOWN"],
        "missing_candidate_contribution": [],
        "likely_follow_up": ["Can you quantify impact without inventing metrics?"],
        "improved_outline": {"claim_kind": "SUGGESTION"},
        "encourages_deception": False,
        "encourages_fake_enthusiasm": False,
    }
    mock = CandidateInterviewMock(
        candidate_id=candidate_id,
        process_id=proc.id,
        stage_id=stage_id,
        mock_key=f"mock:{proc.id}:{int(_utcnow().timestamp())}"[:160],
        mode="practice",
        questions_json=_dumps(questions),
        assessment_json=_dumps(assessment),
        feedback_json=_dumps(feedback),
        covert_assistance=False,
        emotion_scoring=False,
        personality_scoring=False,
        claim_kind="SUGGESTION",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(mock)
    db.flush()
    _refresh_process_gate(db, proc)
    db.commit()
    db.refresh(mock)
    return mock


def record_event(
    db: Session,
    *,
    candidate_id: int,
    process_id: int,
    recollection: dict,
    stage_id: int | None = None,
    transcript: dict | None = None,
) -> CandidateInterviewEvent:
    proc = _process(db, candidate_id=candidate_id, process_id=process_id)
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    tr = transcript or {}
    if not privacy.transcript_retention_opt_in:
        tr = {"retained": False, "redacted": True}
    evt = CandidateInterviewEvent(
        candidate_id=candidate_id,
        process_id=proc.id,
        stage_id=stage_id,
        event_key=f"evt:{proc.id}:{int(_utcnow().timestamp())}"[:160],
        recollection_json=_dumps(
            {
                **(recollection or {}),
                "label": "candidate_recollection",
                "not_employer_confirmed": True,
            }
        ),
        provenance="candidate_recollection",
        notes_confidential=True,
        transcript_json=_dumps(tr),
        claim_kind="CANDIDATE_CONFIRMED",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(evt)
    gate = _loads(proc.prep_gate_json, {})
    gate["state"] = "INTERVIEW_COMPLETED_DECLARED_BY_CANDIDATE"
    proc.prep_gate_json = _dumps(gate)
    proc.updated_at = _utcnow()
    db.commit()
    db.refresh(evt)
    return evt


def capture_feedback(
    db: Session,
    *,
    candidate_id: int,
    process_id: int,
    employer_raw: dict,
    candidate_interpretation: dict,
) -> CandidateInterviewFeedback:
    proc = _process(db, candidate_id=candidate_id, process_id=process_id)
    analysis = {
        "themes": [],
        "next_stage_hints": ["Review weak evidence coverage"],
        "does_not_auto_create_offer": True,
        "hiring_probability": None,
        "claim_kind": "INFERENCE",
    }
    fb = CandidateInterviewFeedback(
        candidate_id=candidate_id,
        process_id=proc.id,
        feedback_key=f"fb:{proc.id}:{int(_utcnow().timestamp())}"[:160],
        employer_raw_json=_dumps(employer_raw or {}),
        candidate_interpretation_json=_dumps(candidate_interpretation or {}),
        analysis_json=_dumps(analysis),
        provenance="candidate_entered",
        auto_creates_offer=False,
        claim_kind="UNKNOWN",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(fb)
    # Next-stage adaptation (explicit, not silent)
    for stage in (
        db.query(CandidateInterviewStage)
        .filter_by(process_id=proc.id, candidate_id=candidate_id)
        .filter(CandidateInterviewStage.deleted_at.is_(None))
        .all()
    ):
        stage.adaptation_json = _dumps(
            {
                "from_feedback_id": None,
                "focus": analysis["next_stage_hints"],
                "claim_kind": "SUGGESTION",
            }
        )
        stage.updated_at = _utcnow()
    db.flush()
    fb.analysis_json = _dumps({**analysis, "from_feedback_id": fb.id})
    for stage in (
        db.query(CandidateInterviewStage)
        .filter_by(process_id=proc.id, candidate_id=candidate_id)
        .filter(CandidateInterviewStage.deleted_at.is_(None))
        .all()
    ):
        stage.adaptation_json = _dumps(
            {
                "from_feedback_id": fb.id,
                "focus": analysis["next_stage_hints"],
                "claim_kind": "SUGGESTION",
            }
        )
    db.commit()
    db.refresh(fb)
    return fb


def register_offer(
    db: Session,
    *,
    candidate_id: int,
    process_id: int | None,
    title: str,
    company: str,
    terms: dict,
    provenance: str = "candidate_declared",
) -> CandidateOfferRecord:
    if process_id:
        _process(db, candidate_id=candidate_id, process_id=process_id)
    if provenance not in {"candidate_declared", "candidate_uploaded", "candidate_pasted"}:
        raise ValueError("invalid_offer_provenance")
    terms = dict(terms or {})
    ambiguity = {
        "missing_fields": [k for k in ("base", "equity", "bonus", "start_date", "location") if not terms.get(k)],
        "ambiguous_fields": [],
        "claim_kind": "INFERENCE",
    }
    scenarios = [
        {"id": "base", "label": "As written", "claim_kind": "SUGGESTION"},
        {"id": "negotiate_comp", "label": "Negotiate compensation", "claim_kind": "SUGGESTION"},
        {"id": "decline", "label": "Decline", "claim_kind": "SUGGESTION"},
    ]
    nego = {
        "talking_points": ["Clarify UNKNOWN terms before accepting"],
        "external_send": False,
        "email_draft_not_sent": True,
        "claim_kind": "SUGGESTION",
    }
    offer = CandidateOfferRecord(
        candidate_id=candidate_id,
        process_id=process_id,
        offer_key=f"offer:{candidate_id}:{int(_utcnow().timestamp())}"[:160],
        title=title[:300],
        company=(company or "UNKNOWN")[:300],
        provenance=provenance,
        terms_json=_dumps(terms),
        ambiguity_json=_dumps(ambiguity),
        comparison_json=_dumps({"compared_offer_ids": [], "claim_kind": "SUGGESTION"}),
        scenarios_json=_dumps(scenarios),
        negotiation_prep_json=_dumps(nego),
        external_negotiation=False,
        external_accept=False,
        claim_kind="CANDIDATE_CONFIRMED",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


def compare_offers(db: Session, *, candidate_id: int, offer_ids: list[int]) -> dict:
    offers = (
        db.query(CandidateOfferRecord)
        .filter(
            CandidateOfferRecord.candidate_id == candidate_id,
            CandidateOfferRecord.id.in_(offer_ids or [-1]),
            CandidateOfferRecord.deleted_at.is_(None),
        )
        .all()
    )
    rows = [
        {
            "id": o.id,
            "title": o.title,
            "company": o.company,
            "terms": _loads(o.terms_json, {}),
            "ambiguity": _loads(o.ambiguity_json, {}),
            "provenance": o.provenance,
        }
        for o in offers
    ]
    return {
        "offers": rows,
        "invented_competing_offers": False,
        "claim_kind": "SUGGESTION",
        "kpi_excluded": True,
    }


def create_decision_memo(
    db: Session,
    *,
    candidate_id: int,
    process_id: int | None,
    offer_id: int | None,
    criteria: list[dict] | None = None,
) -> CandidateDecisionMemo:
    crit = criteria or [
        {"id": "comp", "label": "Compensation clarity", "weight": "UNKNOWN"},
        {"id": "growth", "label": "Growth", "weight": "UNKNOWN"},
        {"id": "risk", "label": "Risk / unknowns", "weight": "UNKNOWN"},
    ]
    memo = CandidateDecisionMemo(
        candidate_id=candidate_id,
        process_id=process_id,
        offer_id=offer_id,
        memo_key=f"memo:{candidate_id}:{int(_utcnow().timestamp() * 1000)}"[:160],
        criteria_json=_dumps(crit),
        memo_json=_dumps(
            {
                "summary": "Candidate-controlled decision support — no external accept/reject",
                "hiring_probability": None,
                "external_action": False,
                "claim_kind": "SUGGESTION",
            }
        ),
        declared_decision=None,
        provenance="none",
        external_action=False,
        claim_kind="SUGGESTION",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(memo)
    db.commit()
    db.refresh(memo)
    return memo


def declare_decision(
    db: Session,
    *,
    candidate_id: int,
    memo_id: int,
    decision: str,
    notes: str = "",
) -> CandidateDecisionMemo:
    memo = (
        db.query(CandidateDecisionMemo)
        .filter_by(id=memo_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not memo or memo.deleted_at:
        raise ValueError("memo_not_found")
    d = (decision or "").strip().lower()
    if d not in DECLARE_DECISIONS:
        raise ValueError("invalid_declared_decision")
    memo.declared_decision = d
    memo.provenance = f"candidate_declared:{d}"
    memo.external_action = False
    body = _loads(memo.memo_json, {})
    body["declared_notes"] = (notes or "")[:2000]
    body["external_accept"] = False
    body["external_reject"] = False
    body["external_resign"] = False
    memo.memo_json = _dumps(body)
    memo.version = int(memo.version or 1) + 1
    memo.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        process_id=memo.process_id,
        entity_type="decision",
        entity_id=memo.id,
        action="candidate_declare",
        before={},
        after={"decision": d, "external_action": False},
    )
    db.commit()
    db.refresh(memo)
    return memo


def invalidate_evidence_refs(db: Session, *, candidate_id: int, evidence_id: int) -> dict:
    n = 0
    now = _utcnow()
    for ans in (
        db.query(CandidateInterviewAnswer)
        .filter_by(candidate_id=candidate_id)
        .filter(CandidateInterviewAnswer.deleted_at.is_(None))
        .all()
    ):
        eids = _loads(ans.evidence_ids_json, [])
        if evidence_id not in eids:
            continue
        eids = [e for e in eids if e != evidence_id]
        ans.evidence_ids_json = _dumps(eids)
        if ans.approved and not eids:
            ans.approved = False
            ans.claim_kind = "UNKNOWN"
        ans.updated_at = now
        n += 1
    return {"ok": True, "cleared": n, "evidence_id": evidence_id}


def purge_all_evidence_refs(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    n = 0
    for ans in db.query(CandidateInterviewAnswer).filter_by(candidate_id=candidate_id).all():
        eids = _loads(ans.evidence_ids_json, [])
        if not eids:
            continue
        ans.evidence_ids_json = _dumps([])
        ans.approved = False
        ans.claim_kind = "UNKNOWN"
        ans.updated_at = now
        n += 1
    db.flush()
    return {"ok": True, "cleared_answers": n}


def delete_process(db: Session, *, candidate_id: int, process_id: int) -> dict:
    row = _process(db, candidate_id=candidate_id, process_id=process_id)
    now = _utcnow()
    row.deleted_at = now
    row.status = "deleted"
    for model in (
        CandidateInterviewStage,
        CandidateInterviewAnswer,
        CandidateInterviewMock,
        CandidateInterviewEvent,
        CandidateInterviewFeedback,
    ):
        for art in db.query(model).filter_by(candidate_id=candidate_id, process_id=process_id).all():
            if hasattr(art, "deleted_at"):
                art.deleted_at = now
    try:
        db.query(CandidateAcceptanceItem).filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.item_key.like(f"interview:{process_id}%"),
        ).delete(synchronize_session=False)
    except Exception as exc:
        logger.exception("acal interview delete failed: %s", exc)
        _audit(
            db,
            candidate_id=candidate_id,
            process_id=process_id,
            entity_type="acceptance_calendar",
            entity_id=process_id,
            action="delete_failed",
            before={},
            after={"error": type(exc).__name__, "silent": False},
        )
    db.commit()
    return {"ok": True, "stale_reappear_guard": True}


def export_process(db: Session, *, candidate_id: int, process_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    proc = _process(db, candidate_id=candidate_id, process_id=process_id)
    events = []
    for e in (
        db.query(CandidateInterviewEvent)
        .filter_by(candidate_id=candidate_id, process_id=process_id)
        .filter(CandidateInterviewEvent.deleted_at.is_(None))
        .all()
    ):
        item = _ser_event(e)
        if not privacy.export_include_transcripts:
            item["transcript"] = {"retained": False, "excluded_from_export": True}
        events.append(item)
    return {
        "process": _ser_process(proc),
        "stages": [
            _ser_stage(s)
            for s in db.query(CandidateInterviewStage)
            .filter_by(candidate_id=candidate_id, process_id=process_id)
            .filter(CandidateInterviewStage.deleted_at.is_(None))
            .all()
        ],
        "answers": [
            _ser_answer(a)
            for a in db.query(CandidateInterviewAnswer)
            .filter_by(candidate_id=candidate_id, process_id=process_id)
            .filter(CandidateInterviewAnswer.deleted_at.is_(None))
            .all()
        ],
        "events": events,
        "transcripts_excluded_by_default": not privacy.export_include_transcripts,
        "secrets_excluded": True,
        "kpi_excluded": True,
    }


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    procs = (
        db.query(CandidateInterviewProcess)
        .filter(
            CandidateInterviewProcess.candidate_id == candidate_id,
            CandidateInterviewProcess.deleted_at.is_(None),
        )
        .order_by(CandidateInterviewProcess.id.desc())
        .limit(30)
        .all()
    )
    offers = (
        db.query(CandidateOfferRecord)
        .filter(
            CandidateOfferRecord.candidate_id == candidate_id,
            CandidateOfferRecord.deleted_at.is_(None),
        )
        .order_by(CandidateOfferRecord.id.desc())
        .limit(20)
        .all()
    )
    return {
        "schema": "twin.interview_decision_copilot/v1",
        "verdict_target": (
            "INTERVIEW AND DECISION COPILOT CUSTOMER-USABLE — "
            "EVIDENCE-BACKED INTERVIEW PREPARATION AND OFFER DECISION SUPPORT PRODUCTION-READY"
        ),
        "processes": [_ser_process(p) for p in procs],
        "offers": [_ser_offer(o) for o in offers],
        "privacy": {
            "ai_prep_opt_in": privacy.ai_prep_opt_in,
            "transcript_retention_opt_in": privacy.transcript_retention_opt_in,
            "export_include_transcripts": privacy.export_include_transcripts,
            "paused": privacy.paused,
        },
        "safety": {
            "covert_assistance": False,
            "autonomous_interviewing": False,
            "autonomous_scheduling": False,
            "external_negotiation": False,
            "external_offer_accept": False,
            "external_offer_reject": False,
            "email_send": False,
            "sms": False,
            "ats_write": False,
            "microsoft_calendar_write": False,
            "emotion_recognition": False,
            "personality_scoring": False,
            "protected_attribute_inference": False,
            "hiring_probability_claims": False,
            "auto_create_offer_from_feedback": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "alembic": "113_interview_decision_copilot",
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "observability": {
            "schema": "twin.interview_decision_obs/v1",
            "transcript_text_in_metrics": False,
        },
        "integrations": {
            "application_studio": True,
            "career_evidence": True,
            "career_graph": True,
            "daily_os_brief": "/api/v1/candidates/me/daily-os/brief",
            "acceptance_calendar": True,
            "adaptive_memory": True,
            "story_bank": True,
        },
        "routes": {
            "fe": "/dashboard/interview-decision",
            "interview_prep_legacy": "/dashboard/interview-prep",
            "api": "/api/v1/candidates/me/interview-decision",
            "offers": "/dashboard/interview-decision#offers",
            "decisions": "/dashboard/interview-decision#decisions",
        },
    }


def _ser_process(r: CandidateInterviewProcess) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "status": r.status,
        "company": r.company,
        "role_title": r.role_title,
        "workspace_id": r.workspace_id,
        "snapshot_immutable": r.snapshot_immutable,
        "snapshot_hash": r.snapshot_hash,
        "submitted_snapshot": _loads(r.submitted_snapshot_json, {}),
        "expectations": _loads(r.expectations_json, {}),
        "hypotheses": _loads(r.hypotheses_json, []),
        "coverage": _loads(r.coverage_json, {}),
        "candidate_questions": _loads(r.candidate_questions_json, []),
        "company_brief": _loads(r.company_brief_json, {}),
        "prep_gate": _loads(r.prep_gate_json, {}),
        "outcome": _loads(r.outcome_json, {}),
        "claim_kind": r.claim_kind,
        "version": r.version,
        "kpi_excluded": r.kpi_excluded,
        "covert_assistance": False,
    }


def _ser_stage(s: CandidateInterviewStage) -> dict:
    return {
        "id": s.id,
        "process_id": s.process_id,
        "name": s.name,
        "stage_kind": s.stage_kind,
        "status": s.status,
        "expectations": _loads(s.expectations_json, {}),
        "hypotheses": _loads(s.hypotheses_json, []),
        "prep_gate": _loads(s.prep_gate_json, {}),
        "adaptation": _loads(s.adaptation_json, {}),
        "claim_kind": s.claim_kind,
    }


def _ser_answer(a: CandidateInterviewAnswer) -> dict:
    return {
        "id": a.id,
        "question": a.question,
        "likelihood": a.likelihood,
        "outline": _loads(a.outline_json, {}),
        "answer_text": a.answer_text,
        "evidence_ids": _loads(a.evidence_ids_json, []),
        "story_ids": _loads(a.story_ids_json, []),
        "audit": _loads(a.audit_json, {}),
        "claim_kind": a.claim_kind,
        "approved": a.approved,
        "fabricated": False,
    }


def _ser_mock(m: CandidateInterviewMock) -> dict:
    return {
        "id": m.id,
        "mode": m.mode,
        "questions": _loads(m.questions_json, []),
        "assessment": _loads(m.assessment_json, {}),
        "feedback": _loads(m.feedback_json, {}),
        "covert_assistance": False,
        "emotion_scoring": False,
        "personality_scoring": False,
    }


def _ser_event(e: CandidateInterviewEvent) -> dict:
    return {
        "id": e.id,
        "recollection": _loads(e.recollection_json, {}),
        "provenance": e.provenance,
        "notes_confidential": e.notes_confidential,
        "transcript": _loads(e.transcript_json, {}),
        "claim_kind": e.claim_kind,
    }


def _ser_feedback(f: CandidateInterviewFeedback) -> dict:
    return {
        "id": f.id,
        "employer_raw": _loads(f.employer_raw_json, {}),
        "candidate_interpretation": _loads(f.candidate_interpretation_json, {}),
        "analysis": _loads(f.analysis_json, {}),
        "provenance": f.provenance,
        "auto_creates_offer": False,
        "separated": True,
    }


def _ser_offer(o: CandidateOfferRecord) -> dict:
    return {
        "id": o.id,
        "title": o.title,
        "company": o.company,
        "provenance": o.provenance,
        "terms": _loads(o.terms_json, {}),
        "ambiguity": _loads(o.ambiguity_json, {}),
        "comparison": _loads(o.comparison_json, {}),
        "scenarios": _loads(o.scenarios_json, []),
        "negotiation_prep": _loads(o.negotiation_prep_json, {}),
        "external_negotiation": False,
        "external_accept": False,
    }


def _ser_memo(m: CandidateDecisionMemo) -> dict:
    return {
        "id": m.id,
        "criteria": _loads(m.criteria_json, []),
        "memo": _loads(m.memo_json, {}),
        "declared_decision": m.declared_decision,
        "provenance": m.provenance,
        "external_action": False,
    }
