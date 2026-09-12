"""Epic 2.26 — provider execution metadata end-to-end integration.

provider adapter → evaluation persistence → API serializer shape → validator.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.database.models import (
    Candidate,
    CandidateInterviewPracticeEvaluation,
    CandidateInterviewPracticeSession,
    CandidateInterviewPracticeTurn,
    CandidateInterviewPrivacy,
    User,
)
from app.services import candidate_interview_practice as prac
from app.services.live_ai_quality_validator import check_harness_case, check_live_case
from app.services.provider_execution_metadata import KIND_LIVE, KIND_STUB
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "epic226-meta-test-secret!!!!!!!!!!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in [
        User.__table__,
        Candidate.__table__,
        CandidateInterviewPrivacy.__table__,
        CandidateInterviewPracticeSession.__table__,
        CandidateInterviewPracticeTurn.__table__,
        CandidateInterviewPracticeEvaluation.__table__,
    ]:
        table.create(bind=bind, checkfirst=True)
    return db


def _cand(db, *, email: str) -> Candidate:
    now = datetime.now(timezone.utc)
    u = User(email=email, hashed_password="x", gdpr_consent_at=now)
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Meta", skills='["Python"]', experience_years=2, cv_text="x")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def _enable_consent(db, candidate_id: int) -> None:
    privacy = prac.get_or_create_privacy(db, candidate_id=candidate_id) if hasattr(prac, "get_or_create_privacy") else None
    from app.services.interview_decision import get_or_create_privacy

    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    privacy.ai_prep_opt_in = True
    privacy.paused = False
    db.commit()


def test_stub_provider_metadata_persists_and_api_shape_rejects_live(monkeypatch):
    db = _setup(monkeypatch)
    c = _cand(db, email="meta-stub@example.com")
    _enable_consent(db, c.id)

    def stub_provider(question, answer, job_ctx):
        return {
            "criteria": [
                {"id": "relevance", "outcome": "PARTIALLY_SUPPORTED", "note": "ok"},
                {"id": "structure", "outcome": "PARTIALLY_SUPPORTED", "note": "ok"},
            ],
            "strengths": ["clear"],
            "improvements": ["more detail"],
            "evaluation_status": "COMPLETE",
            "model": "synthetic-harness",
        }

    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="behavioral_star_1", locale="en"
    )
    turn_id = sess["turns"][0]["id"]
    session_id = sess["id"]

    result = prac.submit_turn(
        db,
        candidate_id=c.id,
        session_id=session_id,
        turn_id=turn_id,
        answer_text="Situation: conflict. Task: mediate. Action: trade-off. Result: shipped.",
        provider_call=stub_provider,
    )
    evaluation = result["evaluation"]
    assert evaluation is not None
    pe = evaluation.get("provider_execution")
    assert isinstance(pe, dict)
    assert pe.get("kind") == KIND_STUB
    assert pe.get("execution_id")
    assert pe.get("input_turn_id") == turn_id
    assert pe.get("input_revision") is not None
    assert evaluation.get("execution_kind") == KIND_STUB

    # Persisted row
    row = (
        db.query(CandidateInterviewPracticeEvaluation)
        .filter_by(turn_id=turn_id)
        .one()
    )
    assert row.provider_execution_json
    assert "execution_id" in row.provider_execution_json

    live = check_live_case(
        {"id": "concise_relevant"},
        evaluation,
        expected={"turn_id": turn_id, "revision": pe.get("input_revision")},
    )
    assert live["passed"] is False
    assert live["verification_kind"] == "LIVE_QUALITY_FAILED"

    harness = check_harness_case(
        {"id": "valid_alternative"},
        {
            **evaluation,
            "source": "provider_stub_certified",
            "source_label": "provider_stub_certified",
        },
    )
    assert harness["passed"] is True
    assert harness["verification_kind"] == "HARNESS_VERIFIED"


def test_missing_metadata_after_strip_fails_live(monkeypatch):
    db = _setup(monkeypatch)
    c = _cand(db, email="meta-missing@example.com")
    _enable_consent(db, c.id)

    def stub_provider(question, answer, job_ctx):
        return {
            "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
            "strengths": [],
            "improvements": [],
            "evaluation_status": "COMPLETE",
        }

    sess = prac.create_session(
        db, candidate_id=c.id, exercise_id="behavioral_star_1", locale="en"
    )
    turn_id = sess["turns"][0]["id"]
    result = prac.submit_turn(
        db,
        candidate_id=c.id,
        session_id=sess["id"],
        turn_id=turn_id,
        answer_text="A structured STAR answer with concrete actions and results.",
        provider_call=stub_provider,
    )
    evaluation = dict(result["evaluation"])
    # Simulate runner stripping server metadata / synthesizing executed=true
    evaluation.pop("provider_execution", None)
    evaluation["source"] = "claude"
    evaluation["source_label"] = "live_ai"
    live = check_live_case(
        {"id": "concise_relevant"},
        evaluation,
        provider_execution={"executed": True, "source": "claude", "model": "claude-live"},
    )
    assert live["passed"] is False
    assert any(
        "provider_execution" in f for f in live["failures"]
    )


def test_mismatched_turn_binding_fails_live(monkeypatch):
    pe = {
        "execution_id": "exec-1",
        "kind": KIND_LIVE,
        "provider": "anthropic",
        "configured_model": "claude-x",
        "returned_model": "claude-x",
        "provider_request_id": "msg_1",
        "input_turn_id": 10,
        "input_revision": 1,
        "status": "completed",
        "prompt_version": "practice_eval_v1",
        "usage": None,
        "rubric_version": None,
    }
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
        "provider_execution": pe,
    }
    result = check_live_case(
        {"id": "concise_relevant"},
        eval_data,
        expected={"turn_id": 99, "revision": 1},
    )
    assert result["passed"] is False
    assert any("input_turn_mismatch" in f for f in result["failures"])
