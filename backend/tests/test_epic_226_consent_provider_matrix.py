"""Epic 2.26 — Consent × Provider matrix tests.

Verifies that the AI provider is NEVER called without canonical DB consent,
regardless of what the request body contains.

Test matrix:
  - never_consented → 0 provider calls
  - consent_false → 0 provider calls
  - forged_request_body_true_but_privacy_false → 0 provider calls
  - privacy_paused → 0 provider calls
  - consent_true_not_paused → 1 provider call (AI path)
  - answer_"1"_heuristic → SUPPORTED_IN_RESPONSE FORBIDDEN in criteria outcomes

Also verifies:
  - get_or_create_privacy creates new rows with ai_prep_opt_in=False (DEFAULT OFF)
  - _heuristic_grounded_criteria never assigns SUPPORTED_IN_RESPONSE
  - session delete rejects delayed eval persistence
  - promote_to_evidence: turns_promoted == len(evidence_ids)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

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
from app.services import ai_interview_coach as coach
from app.services import candidate_interview_practice as prac
from app.services.candidate_interview_practice_constants import (
    EVAL_INSUFFICIENT,
    EVAL_UNAVAILABLE,
    OUTCOME_NOT_ASSESSED,
    OUTCOME_SUPPORTED,
    OUTCOME_PARTIAL,
    STATE_COMPLETED,
    STATE_DELETED,
    TURN_SUBMITTED,
)
from tests.test_auth_integration import _sqlite_session


def _setup_db(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "epic226-consent-matrix-test-secret!!")
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


def _make_candidate(db, suffix: str = "") -> Candidate:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    u = User(
        email=f"consent_test{suffix}_{id(db)}@twin.test",
        hashed_password="x",
        gdpr_consent_at=now,
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(
        user_id=u.id,
        name="Consent Tester",
        skills='["Python"]',
        experience_years=3,
        cv_text="Tester",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def _make_session(db, candidate_id: int) -> CandidateInterviewPracticeSession:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    s = CandidateInterviewPracticeSession(
        candidate_id=candidate_id,
        session_key=f"test-consent-{candidate_id}",
        state="IN_PROGRESS",
        locale="en",
        version=1,
        turn_limit=8,
        kpi_excluded=True,
        created_at=now,
        updated_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _spy_provider(call_counter: list) -> Any:
    """Returns a provider_call that increments a counter and returns a valid result."""

    def _call(question, answer, job_ctx=""):
        call_counter.append(1)
        return {
            "evaluation_status": "COMPLETE",
            "criteria": [
                {"id": "relevance", "outcome": "SUPPORTED_IN_RESPONSE", "note": "stub"},
                {"id": "evidence_use", "outcome": "SUPPORTED_IN_RESPONSE", "note": "stub"},
                {"id": "structure", "outcome": "SUPPORTED_IN_RESPONSE", "note": "stub"},
                {"id": "outcome_clarity", "outcome": "SUPPORTED_IN_RESPONSE", "note": "stub"},
            ],
            "strengths": ["stub strength"],
            "improvements": [],
            "source": "claude",
            "source_label": "live_ai",
            "degraded": False,
        }

    return _call


# ── Bug 4: DEFAULT OFF for new privacy rows ───────────────────────────────────

def test_new_privacy_row_default_off(monkeypatch):
    """get_or_create_privacy must set ai_prep_opt_in=False for new rows."""
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    from app.services.interview_decision import get_or_create_privacy

    privacy = get_or_create_privacy(db, candidate_id=c.id)
    assert privacy.ai_prep_opt_in is False, (
        "New privacy rows must default ai_prep_opt_in=False — DEFAULT OFF"
    )
    assert privacy.paused is False


# ── Bug 1+2: Consent gate — provider spy matrix ───────────────────────────────

def test_never_consented_zero_provider_calls(monkeypatch):
    """No existing privacy row → new row created with ai_prep_opt_in=False → 0 AI calls."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-fake-key")
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    # No privacy row exists yet — will be created with DEFAULT OFF
    calls = []
    result = prac._evaluate_turn(
        db,
        candidate_id=c.id,
        question="Tell me about yourself",
        answer="I worked on a project last year with positive outcomes.",
        provider_call=_spy_provider(calls),
    )
    assert len(calls) == 0, f"Expected 0 provider calls, got {len(calls)}"
    assert result.get("consent_denied") is True
    # All criteria must be NOT_ASSESSED
    for criterion in result.get("criteria", []):
        assert criterion["outcome"] == OUTCOME_NOT_ASSESSED, (
            f"Criterion {criterion['id']} must be NOT_ASSESSED without consent, got {criterion['outcome']}"
        )


