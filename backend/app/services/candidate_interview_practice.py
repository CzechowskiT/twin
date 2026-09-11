"""Epic 2.26 — adaptive interview practice service.

Candidate-owned practice sessions grounded in exercise catalog or process context.
No scoring, no hiring probability, no employer ranking.
AI path requires explicit ai_prep_opt_in stored in CandidateInterviewPrivacy.
Request-body booleans MUST NOT override the canonical consent row.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateInterviewPracticeEvaluation,
    CandidateInterviewPracticeSession,
    CandidateInterviewPracticeTurn,
)
from app.services.ai_interview_coach import (
    evaluate_submitted_answer_text,
    generate_adaptive_follow_up,
)
from app.services.interview_decision import get_or_create_privacy
from app.services.candidate_interview_exercise_catalog import (
    first_question_for_exercise,
    follow_up_question,
    get_catalog,
    get_exercise,
)
from app.services.candidate_interview_practice_constants import (
    EVIDENCE_LABEL_PRACTICE_WORK_SAMPLE,
    EVAL_INSUFFICIENT,
    MAX_ANSWER_CHARS,
    MAX_TURNS_PER_SESSION,
    SCHEMA_ID,
    SESSION_STATES,
    STATE_ABANDONED,
    STATE_COMPLETED,
    STATE_DELETED,
    STATE_IN_PROGRESS,
    TURN_SUBMITTED,
    TURN_SUPERSEDED,
)

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    import json

    return json.dumps(obj, ensure_ascii=False, default=str)


def _loads(raw: str | None, default: Any) -> Any:
    import json

    try:
        return json.loads(raw or "")
    except Exception:
        return default


def _session_key(candidate_id: int, exercise_id: str | None, ts: float) -> str:
    raw = f"ps:{candidate_id}:{exercise_id}:{ts}"
    return "ps:" + hashlib.sha256(raw.encode()).hexdigest()[:24]


# ── Session helpers ────────────────────────────────────────────────────────────


def _get_session(
    db: Session,
    *,
    candidate_id: int,
    session_id: int,
    require_active: bool = True,
) -> CandidateInterviewPracticeSession:
    row = (
        db.query(CandidateInterviewPracticeSession)
        .filter_by(id=session_id, candidate_id=candidate_id)
        .filter(CandidateInterviewPracticeSession.deleted_at.is_(None))
        .one_or_none()
    )
    if not row:
        raise ValueError("practice_session_not_found")
    if require_active and row.state in (STATE_DELETED, STATE_ABANDONED):
        raise ValueError("practice_session_closed")
    return row


def _get_turn(
    db: Session, *, session_id: int, turn_id: int
) -> CandidateInterviewPracticeTurn:
    row = (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(id=turn_id, session_id=session_id)
        .one_or_none()
    )
    if not row:
        raise ValueError("practice_turn_not_found")
    return row


def _submitted_turns_count(db: Session, *, session_id: int) -> int:
    return (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(session_id=session_id, state=TURN_SUBMITTED)
        .count()
    )


# ── Consent gate ──────────────────────────────────────────────────────────────


def authorize_practice_ai(db: Session, candidate_id: int) -> dict[str, Any]:
    """Read canonical AI-practice consent from DB.

    Request-body booleans MUST NOT be used as authority. Only the canonical
    CandidateInterviewPrivacy row (read here) determines authorization.

    Returns:
        authorized: True only when ai_prep_opt_in is True AND paused is False.
    """
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    authorized = bool(privacy.ai_prep_opt_in) and not bool(privacy.paused)
    reason = "consent_given" if authorized else (
        "privacy_paused" if bool(privacy.ai_prep_opt_in) else "consent_not_given"
    )
    return {
        "authorized": authorized,
        "ai_prep_opt_in": bool(privacy.ai_prep_opt_in),
        "paused": bool(privacy.paused),
        "reason": reason,
        "source": "canonical_db_privacy",
    }


# ── Catalog ────────────────────────────────────────────────────────────────────


def catalog(locale: str = "en") -> dict[str, Any]:
    """Return exercise catalog for the given locale."""
    return get_catalog(locale)


# ── Session lifecycle ─────────────────────────────────────────────────────────


def create_session(
    db: Session,
    *,
    candidate_id: int,
    exercise_id: str | None = None,
    process_id: int | None = None,
    locale: str = "en",
    ai_prep_opt_in: bool = False,
) -> dict[str, Any]:
    """Create a new practice session and first turn with opening question."""
    if exercise_id and not get_exercise(exercise_id):
        raise ValueError(f"unknown_exercise_id:{exercise_id}")

    family = None
    if exercise_id:
        ex = get_exercise(exercise_id)
        if ex:
            family = ex.family

    ts = _utcnow().timestamp()
    key = _session_key(candidate_id, exercise_id, ts)
    now = _utcnow()

    session = CandidateInterviewPracticeSession(
        candidate_id=candidate_id,
        session_key=key[:160],
        process_id=process_id,
        exercise_id=exercise_id,
        state=STATE_IN_PROGRESS,
        locale=locale[:8],
        version=1,
        turn_limit=MAX_TURNS_PER_SESSION,
        consent_ai_at=now if ai_prep_opt_in else None,
        kpi_excluded=True,
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    db.flush()

    # Opening question from exercise or default
    question = first_question_for_exercise(exercise_id or "", locale) if exercise_id else (
        "Describe a significant professional challenge you faced and how you resolved it."
        if not locale.startswith("pl") else
        "Opisz znaczące wyzwanie zawodowe, z którym się zmierzyłeś i jak je rozwiązałeś."
    )

    turn = CandidateInterviewPracticeTurn(
        session_id=session.id,
        turn_index=0,
        state="DRAFT",
        question_text=question[:4000],
        answer_draft="",
        version=1,
        created_at=now,
        updated_at=now,
    )
    db.add(turn)
    db.commit()
    db.refresh(session)
    db.refresh(turn)

    return _ser_session(session, turns=[turn], evaluations={})


def list_sessions(
    db: Session,
    *,
    candidate_id: int,
    limit: int = 20,
    offset: int = 0,
    include_deleted: bool = False,
) -> dict[str, Any]:
    """Return paginated practice session summaries for the candidate."""
    q = db.query(CandidateInterviewPracticeSession).filter_by(candidate_id=candidate_id)
    if not include_deleted:
        q = q.filter(CandidateInterviewPracticeSession.deleted_at.is_(None))
    total = q.count()
    rows = (
        q.order_by(CandidateInterviewPracticeSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "schema": SCHEMA_ID,
        "total": total,
        "limit": limit,
        "offset": offset,
        "sessions": [_ser_session_summary(s) for s in rows],
    }


def _ser_session_summary(s: CandidateInterviewPracticeSession) -> dict[str, Any]:
    """Lightweight session summary — no turns/evals inlined."""
    return {
        "id": s.id,
        "exercise_id": s.exercise_id,
        "state": s.state,
        "locale": s.locale,
        "ai_consented": s.consent_ai_at is not None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def get_session(
    db: Session, *, candidate_id: int, session_id: int
) -> dict[str, Any]:
    """Return full session with turns and evaluations."""
    session = _get_session(db, candidate_id=candidate_id, session_id=session_id, require_active=False)
    turns = (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(session_id=session.id)
        .order_by(CandidateInterviewPracticeTurn.turn_index.asc())
        .all()
    )
    evaluations = _load_evaluations(db, turn_ids=[t.id for t in turns])
    return _ser_session(session, turns=turns, evaluations=evaluations)


def patch_turn_draft(
    db: Session,
    *,
    candidate_id: int,
    session_id: int,
    turn_id: int,
    answer_draft: str,
) -> dict[str, Any]:
    """Save a draft answer without submitting."""
    session = _get_session(db, candidate_id=candidate_id, session_id=session_id)
    turn = _get_turn(db, session_id=session.id, turn_id=turn_id)
    if turn.state == TURN_SUBMITTED:
        raise ValueError("turn_already_submitted")
    turn.answer_draft = (answer_draft or "")[:MAX_ANSWER_CHARS]
    turn.updated_at = _utcnow()
    db.commit()
    return {"turn_id": turn.id, "state": turn.state, "draft_saved": True}


def submit_turn(
    db: Session,
    *,
    candidate_id: int,
    session_id: int,
    turn_id: int,
    answer_text: str,
    ai_prep_opt_in: bool = False,  # kept for API compat but IGNORED — server reads privacy
) -> dict[str, Any]:
    """Submit an answer (closes DB txn before model call; writes evaluation after).

    The ai_prep_opt_in parameter from the request body is intentionally IGNORED.
    The server reads consent exclusively from the canonical privacy row.
    Evaluation is not persisted if the session was deleted between commit and AI call.
    """
    session = _get_session(db, candidate_id=candidate_id, session_id=session_id)
    # Row lock serializes concurrent submits on the same turn (PG concurrency).
    turn = (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(id=turn_id, session_id=session.id)
        .with_for_update()
        .one_or_none()
    )
    if not turn:
        raise ValueError("practice_turn_not_found")

    if turn.state == TURN_SUBMITTED:
        raise ValueError("turn_already_submitted")

    answer = (answer_text or "").strip()[:MAX_ANSWER_CHARS]
    now = _utcnow()
    turn.answer_submitted = answer
    turn.answer_draft = answer
    turn.state = TURN_SUBMITTED
    turn.version = int(turn.version or 1) + 1
    turn.submitted_at = now
    turn.updated_at = now

    # Commit before calling AI — avoids holding DB txn during model call
    db.commit()

    # Evaluate — AI authorization read from canonical privacy, NOT from request body
    eval_result = _evaluate_turn(
        db,
        candidate_id,
        question=turn.question_text,
        answer=answer,
        process_id=session.process_id,
    )

    # Reject eval persistence if session was deleted between commit and AI return
    fresh_session = (
        db.query(CandidateInterviewPracticeSession)
        .filter_by(id=session.id)
        .one_or_none()
    )
    if fresh_session is None or fresh_session.deleted_at is not None:
        logger.warning(
            "practice eval write rejected — session %s deleted after submit commit", session.id
        )
        db.refresh(turn)
        return {
            "turn": _ser_turn(turn),
            "evaluation": None,
            "score": None,
            "score_available": False,
            "eval_skipped_reason": "session_deleted",
        }

    evl = CandidateInterviewPracticeEvaluation(
        turn_id=turn.id,
        evaluation_status=eval_result.get("evaluation_status", EVAL_INSUFFICIENT),
        criteria_json=_dumps(eval_result.get("criteria", [])),
        strengths_json=_dumps(eval_result.get("strengths", [])),
        improvements_json=_dumps(eval_result.get("improvements", [])),
        source=eval_result.get("source", "DETERMINISTIC_LIBRARY_FALLBACK"),
        source_label=eval_result.get("source_label", "deterministic_library"),
        degraded=bool(eval_result.get("degraded", False)),
        created_at=_utcnow(),
    )
    db.add(evl)
    db.commit()

    db.refresh(turn)
    db.refresh(evl)

    return {
        "turn": _ser_turn(turn),
        "evaluation": _ser_evaluation(evl),
        "score": None,
        "score_available": False,
    }


def next_turn(
    db: Session,
    *,
    candidate_id: int,
    session_id: int,
    ai_prep_opt_in: bool = False,  # IGNORED — server reads privacy row
    follow_up_provider_call=None,
) -> dict[str, Any]:
    """Create next adaptive turn — AI follow-up when consent authorized, library otherwise.

    When AI is authorized: calls generate_adaptive_follow_up with the last submitted answer
    so the follow-up question is specifically tailored to the candidate's answer content.
    When not authorized: picks a library follow-up that varies by answer content
    (length/topics/STAR keywords) without claiming AI adaptation.
    """
    session = _get_session(db, candidate_id=candidate_id, session_id=session_id)

    submitted = _submitted_turns_count(db, session_id=session.id)
    if submitted >= session.turn_limit:
        raise ValueError(f"turn_limit_reached:{session.turn_limit}")

    # Find last submitted turn to adapt follow-up
    last_turn = (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(session_id=session.id, state=TURN_SUBMITTED)
        .order_by(CandidateInterviewPracticeTurn.turn_index.desc())
        .first()
    )

    locale = session.locale or "en"
    exercise = get_exercise(session.exercise_id or "") if session.exercise_id else None
    family = exercise.family if exercise else "behavioral_star"
    turn_idx = (last_turn.turn_index + 1) if last_turn else 1

    # Check consent from canonical privacy row (not body)
    auth = authorize_practice_ai(db, candidate_id)

    if last_turn and last_turn.answer_submitted:
        # Adaptive: varies by answer content whether AI or library
        rubric = (exercise.prompt_en if exercise else "") if not locale.startswith("pl") else (exercise.prompt_pl if exercise else "")
        follow_result = generate_adaptive_follow_up(
            question=last_turn.question_text or "",
            answer=last_turn.answer_submitted or "",
            rubric=rubric,
            ai_authorized=auth["authorized"],
            provider_call=follow_up_provider_call,
        )
        question = follow_result.get("follow_up", follow_up_question(family, turn_index=turn_idx - 1, locale=locale))
        follow_source = follow_result.get("source_label", "library_not_adaptive_ai")
    else:
        # No previous answer — use library question
        question = follow_up_question(family, turn_index=turn_idx - 1, locale=locale)
        follow_source = "library_no_prior_answer"

    now = _utcnow()
    turn = CandidateInterviewPracticeTurn(
        session_id=session.id,
        turn_index=turn_idx,
        state="DRAFT",
        question_text=question[:4000],
        answer_draft="",
        version=1,
        created_at=now,
        updated_at=now,
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)
    return {"turn": _ser_turn(turn), "turns_submitted": submitted, "follow_up_source": follow_source}


def complete_session(
    db: Session, *, candidate_id: int, session_id: int
) -> dict[str, Any]:
    """Mark session completed."""
    session = _get_session(db, candidate_id=candidate_id, session_id=session_id)
    submitted = _submitted_turns_count(db, session_id=session.id)
    session.state = STATE_COMPLETED
    session.version = int(session.version or 1) + 1
    session.updated_at = _utcnow()
    db.commit()
    return {"session_id": session.id, "state": STATE_COMPLETED, "turns_submitted": submitted}


def abandon_session(
    db: Session, *, candidate_id: int, session_id: int
) -> dict[str, Any]:
    """Mark session abandoned (reversible via create new session)."""
    session = _get_session(db, candidate_id=candidate_id, session_id=session_id)
    session.state = STATE_ABANDONED
    session.version = int(session.version or 1) + 1
    session.updated_at = _utcnow()
    db.commit()
    return {"session_id": session.id, "state": STATE_ABANDONED}


def delete_session(
    db: Session, *, candidate_id: int, session_id: int
) -> dict[str, Any]:
    """Soft-delete a session and mark all its turns as SUPERSEDED.

    Any delayed eval write for these turns will be rejected (session.deleted_at is set).
    """
    session = _get_session(
        db, candidate_id=candidate_id, session_id=session_id, require_active=False
    )
    now = _utcnow()
    # Soft-delete children: mark non-submitted turns as SUPERSEDED
    turns = (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(session_id=session.id)
        .all()
    )
    for turn in turns:
        if turn.state != TURN_SUBMITTED:
            turn.state = TURN_SUPERSEDED
            turn.updated_at = now

    session.deleted_at = now
    session.state = STATE_DELETED
    session.updated_at = now
    db.commit()
    return {"session_id": session_id, "deleted": True, "turns_superseded": sum(1 for t in turns if t.state == TURN_SUPERSEDED)}


def promote_to_evidence(
    db: Session,
    *,
    candidate_id: int,
    session_id: int,
    turn_ids: list[int] | None = None,
) -> dict[str, Any]:
    """Promote explicitly selected practice turns as PRACTICE_WORK_SAMPLE career evidence.

    Args:
        turn_ids: Explicit list of turn IDs to promote. If None, promotes all submitted
            turns (kept for backward compat but explicit list is preferred). No silent
            first-3 subset — caller decides scope.

    Label is PRACTICE_WORK_SAMPLE — never SOURCE_SUPPORTED or FACT.
    is_synthetic mirrors session.kpi_excluded (practice sessions are always kpi_excluded=True).
    turns_promoted == len(evidence_ids) (no mismatch between reported and created counts).
    """
    session = _get_session(
        db, candidate_id=candidate_id, session_id=session_id, require_active=False
    )
    if session.state not in (STATE_COMPLETED, "IN_PROGRESS"):
        raise ValueError("session_not_promotable")

    # Build candidate turn set
    query = (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(session_id=session.id, state=TURN_SUBMITTED)
        .order_by(CandidateInterviewPracticeTurn.turn_index.asc())
    )
    submitted_turns = query.all()

    if not submitted_turns:
        raise ValueError("no_submitted_turns_to_promote")

    # Filter to explicit turn_ids if provided; otherwise use all submitted
    if turn_ids is not None:
        turn_id_set = set(turn_ids)
        turns_to_promote = [t for t in submitted_turns if t.id in turn_id_set]
        unknown = turn_id_set - {t.id for t in turns_to_promote}
        if unknown:
            raise ValueError(f"turn_ids_not_found:{sorted(unknown)}")
    else:
        turns_to_promote = submitted_turns  # all submitted (no silent subset)

    if not turns_to_promote:
        raise ValueError("no_matching_turns_to_promote")

    from app.services.career_evidence import create_evidence
    from app.services.candidate_interview_practice_constants import CLAIM_KIND_PRACTICE

    # is_synthetic mirrors session.kpi_excluded — practice sessions are always kpi_excluded
    is_synthetic = bool(session.kpi_excluded)

    created_ids: list[int] = []
    for turn in turns_to_promote:
        row = create_evidence(
            db,
            candidate_id=candidate_id,
            evidence_type="achievement",
            title=f"Practice turn: {(turn.question_text or '')[:80]}",
            summary=(turn.answer_submitted or "")[:2000],
            claim_kind=CLAIM_KIND_PRACTICE,
            skills=["interview_practice"],
            context={
                "label": EVIDENCE_LABEL_PRACTICE_WORK_SAMPLE,
                "practice_session_id": session.id,
                "turn_id": turn.id,
                "not_employer_attested": True,
                "not_global_skill_score": True,
            },
            is_synthetic=is_synthetic,
            commit=False,
        )
        created_ids.append(int(row.id))
    db.commit()

    # turns_promoted == len(created_ids) — no silent mismatch
    return {
        "session_id": session.id,
        "label": EVIDENCE_LABEL_PRACTICE_WORK_SAMPLE,
        "turns_promoted": len(created_ids),
        "evidence_ids": created_ids,
        "note": "PRACTICE_WORK_SAMPLE — not employer-confirmed evidence",
    }


# ── Evaluation helper ─────────────────────────────────────────────────────────


def _evaluate_turn(
    db: Session,
    candidate_id: int,
    *,
    question: str,
    answer: str,
    process_id: int | None = None,
    provider_call=None,
) -> dict[str, Any]:
    """Evaluate submitted answer.

    AI path ONLY when authorize_practice_ai confirms consent from canonical privacy row.
    Request-body ai_prep_opt_in is NOT accepted here — consent is always read from DB.

    Args:
        provider_call: Optional injectable callable(question, answer, job_ctx) → dict.
            Passed through to evaluate_submitted_answer_text for test stubbing.
    """
    auth = authorize_practice_ai(db, candidate_id)
    if not auth["authorized"]:
        # No AI — deterministic checklist with factual_observations only
        result = evaluate_submitted_answer_text(
            question=question,
            answer=answer,
            job_ctx="",
            allow_deterministic_heuristics=True,
            ai_authorized=False,
        )
        result["consent_denied"] = True
        result["consent_denied_reason"] = auth["reason"]
        result["source"] = "DETERMINISTIC_LIBRARY_FALLBACK"
        result["source_label"] = "deterministic_library_consent_denied"
        return result

    # Authorized AI path — injectable for tests
    return evaluate_submitted_answer_text(
        question=question,
        answer=answer,
        job_ctx="",
        allow_deterministic_heuristics=True,
        ai_authorized=True,
        provider_call=provider_call,
    )


# ── Serializers ───────────────────────────────────────────────────────────────


def _ser_session(
    s: CandidateInterviewPracticeSession,
    *,
    turns: list[CandidateInterviewPracticeTurn],
    evaluations: dict[int, CandidateInterviewPracticeEvaluation],
) -> dict[str, Any]:
    return {
        "schema": SCHEMA_ID,
        "id": s.id,
        "session_key": s.session_key,
        "exercise_id": s.exercise_id,
        "process_id": s.process_id,
        "state": s.state,
        "locale": s.locale,
        "turn_limit": s.turn_limit,
        "ai_consented": s.consent_ai_at is not None,
        "kpi_excluded": s.kpi_excluded,
        "turns": [_ser_turn(t) for t in turns],
        "evaluations": {str(k): _ser_evaluation(v) for k, v in evaluations.items()},
        "score": None,
        "score_available": False,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _ser_turn(t: CandidateInterviewPracticeTurn) -> dict[str, Any]:
    return {
        "id": t.id,
        "session_id": t.session_id,
        "turn_index": t.turn_index,
        "state": t.state,
        "question_text": t.question_text,
        "answer_draft": t.answer_draft or "",
        "answer_submitted": t.answer_submitted,
        "submitted_at": t.submitted_at.isoformat() if t.submitted_at else None,
    }


def _ser_evaluation(e: CandidateInterviewPracticeEvaluation) -> dict[str, Any]:
    return {
        "id": e.id,
        "turn_id": e.turn_id,
        "evaluation_status": e.evaluation_status,
        "criteria": _loads(e.criteria_json, []),
        "strengths": _loads(e.strengths_json, []),
        "improvements": _loads(e.improvements_json, []),
        "source": e.source,
        "source_label": e.source_label,
        "degraded": e.degraded,
        "score": None,
        "score_available": False,
    }


def _load_evaluations(
    db: Session, *, turn_ids: list[int]
) -> dict[int, CandidateInterviewPracticeEvaluation]:
    if not turn_ids:
        return {}
    rows = (
        db.query(CandidateInterviewPracticeEvaluation)
        .filter(CandidateInterviewPracticeEvaluation.turn_id.in_(turn_ids))
        .all()
    )
    return {r.turn_id: r for r in rows}
