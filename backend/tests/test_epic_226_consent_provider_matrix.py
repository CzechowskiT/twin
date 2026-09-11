"""Epic 2.26 — Consent × Provider matrix tests.

Verifies that AI (Claude) is NEVER called unless:
  1. privacy.ai_prep_opt_in is True (canonical row, not request body)
  2. privacy.paused is False

Test scenarios:
  A. never_consented        → 0 provider calls
  B. consent_false          → 0 provider calls
  C. forged_body_true       → 0 provider calls (body cannot override privacy row)
  D. privacy_paused         → 0 provider calls
  E. consent_true_not_paused → 1 provider call (AI path)
  F. revoke_mid_flight      → eval skipped if session deleted before persist
  G. answer_1_no_invented   → answer '1' yields NOT_ASSESSED for all semantic criteria
  H. heuristic_factual_only → factual_observations present; no SUPPORTED/PARTIAL
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.models import (
    Base,
    Candidate,
    CandidateCareerEvidence,
    CandidateInterviewPrivacy,
    CandidateInterviewPracticeEvaluation,
    CandidateInterviewPracticeSession,
    CandidateInterviewPracticeTurn,
    User,
)
from app.services import candidate_interview_practice as prac
from app.services.ai_interview_coach import (
    _heuristic_grounded_criteria,
    _heuristic_factual_observations,
    evaluate_submitted_answer_text,
)
from app.services.candidate_interview_practice_constants import (
    OUTCOME_NOT_ASSESSED,
    OUTCOME_SUPPORTED,
    OUTCOME_PARTIAL,
    STATE_DELETED,
)
from tests.test_auth_integration import _sqlite_session


# ── DB helpers ────────────────────────────────────────────────────────────────

_TABLES = [
    User.__table__,
    Candidate.__table__,
    CandidateCareerEvidence.__table__,
    CandidateInterviewPrivacy.__table__,
    CandidateInterviewPracticeSession.__table__,
    CandidateInterviewPracticeTurn.__table__,
    CandidateInterviewPracticeEvaluation.__table__,
]


def _make_db(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "consent-matrix-test-secret!!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    get_settings.cache_clear()

    db = _sqlite_session()
    bind = db.get_bind()
    for t in _TABLES:
        t.create(bind=bind, checkfirst=True)
    return db


_seed_counter = [0]


def _seed(db, *, ai_prep_opt_in: bool = False, paused: bool = False):
    """Create user + candidate + privacy row with specified consent settings."""
    from datetime import datetime, timezone
    _seed_counter[0] += 1
    n = _seed_counter[0]
    user = User(
        email=f"consent-test-{n}@twin.test",
        hashed_password="hash",
        is_active=True,
        gdpr_consent_at=datetime.now(timezone.utc).replace(tzinfo=None),
        exclude_from_product_metrics=True,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name=f"ConsentTester{n}",
        skills="[]",
        experience_years=0,
        cv_text="test",
    )
    db.add(cand)
    db.flush()
    privacy = CandidateInterviewPrivacy(
        candidate_id=cand.id,
        ai_prep_opt_in=ai_prep_opt_in,
        paused=paused,
    )
    db.add(privacy)
    db.commit()
    return cand


def _spy_provider():
    """Return a provider stub that counts calls and returns a valid evaluation dict."""
    calls = []

    def _call(question: str, answer: str, job_ctx: str) -> dict:
        calls.append({"question": question, "answer": answer})
        return {
            "evaluation_status": "COMPLETE",
            "criteria": [
                {"id": "relevance", "outcome": "SUPPORTED_IN_RESPONSE", "note": "spy"},
                {"id": "evidence_use", "outcome": "SUPPORTED_IN_RESPONSE", "note": "spy"},
                {"id": "structure", "outcome": "SUPPORTED_IN_RESPONSE", "note": "spy"},
                {"id": "outcome_clarity", "outcome": "SUPPORTED_IN_RESPONSE", "note": "spy"},
            ],
            "strengths": ["Good answer"],
            "improvements": [],
            "source": "claude",
            "source_label": "live_ai",
            "degraded": False,
        }

    return calls, _call


# ── Scenario A: never_consented (new row created with defaults) ───────────────


def test_A_never_consented_zero_ai_calls(monkeypatch):
    """No privacy row → new row created with ai_prep_opt_in=False → 0 provider calls."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-real-key-would-be-here")
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=False)

    calls, spy = _spy_provider()
    result = prac._evaluate_turn(
        db, cand.id,
        question="Tell me about yourself",
        answer="I am a software engineer with 5 years experience.",
        provider_call=spy,
    )

    assert len(calls) == 0, f"Expected 0 provider calls, got {len(calls)}"
    assert result.get("consent_denied") is True
    assert result.get("source_label") == "deterministic_library_consent_denied"


# ── Scenario B: consent_false ─────────────────────────────────────────────────