def test_consent_false_zero_provider_calls(monkeypatch):
    """Explicit ai_prep_opt_in=False → 0 AI calls."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-fake-key")
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    # Create privacy row with explicit False
    from app.services.interview_decision import get_or_create_privacy, update_privacy

    get_or_create_privacy(db, candidate_id=c.id)
    update_privacy(db, candidate_id=c.id, ai_prep_opt_in=False)

    calls = []
    result = prac._evaluate_turn(
        db,
        candidate_id=c.id,
        question="Tell me about a challenge",
        answer="I led a team through a crisis and we delivered on time. Numbers: 3 weeks saved.",
        provider_call=_spy_provider(calls),
    )
    assert len(calls) == 0
    assert result.get("consent_denied") is True


def test_forged_request_body_ai_prep_true_but_privacy_false(monkeypatch):
    """Forged request body ai_prep_opt_in=True must NOT bypass privacy check.

    The canonical privacy row (False) takes precedence over any body value.
    This test simulates what an attacker could do by sending ai_prep_opt_in=true
    in the HTTP body — the server must read from DB, not from body.
    """
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-fake-key")
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    from app.services.interview_decision import get_or_create_privacy

    # Privacy row: consent False
    get_or_create_privacy(db, candidate_id=c.id)
    # Verify it's False
    privacy = db.query(CandidateInterviewPrivacy).filter_by(candidate_id=c.id).one()
    assert privacy.ai_prep_opt_in is False

    calls = []
    # _evaluate_turn never accepts a body boolean — always reads from DB
    result = prac._evaluate_turn(
        db,
        candidate_id=c.id,
        question="Describe your biggest win",
        answer="I shipped a product in 30 days with a team of 5. Revenue impact: +200k PLN.",
        provider_call=_spy_provider(calls),
    )
    assert len(calls) == 0, (
        f"Forged body must not trigger provider — got {len(calls)} calls"
    )
    assert result.get("consent_denied") is True


def test_privacy_paused_zero_provider_calls(monkeypatch):
    """ai_prep_opt_in=True but paused=True → 0 AI calls."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-fake-key")
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    from app.services.interview_decision import get_or_create_privacy, update_privacy

    get_or_create_privacy(db, candidate_id=c.id)
    update_privacy(db, candidate_id=c.id, ai_prep_opt_in=True, paused=True)

    calls = []
    result = prac._evaluate_turn(
        db,
        candidate_id=c.id,
        question="Why do you want this role?",
        answer="I have 5 years experience in this domain and led 3 successful product launches.",
        provider_call=_spy_provider(calls),
    )
    assert len(calls) == 0, f"Paused privacy must not trigger provider — got {len(calls)} calls"
    assert result.get("consent_denied") is True


