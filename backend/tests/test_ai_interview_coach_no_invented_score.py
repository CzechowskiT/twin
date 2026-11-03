"""Epic 2.26 — AI interview coach: no invented score, honest degradation.

Tests:
- evaluate_answer fallback never returns int score inventing precision
- Empty answer → INSUFFICIENT_INFORMATION
- Unavailable path sets score=None, score_available=False
- evaluate_submitted_answer_text consistent behaviour
"""

from __future__ import annotations

import sys
import types
import unittest.mock as mock

import pytest


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_job(title: str = "Engineer", company: str = "ACME") -> object:
    """Minimal Job-like object for testing."""
    job = mock.MagicMock()
    job.title = title
    job.company = company
    job.description = "Build things."
    job.requirements = "Python, tests."
    job.location = "Remote"
    job.salary_range = ""
    return job


def _import_coach():
    from app.services.ai_interview_coach import (
        evaluate_answer,
        evaluate_submitted_answer_text,
        _insufficient_evaluation,
        _unavailable_evaluation,
    )
    return evaluate_answer, evaluate_submitted_answer_text, _insufficient_evaluation, _unavailable_evaluation


# ── Tests: evaluate_answer ────────────────────────────────────────────────────


def test_empty_answer_returns_insufficient():
    """Empty answer must return INSUFFICIENT_INFORMATION, never a numeric score."""
    evaluate_answer, _, _, _ = _import_coach()
    job = _make_job()
    result = evaluate_answer(job, "Tell me about yourself", "")
    assert result["evaluation_status"] == "INSUFFICIENT_INFORMATION"
    assert result["score"] is None
    assert result["score_available"] is False


def test_whitespace_answer_returns_insufficient():
    evaluate_answer, _, _, _ = _import_coach()
    job = _make_job()
    result = evaluate_answer(job, "Describe a project", "   \n\t  ")
    assert result["evaluation_status"] == "INSUFFICIENT_INFORMATION"
    assert result["score"] is None


def test_fallback_no_anthropic_returns_unavailable_or_deterministic(monkeypatch):
    """When Anthropic is not configured, must NOT invent a 0-100 score."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    evaluate_answer, _, _, _ = _import_coach()
    job = _make_job()
    result = evaluate_answer(job, "Why this role?", "I want to grow professionally.", allow_deterministic_heuristics=False)

    assert result["score"] is None, "score must be None when AI unavailable"
    assert result["score_available"] is False
    assert result["evaluation_status"] in (
        "EVALUATION_UNAVAILABLE", "INSUFFICIENT_INFORMATION"
    ), f"Unexpected status: {result['evaluation_status']}"
    assert result.get("degraded") is True


def test_deterministic_heuristics_never_invented_score(monkeypatch):
    """Deterministic fallback returns labeled criteria without global 0-100."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    evaluate_answer, _, _, _ = _import_coach()
    job = _make_job()
    result = evaluate_answer(
        job,
        "Describe a challenge",
        "I led a migration project. First I analysed the situation, then took action, result was successful.",
        allow_deterministic_heuristics=True,
    )
    assert result["score"] is None
    assert result["score_available"] is False
    assert isinstance(result["criteria"], list)
    assert len(result["criteria"]) > 0
    for c in result["criteria"]:
        assert "outcome" in c
        assert c["outcome"] in {
            "SUPPORTED_IN_RESPONSE", "PARTIALLY_SUPPORTED",
            "NOT_DEMONSTRATED", "NOT_ASSESSED",
            "INSUFFICIENT_INFORMATION", "EVALUATION_UNAVAILABLE",
        }


def test_criteria_outcomes_are_valid_enum_values(monkeypatch):
    """All criterion outcomes must be from the allowed enum set."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    from app.services.candidate_interview_practice_constants import CRITERION_OUTCOMES
    evaluate_answer, _, _, _ = _import_coach()
    job = _make_job()
    result = evaluate_answer(
        job,
        "How do you prioritize?",
        "I use impact vs effort matrix to decide. Then I validate with stakeholders.",
        allow_deterministic_heuristics=True,
    )
    for c in result.get("criteria", []):
        assert c["outcome"] in CRITERION_OUTCOMES, f"Invalid outcome: {c['outcome']}"


# ── Tests: evaluate_submitted_answer_text ────────────────────────────────────


def test_submitted_empty_returns_insufficient():
    _, evaluate_submitted_answer_text, _, _ = _import_coach()
    result = evaluate_submitted_answer_text(question="Q", answer="")
    assert result["evaluation_status"] == "INSUFFICIENT_INFORMATION"
    assert result["score"] is None
    assert result["score_available"] is False


def test_submitted_unavailable_no_invented_score(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    _, evaluate_submitted_answer_text, _, _ = _import_coach()
    result = evaluate_submitted_answer_text(
        question="Why do you want this role?",
        answer="Because I am passionate about the domain.",
        allow_deterministic_heuristics=False,
    )
    assert result["score"] is None
    assert result["score_available"] is False
    assert result.get("degraded") is True


def test_submitted_deterministic_no_invented_score(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    _, evaluate_submitted_answer_text, _, _ = _import_coach()
    result = evaluate_submitted_answer_text(
        question="Tell me about a conflict",
        answer="There was a disagreement with a colleague. I first listened to their view. "
               "Then we found a middle ground. The result was a better product decision.",
        allow_deterministic_heuristics=True,
    )
    assert result["score"] is None
    assert result["score_available"] is False
    assert isinstance(result["criteria"], list)


# ── Tests: _unavailable_evaluation internals ─────────────────────────────────


def test_unavailable_evaluation_never_integer_score():
    from app.services.ai_interview_coach import _unavailable_evaluation
    result = _unavailable_evaluation(reason="provider offline", answer="some text")
    assert result["score"] is None
    assert result["score_available"] is False
    assert result["degraded"] is True
    assert result["evaluation_status"] == "EVALUATION_UNAVAILABLE"


def test_insufficient_evaluation_never_integer_score():
    from app.services.ai_interview_coach import _insufficient_evaluation
    result = _insufficient_evaluation(answer="")
    assert result["score"] is None
    assert result["score_available"] is False
    assert result["evaluation_status"] == "INSUFFICIENT_INFORMATION"


def test_injection_string_does_not_crash(monkeypatch):
    """Injection-like strings must not crash the coach (no AI call here)."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    evaluate_answer, _, _, _ = _import_coach()
    job = _make_job()
    injection = "'; DROP TABLE candidates; --<script>alert(1)</script>"
    result = evaluate_answer(job, injection, injection, allow_deterministic_heuristics=True)
    assert result["score"] is None  # no crash, no invented score