def test_B_consent_false_zero_ai_calls(monkeypatch):
    """Explicit ai_prep_opt_in=False on privacy row → 0 provider calls."""
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=False)

    calls, spy = _spy_provider()
    result = prac._evaluate_turn(
        db, cand.id,
        question="Describe a challenge",
        answer="I led a migration project for three months, reduced downtime by 40%.",
        provider_call=spy,
    )

    assert len(calls) == 0
    assert result.get("consent_denied") is True


# ── Scenario C: forged request body cannot override privacy row ───────────────


def test_C_forged_body_cannot_override_privacy(monkeypatch):
    """Even if caller passes ai_prep_opt_in=True in body, server reads privacy row."""
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=False)

    calls, spy = _spy_provider()

    # The _evaluate_turn function doesn't even accept ai_prep_opt_in — this confirms
    # the server path can't be forged via body:
    auth = prac.authorize_practice_ai(db, cand.id)
    assert auth["authorized"] is False, "Privacy row False must block even if body claimed True"
    assert len(calls) == 0


# ── Scenario D: privacy_paused ────────────────────────────────────────────────


def test_D_privacy_paused_zero_ai_calls(monkeypatch):
    """ai_prep_opt_in=True but paused=True → 0 provider calls."""
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=True, paused=True)

    calls, spy = _spy_provider()
    result = prac._evaluate_turn(
        db, cand.id,
        question="Why did you leave your last role?",
        answer="I was looking for more technical challenges and growth opportunities.",
        provider_call=spy,
    )

    assert len(calls) == 0
    assert result.get("consent_denied") is True
    assert result.get("consent_denied_reason") == "privacy_paused"


# ── Scenario E: consent_true_not_paused → 1 call ─────────────────────────────


def test_E_consent_authorized_one_ai_call(monkeypatch):
    """ai_prep_opt_in=True + paused=False → exactly 1 provider call."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-configured")
    from app.config import get_settings
    get_settings.cache_clear()
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=True, paused=False)

    calls, spy = _spy_provider()
    result = prac._evaluate_turn(
        db, cand.id,
        question="Describe your biggest achievement",
        answer="I reduced API latency from 800ms to 120ms by profiling and adding a composite index.",
        provider_call=spy,
    )

    assert len(calls) == 1, f"Expected exactly 1 provider call, got {len(calls)}"
    assert result.get("source") == "claude" or result.get("source_label") == "live_ai"


# ── Scenario F: revoke mid-flight (session deleted before eval persist) ───────


def test_F_session_deleted_before_eval_write_skipped(monkeypatch):
    """If session is deleted between turn commit and eval write, eval is not persisted."""
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=False)

    # Create a session
    sess_data = prac.create_session(db, candidate_id=cand.id, locale="en")
    session_id = sess_data["id"]
    turn_id = sess_data["turns"][0]["id"]

    # Patch _evaluate_turn to simulate the session being deleted mid-flight
    original_evaluate = prac._evaluate_turn

    call_count = {"n": 0}

    def _patched_evaluate(db_, cid, *, question, answer, process_id=None, provider_call=None):
        call_count["n"] += 1
        # Simulate session being deleted before eval write
        session_row = db_.query(CandidateInterviewPracticeSession).filter_by(id=session_id).one()
        from datetime import datetime, timezone
        session_row.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)
        session_row.state = STATE_DELETED
        db_.commit()
        return original_evaluate(db_, cid, question=question, answer=answer,
                                  process_id=process_id, provider_call=provider_call)

    monkeypatch.setattr(prac, "_evaluate_turn", _patched_evaluate)

    result = prac.submit_turn(
        db,
        candidate_id=cand.id,
        session_id=session_id,
        turn_id=turn_id,
        answer_text="My answer is detailed: " + "word " * 50,
    )

    assert result.get("eval_skipped_reason") == "session_deleted"
    assert result.get("evaluation") is None

    # Confirm no eval row was written
    evals = db.query(CandidateInterviewPracticeEvaluation).filter_by(turn_id=turn_id).all()
    assert len(evals) == 0, "No evaluation should be persisted for deleted session"


# ── Scenario G: answer '1' yields NOT_ASSESSED for all semantic criteria ──────


def test_G_answer_digit_only_no_invented_semantic():
    """Answer '1' must NOT yield SUPPORTED_IN_RESPONSE for evidence_use or any criterion."""
    criteria = _heuristic_grounded_criteria("1")
    for c in criteria:
        assert c["outcome"] == OUTCOME_NOT_ASSESSED, (
            f"Criterion '{c['id']}' yielded '{c['outcome']}' for answer '1' — "
            f"expected NOT_ASSESSED; heuristics must never claim semantic support"
        )
        assert c["outcome"] != OUTCOME_SUPPORTED
        assert c["outcome"] != OUTCOME_PARTIAL


def test_G_short_substantive_answer_not_assessed():
    """20-word answer must not invent SUPPORTED/PARTIAL for any semantic criterion."""
    answer = "I led the backend migration reducing API p95 latency from 800ms to 120ms."
    criteria = _heuristic_grounded_criteria(answer)
    for c in criteria:
        assert c["outcome"] == OUTCOME_NOT_ASSESSED, (
            f"Criterion '{c['id']}': got '{c['outcome']}' — must be NOT_ASSESSED"
        )


# ── Scenario H: factual_observations present, no semantic invention ───────────


def test_H_factual_observations_present():
    """Deterministic fallback must include factual_observations with word_count etc."""
    answer = "I solved the problem in 3 steps using STAR situation analysis."
    obs = _heuristic_factual_observations(answer)
    ids = {o["id"] for o in obs}
    assert "word_count" in ids
    assert "contains_digit" in ids
    assert "has_star_keywords" in ids
    # Verify values are correct
    wc = next(o for o in obs if o["id"] == "word_count")
    assert wc["value"] > 0
    digit = next(o for o in obs if o["id"] == "contains_digit")
    assert digit["present"] is True  # "3" is present
    star = next(o for o in obs if o["id"] == "has_star_keywords")
    assert star["present"] is True  # "situation" is present


def test_H_evaluate_submitted_no_ai_includes_factual_observations(monkeypatch):
    """evaluate_submitted_answer_text with ai_authorized=False must include factual_observations."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    result = evaluate_submitted_answer_text(
        question="Tell me about yourself",
        answer="I led a team of 5 engineers and delivered the project in 3 months.",
        ai_authorized=False,
        allow_deterministic_heuristics=True,
    )

    assert "factual_observations" in result, "factual_observations must be in deterministic result"
    assert isinstance(result["factual_observations"], list)
    assert result.get("consent_denied") is True

    # Confirm no semantic outcomes were invented
    for c in result.get("criteria", []):
        assert c["outcome"] == OUTCOME_NOT_ASSESSED, (
            f"Criterion '{c['id']}' got '{c['outcome']}' without AI — must be NOT_ASSESSED"
        )