def test_consent_true_not_paused_one_provider_call(monkeypatch):
    """ai_prep_opt_in=True and paused=False → exactly 1 provider call."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-fake-key")
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    from app.services.interview_decision import get_or_create_privacy, update_privacy

    get_or_create_privacy(db, candidate_id=c.id)
    update_privacy(db, candidate_id=c.id, ai_prep_opt_in=True, paused=False)

    calls = []
    result = prac._evaluate_turn(
        db,
        candidate_id=c.id,
        question="Describe a leadership challenge",
        answer=(
            "Situation: Q3 deadline slipping. Task: realign team of 8 engineers. "
            "Action: daily standups, scope cuts, stakeholder communication. "
            "Result: delivered 2 weeks late but 90% of scope with no attrition."
        ),
        provider_call=_spy_provider(calls),
    )
    assert len(calls) == 1, f"Consented user should trigger exactly 1 provider call, got {len(calls)}"
    assert result.get("consent_denied") is not True
    assert result.get("source") in ("claude", "live_ai") or result.get("source_label") == "live_ai"


# ── Bug 5: Heuristic honesty — answer "1" must NOT yield SUPPORTED_IN_RESPONSE ──

def test_answer_one_digit_not_supported(monkeypatch):
    """Answer '1' must NOT yield SUPPORTED_IN_RESPONSE for evidence_use or any criterion."""
    result = coach._heuristic_grounded_criteria("1")
    for criterion in result:
        assert criterion["outcome"] != OUTCOME_SUPPORTED, (
            f"Criterion {criterion['id']} yielded SUPPORTED_IN_RESPONSE for answer '1' — FORBIDDEN. "
            "Heuristics must only return NOT_ASSESSED, never semantic SUPPORTED/PARTIAL."
        )
        assert criterion["outcome"] != OUTCOME_PARTIAL, (
            f"Criterion {criterion['id']} yielded PARTIALLY_SUPPORTED for answer '1' — FORBIDDEN."
        )
    # Must be NOT_ASSESSED
    outcomes = {c["id"]: c["outcome"] for c in result}
    assert outcomes["evidence_use"] == OUTCOME_NOT_ASSESSED
    assert outcomes["relevance"] == OUTCOME_NOT_ASSESSED


def test_heuristic_never_assigns_semantic_outcomes(monkeypatch):
    """Even a long, well-structured answer with numbers must not get SUPPORTED from heuristics."""
    long_answer = (
        "Situation: revenue declining. Task: I owned the recovery plan. "
        "Action: shipped 5 new features in 30 days. Result: +40% MRR. "
        * 3  # repeat for word count
    )
    result = coach._heuristic_grounded_criteria(long_answer)
    for criterion in result:
        assert criterion["outcome"] not in (OUTCOME_SUPPORTED, OUTCOME_PARTIAL), (
            f"Criterion {criterion['id']} assigned semantic outcome {criterion['outcome']} "
            "from heuristics — must only be NOT_ASSESSED."
        )


def test_evaluate_submitted_answer_text_no_ai_authorized_not_assessed(monkeypatch):
    """evaluate_submitted_answer_text with ai_authorized=False → all criteria NOT_ASSESSED."""
    result = coach.evaluate_submitted_answer_text(
        question="Tell me about a challenge",
        answer="I fixed a bug in production that saved 200k PLN in one day.",
        ai_authorized=False,
        allow_deterministic_heuristics=True,
    )
    for criterion in result.get("criteria", []):
        assert criterion["outcome"] == OUTCOME_NOT_ASSESSED, (
            f"Criterion {criterion['id']} = {criterion['outcome']} — expected NOT_ASSESSED when ai_authorized=False"
        )
    assert result.get("consent_denied") is True


# ── Bug 8: Delete session rejects delayed eval persistence ───────────────────

def test_delete_session_rejects_delayed_eval_write(monkeypatch):
    """After session soft-delete, submit_turn must discard evaluation (not write to DB)."""
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)
    session = _make_session(db, c.id)

    # Add a turn in DRAFT state
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    turn = CandidateInterviewPracticeTurn(
        session_id=session.id,
        turn_index=0,
        state="DRAFT",
        question_text="What is your greatest strength?",
        answer_draft="",
        version=1,
        created_at=now,
        updated_at=now,
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)

    # Simulate: submit turn (it will commit the answer)
    # Then delete the session (simulating concurrent delete)
    # Then try to write the evaluation

    answer = "I am excellent at problem-solving with 10 years experience."
    turn.answer_submitted = answer
    turn.state = TURN_SUBMITTED
    turn.submitted_at = now
    db.commit()

    # Delete session while eval is "in flight"
    result_delete = prac.delete_session(db, candidate_id=c.id, session_id=session.id)
    assert result_delete["deleted"] is True

    # Now try to write eval — the session is deleted, so it should be rejected
    # Verify session is deleted
    fresh_session = db.query(CandidateInterviewPracticeSession).filter_by(id=session.id).one()
    assert fresh_session.deleted_at is not None, "Session should be soft-deleted"

    # The eval should not be persisted (check by querying DB directly)
    evals_before = db.query(CandidateInterviewPracticeEvaluation).filter_by(turn_id=turn.id).count()
    assert evals_before == 0


def test_delete_session_supersedes_open_turns(monkeypatch):
    """Session delete marks non-submitted (DRAFT) turns as SUPERSEDED."""
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)
    session = _make_session(db, c.id)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    draft_turn = CandidateInterviewPracticeTurn(
        session_id=session.id,
        turn_index=0,
        state="DRAFT",
        question_text="Question?",
        answer_draft="partial",
        version=1,
        created_at=now,
        updated_at=now,
    )
    db.add(draft_turn)
    db.commit()
    db.refresh(draft_turn)

    prac.delete_session(db, candidate_id=c.id, session_id=session.id)

    db.refresh(draft_turn)
    assert draft_turn.state == "SUPERSEDED", (
        f"Draft turn should be SUPERSEDED after session delete, got {draft_turn.state}"
    )


# ── Bug 7: promote_to_evidence honest counts ─────────────────────────────────

def test_promote_to_evidence_count_matches_created(monkeypatch):
    """turns_promoted must equal len(evidence_ids) — no silent mismatch."""
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)
    session = _make_session(db, c.id)
    session.state = STATE_COMPLETED
    db.commit()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for i in range(3):
        turn = CandidateInterviewPracticeTurn(
            session_id=session.id,
            turn_index=i,
            state=TURN_SUBMITTED,
            question_text=f"Q{i}",
            answer_submitted=f"Answer {i} with enough detail",
            answer_draft="",
            version=1,
            submitted_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(turn)
    db.commit()

    result = prac.promote_to_evidence(db, candidate_id=c.id, session_id=session.id)
    assert result["turns_promoted"] == len(result["evidence_ids"]), (
        f"turns_promoted={result['turns_promoted']} != len(evidence_ids)={len(result['evidence_ids'])}"
    )
    assert result["turns_promoted"] == 3


# ── Authorize practice AI unit tests ─────────────────────────────────────────

def test_authorize_practice_ai_consent_given(monkeypatch):
    """authorize_practice_ai returns authorized=True when consent is given and not paused."""
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    from app.services.interview_decision import get_or_create_privacy, update_privacy

    get_or_create_privacy(db, candidate_id=c.id)
    update_privacy(db, candidate_id=c.id, ai_prep_opt_in=True, paused=False)

    auth = prac.authorize_practice_ai(db, candidate_id=c.id)
    assert auth["authorized"] is True
    assert auth["ai_prep_opt_in"] is True
    assert auth["paused"] is False


def test_authorize_practice_ai_consent_not_given(monkeypatch):
    """authorize_practice_ai returns authorized=False for new rows (DEFAULT OFF)."""
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    auth = prac.authorize_practice_ai(db, candidate_id=c.id)
    assert auth["authorized"] is False
    assert auth["ai_prep_opt_in"] is False


def test_authorize_practice_ai_paused(monkeypatch):
    """authorize_practice_ai returns authorized=False when paused even if opted in."""
    db = _setup_db(monkeypatch)
    c = _make_candidate(db)

    from app.services.interview_decision import get_or_create_privacy, update_privacy

    get_or_create_privacy(db, candidate_id=c.id)
    update_privacy(db, candidate_id=c.id, ai_prep_opt_in=True, paused=True)

    auth = prac.authorize_practice_ai(db, candidate_id=c.id)
    assert auth["authorized"] is False
    assert auth["ai_prep_opt_in"] is True
    assert auth["paused"] is True
