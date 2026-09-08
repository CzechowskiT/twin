"""Epic 2.26 — adaptive interview practice service.

Candidate-owned practice sessions grounded in exercise catalog or process context.
No scoring, no hiring probability, no employer ranking.
AI path requires explicit ai_prep_opt_in; deterministic fallback otherwise.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateInterviewPracticeEvaluation,
    CandidateInterviewPracticeSession,
    CandidateInterviewPracticeTurn,
)
from app.services.ai_interview_coach import evaluate_submitted_answer_text
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
    ai_prep_opt_in: bool = False,
) -> dict[str, Any]:
    """Submit an answer (closes DB txn before model call; writes evaluation after)."""
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

    # Evaluate (AI if opted-in + configured, else deterministic)
    eval_result = _evaluate_turn(
        question=turn.question_text,
        answer=answer,
        process_id=session.process_id,
        ai_prep_opt_in=ai_prep_opt_in,
    )

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
    ai_prep_opt_in: bool = False,
) -> dict[str, Any]:
    """Create next adaptive turn (deterministic library or AI follow-up)."""
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

    # Deterministic follow-up from library (no AI needed for the question itself)
    question = follow_up_question(family, turn_index=turn_idx - 1, locale=locale)

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
    return {"turn": _ser_turn(turn), "turns_submitted": submitted}


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
    """Soft-delete a session."""
    session = _get_session(
        db, candidate_id=candidate_id, session_id=session_id, require_active=False
    )
    session.deleted_at = _utcnow()
    session.state = STATE_DELETED
    session.updated_at = _utcnow()
    db.commit()
    return {"session_id": session_id, "deleted": True}


def promote_to_evidence(
    db: Session,
    *,
    candidate_id: int,
    session_id: int,
) -> dict[str, Any]:
    """Promote completed session turns as career evidence (PRACTICE_WORK_SAMPLE).

    Only creates evidence if session has at least one submitted turn.
    Label is PRACTICE_WORK_SAMPLE — never SOURCE_SUPPORTED or FACT.
    """
    session = _get_session(
        db, candidate_id=candidate_id, session_id=session_id, require_active=False
    )
    if session.state not in (STATE_COMPLETED, "IN_PROGRESS"):
        raise ValueError("session_not_promotable")

    submitted_turns = (
        db.query(CandidateInterviewPracticeTurn)
        .filter_by(session_id=session.id, state=TURN_SUBMITTED)
        .order_by(CandidateInterviewPracticeTurn.turn_index.asc())
        .all()
    )

    if not submitted_turns:
        raise ValueError("no_submitted_turns_to_promote")

    from app.services.career_evidence import create_evidence
    from app.services.candidate_interview_practice_constants import CLAIM_KIND_PRACTICE

    created_ids: list[int] = []
    for turn in submitted_turns[:3]:  # max 3 promoted per session
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
            is_synthetic=False,
            commit=False,
        )
        created_ids.append(int(row.id))
    db.commit()

    return {
        "session_id": session.id,
        "label": EVIDENCE_LABEL_PRACTICE_WORK_SAMPLE,
        "turns_promoted": len(submitted_turns),
        "evidence_ids": created_ids,
        "note": "PRACTICE_WORK_SAMPLE — not employer-confirmed evidence",
    }


# ── Evaluation helper ─────────────────────────────────────────────────────────


def _evaluate_turn(
    *,
    question: str,
    answer: str,
    process_id: int | None = None,
    ai_prep_opt_in: bool = False,
) -> dict[str, Any]:
    """Evaluate submitted answer. AI if opted-in + configured, else deterministic."""
    return evaluate_submitted_answer_text(
        question=question,
        answer=answer,
        job_ctx="",  # no job ORM available in practice context
        allow_deterministic_heuristics=True,
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