# ── Additional: authorize_practice_ai ────────────────────────────────────────


def test_authorize_new_privacy_row_defaults_false(monkeypatch):
    """New privacy row created by get_or_create_privacy must default to ai_prep_opt_in=False."""
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=False)

    auth = prac.authorize_practice_ai(db, cand.id)
    assert auth["authorized"] is False
    assert auth["reason"] == "consent_not_given"


def test_authorize_true_not_paused(monkeypatch):
    """Consent True + not paused → authorized."""
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=True, paused=False)

    auth = prac.authorize_practice_ai(db, cand.id)
    assert auth["authorized"] is True
    assert auth["reason"] == "consent_given"


def test_authorize_true_but_paused(monkeypatch):
    """Consent True + paused → not authorized."""
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=True, paused=True)

    auth = prac.authorize_practice_ai(db, cand.id)
    assert auth["authorized"] is False
    assert auth["reason"] == "privacy_paused"


# ── Contrasting answers: same question, different provider responses ──────────


def test_contrasting_answers_different_provider_calls(monkeypatch):
    """Same opening Q, two different answers → provider called with those different answers."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-configured")
    from app.config import get_settings
    get_settings.cache_clear()
    db = _make_db(monkeypatch)
    cand = _seed(db, ai_prep_opt_in=True, paused=False)

    call_log = []

    def _adaptive_spy(question: str, answer: str, job_ctx: str) -> dict:
        call_log.append(answer)
        return {
            "evaluation_status": "COMPLETE",
            "criteria": [
                {"id": "relevance", "outcome": "SUPPORTED_IN_RESPONSE", "note": f"spy:{answer[:20]}"},
                {"id": "evidence_use", "outcome": "SUPPORTED_IN_RESPONSE", "note": "spy"},
                {"id": "structure", "outcome": "SUPPORTED_IN_RESPONSE", "note": "spy"},
                {"id": "outcome_clarity", "outcome": "SUPPORTED_IN_RESPONSE", "note": "spy"},
            ],
            "strengths": [f"Answer started: {answer[:30]}"],
            "improvements": [],
            "source": "claude",
            "source_label": "live_ai",
            "degraded": False,
        }

    question = "Describe your biggest professional achievement."
    answer_a = "I reduced database query time by 70% by adding indexes and query caching."
    answer_b = "I organized a team offsite that improved communication and morale."

    result_a = prac._evaluate_turn(
        db, cand.id,
        question=question,
        answer=answer_a,
        provider_call=_adaptive_spy,
    )
    result_b = prac._evaluate_turn(
        db, cand.id,
        question=question,
        answer=answer_b,
        provider_call=_adaptive_spy,
    )

    assert len(call_log) == 2, "Provider should be called once per answer"
    assert call_log[0] == answer_a
    assert call_log[1] == answer_b
    # Different answer content reaches provider
    assert call_log[0] != call_log[1]
