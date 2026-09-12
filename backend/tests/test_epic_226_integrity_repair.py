"""Epic 2.26 integrity — pause/resume, provenance, objective checker, delayed eval."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.database.models import (
    Candidate,
    CandidateCareerEvidence,
    CandidateInterviewPracticeEvaluation,
    CandidateInterviewPracticeSession,
    CandidateInterviewPracticeTurn,
    CandidateInterviewPrivacy,
    User,
)
from app.services import candidate_interview_practice as prac
from app.services.candidate_interview_exercise_catalog import (
    evaluate_objective_answer,
    get_exercise,
)
from app.services.candidate_interview_practice_constants import (
    STATE_ABANDONED,
    STATE_IN_PROGRESS,
    STATE_PAUSED,
)
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "epic226-integrity-test-secret!!!!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in [
        User.__table__,
        Candidate.__table__,
        CandidateCareerEvidence.__table__,
        CandidateInterviewPrivacy.__table__,
        CandidateInterviewPracticeSession.__table__,
        CandidateInterviewPracticeTurn.__table__,
        CandidateInterviewPracticeEvaluation.__table__,
    ]:
        table.create(bind=bind, checkfirst=True)
    return db


def _cand(db, *, email: str, metrics_excluded: bool = False) -> Candidate:
    now = datetime.now(timezone.utc)
    u = User(
        email=email,
        hashed_password="x",
        gdpr_consent_at=now,
        exclude_from_product_metrics=metrics_excluded,
    )
    db.add(u)
    db.flush()
    c = Candidate(
        user_id=u.id,
        name="Integrity",
        skills='["Python"]',
        experience_years=2,
        cv_text="x",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_pause_allows_resume_abandon_does_not(monkeypatch):
    db = _setup(monkeypatch)
    c = _cand(db, email="ordinary@example.com")
    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="behavioral_star_1", locale="en"
    )
    sid = sess["id"]
    paused = prac.pause_session(db, candidate_id=c.id, session_id=sid)
    assert paused["state"] == STATE_PAUSED
    with pytest.raises(ValueError, match="paused"):
        prac.patch_turn_draft(
            db,
            candidate_id=c.id,
            session_id=sid,
            turn_id=sess["turns"][0]["id"],
            answer_draft="should fail while paused",
        )
    resumed = prac.resume_session(db, candidate_id=c.id, session_id=sid)
    assert resumed["state"] == STATE_IN_PROGRESS
    # Abandon is not pause
    prac.abandon_session(db, candidate_id=c.id, session_id=sid)
    with pytest.raises(ValueError, match="closed|not_resumable"):
        prac.resume_session(db, candidate_id=c.id, session_id=sid)


def test_draft_persists_across_pause_resume(monkeypatch):
    db = _setup(monkeypatch)
    c = _cand(db, email="draft@example.com")
    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="behavioral_star_1", locale="en"
    )
    tid = sess["turns"][0]["id"]
    unique = "UNIQUE_DRAFT_SENTINEL_epic226_integrity_42"
    prac.patch_turn_draft(
        db, candidate_id=c.id, session_id=sess["id"], turn_id=tid, answer_draft=unique
    )
    prac.pause_session(db, candidate_id=c.id, session_id=sess["id"])
    loaded = prac.get_session(db, candidate_id=c.id, session_id=sess["id"])
    assert loaded["turns"][0]["answer_draft"] == unique
    resumed = prac.resume_session(db, candidate_id=c.id, session_id=sess["id"])
    assert resumed["turns"][0]["answer_draft"] == unique


def test_provenance_ordinary_not_synthetic_even_if_metrics_excluded(monkeypatch):
    db = _setup(monkeypatch)
    # Metrics-excluded real-looking email must NOT become synthetic solely from flag
    c = _cand(db, email="real.candidate@example.com", metrics_excluded=True)
    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="sw_backend_rubric_1", locale="en"
    )
    assert sess["kpi_excluded"] is True
    assert sess["is_synthetic"] is False


def test_provenance_synthetic_email_is_synthetic(monkeypatch):
    db = _setup(monkeypatch)
    c = _cand(db, email="epic226-practice+abc12@twin.internal", metrics_excluded=True)
    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="sw_backend_rubric_1", locale="en"
    )
    assert sess["is_synthetic"] is True
    assert sess["kpi_excluded"] is True


def test_promote_uses_is_synthetic_not_kpi_flag(monkeypatch):
    db = _setup(monkeypatch)
    c = _cand(db, email="promote.real@example.com", metrics_excluded=True)
    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="behavioral_star_1", locale="en"
    )
    tid = sess["turns"][0]["id"]
    prac.submit_turn(
        db,
        candidate_id=c.id,
        session_id=sess["id"],
        turn_id=tid,
        answer_text="Situation task action result with enough detail for practice.",
    )
    prac.complete_session(db, candidate_id=c.id, session_id=sess["id"])
    promo = prac.promote_to_evidence(
        db, candidate_id=c.id, session_id=sess["id"], turn_ids=[tid]
    )
    assert promo["is_synthetic"] is False
    assert promo["kpi_excluded"] is True
    ev = db.query(CandidateCareerEvidence).filter_by(id=promo["evidence_ids"][0]).one()
    assert ev.is_synthetic is False


def test_objective_correct_vs_wrong_differ(monkeypatch):
    ex = get_exercise("sw_backend_objective_1")
    assert ex is not None and ex.exercise_type == "objective"
    good = evaluate_objective_answer(
        ex,
        "I open APM for p95 latency, check database vs network, then trigger rollback "
        "or feature flag mitigation before root cause.",
    )
    bad = evaluate_objective_answer(ex, "I would rewrite overnight for 10000x.")
    assert good is not None and bad is not None
    assert good["objective_result"] == "correct"
    assert bad["objective_result"] == "incorrect"
    assert good["criteria"][0]["outcome"] != bad["criteria"][0]["outcome"]


def test_legacy_behavioral_id_keeps_behavioral_family(monkeypatch):
    ex = get_exercise("behavioral_star_1")
    assert ex is not None
    assert ex.family == "behavioral_star"
    assert ex.version == 1
    assert "conflict" in ex.prompt_en.lower() or "STAR" in ex.title_en


def test_delayed_eval_barrier_delete_rejects_persist(monkeypatch):
    """In-flight provider barrier + concurrent delete → no evaluation row."""
    db = _setup(monkeypatch)
    c = _cand(db, email="barrier@twin.internal", metrics_excluded=True)
    from app.services.interview_decision import get_or_create_privacy

    priv = get_or_create_privacy(db, candidate_id=c.id)
    priv.ai_prep_opt_in = True
    priv.paused = False
    db.commit()

    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="behavioral_star_1", locale="en"
    )
    tid = sess["turns"][0]["id"]
    sid = sess["id"]
    engine = db.get_bind()

    def slow_provider(question, answer, job_ctx=""):
        # Independent Session/request B deletes while A is "awaiting provider"
        from sqlalchemy.orm import sessionmaker

        SessionLocal = sessionmaker(bind=engine)
        db_b = SessionLocal()
        try:
            prac.delete_session(db_b, candidate_id=c.id, session_id=sid)
        finally:
            db_b.close()
        return {
            "evaluation_status": "COMPLETE",
            "criteria": [{"id": "relevance", "outcome": "SUPPORTED_IN_RESPONSE"}],
            "strengths": ["should not persist"],
            "improvements": [],
            "source": "ANTHROPIC_CLAUDE",
            "source_label": "claude",
            "degraded": False,
            "score": None,
            "score_available": False,
        }

    result = prac.submit_turn(
        db,
        candidate_id=c.id,
        session_id=sid,
        turn_id=tid,
        answer_text="answer during barrier",
        provider_call=slow_provider,
    )
    assert result.get("eval_skipped_reason") == "session_deleted"
    assert result.get("evaluation") is None
    count = (
        db.query(CandidateInterviewPracticeEvaluation).filter_by(turn_id=tid).count()
    )
    assert count == 0
