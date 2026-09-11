"""AI Interview Coach — generate questions and evaluate answers.

Epic 2.26: never invent numeric precision when AI is unavailable.
Use EVALUATION_UNAVAILABLE + criterion outcomes instead of word-count scores.

Consent gate: ai_authorized=True required for any provider call.
"""

from __future__ import annotations

import re
from typing import Any, Callable

from app.database.models import Job
from app.services.anthropic_client import is_anthropic_configured
from app.services.career_assistant_common import call_claude_json, job_posting_text
from app.services.candidate_interview_practice_constants import (
    DETERMINISTIC_FALLBACK_LABEL,
    EVAL_INSUFFICIENT,
    EVAL_UNAVAILABLE,
    OUTCOME_INSUFFICIENT,
    OUTCOME_NOT_ASSESSED,
    OUTCOME_PARTIAL,
    OUTCOME_SUPPORTED,
    OUTCOME_UNAVAILABLE,
)

_ADAPTIVE_FOLLOWUP_PROMPT = """You are an interview coach generating a single follow-up question.
The candidate just answered the practice question below. Generate ONE targeted follow-up that:
- Probes a gap, assumption, or claim in their answer
- Is specific to THEIR answer, not generic
- Is a single clear sentence ending with '?'
Return ONLY JSON: {{"follow_up": "..."}}
Do NOT invent hiring probability, score, or claim the candidate is hired/rejected.
Question: {question}
Answer: {answer}
Exercise rubric: {rubric}
"""

_QUESTIONS_PROMPT = """Generate interview practice for this role. Return ONLY JSON:
{{
  "questions": [{{"id": "q1", "text": "...", "category": "behavioral|technical|culture"}}],
  "tips": ["..."]
}}
Rules: 5-7 questions, match job language, no invented candidate history.

JOB:
{job_ctx}
CV SNIPPET:
{cv}
"""

_EVAL_PROMPT = """Evaluate a candidate's interview answer. Return ONLY JSON:
{{
  "evaluation_status": "COMPLETE",
  "criteria": [
    {{"id": "relevance", "outcome": "SUPPORTED_IN_RESPONSE|PARTIALLY_SUPPORTED|NOT_DEMONSTRATED|INSUFFICIENT_INFORMATION", "note": "..."}},
    {{"id": "evidence_use", "outcome": "...", "note": "..."}},
    {{"id": "structure", "outcome": "...", "note": "..."}},
    {{"id": "outcome_clarity", "outcome": "...", "note": "..."}}
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "sample_better_answer": "..."
}}
Do NOT invent a hiring probability or global skill percentage.
Question: {question}
Answer: {answer}
Job context: {job_ctx}
"""


def _fallback_questions(job: Job) -> dict[str, Any]:
    title = job.title.strip()
    company = job.company.strip()
    return {
        "questions": [
            {"id": "q1", "text": f"Why {title} at {company}?", "category": "culture"},
            {"id": "q2", "text": "Describe a project you owned end-to-end.", "category": "behavioral"},
            {"id": "q3", "text": "How do you prioritize when requirements change?", "category": "behavioral"},
            {"id": "q4", "text": f"What skills matter most for {title}?", "category": "technical"},
            {"id": "q5", "text": "What questions do you have for us?", "category": "culture"},
        ],
        "tips": ["Use STAR for behavioral questions.", "Reference the job description vocabulary."],
        "source": DETERMINISTIC_FALLBACK_LABEL,
        "source_label": "deterministic_library",
    }


def generate_practice_questions(job: Job, cv_text: str) -> dict[str, Any]:
    """Return practice questions for a job posting."""
    ctx = job_posting_text(job)[:8000]
    cv = (cv_text or "")[:4000]
    if is_anthropic_configured():
        prompt = _QUESTIONS_PROMPT.format(job_ctx=ctx, cv=cv)
        data = call_claude_json(prompt, max_tokens=1800)
        if data and isinstance(data.get("questions"), list):
            data["source"] = "claude"
            data["source_label"] = "live_ai"
            return data
    return _fallback_questions(job)


def _unavailable_evaluation(*, reason: str, answer: str = "") -> dict[str, Any]:
    """Honest degraded state — never invent a 0–100 precision score."""
    words = len(re.findall(r"\w+", answer or ""))
    criteria = [
        {
            "id": "relevance",
            "outcome": OUTCOME_UNAVAILABLE,
            "note": reason,
        },
        {
            "id": "evidence_use",
            "outcome": OUTCOME_UNAVAILABLE,
            "note": reason,
        },
        {
            "id": "structure",
            "outcome": OUTCOME_NOT_ASSESSED if words == 0 else OUTCOME_UNAVAILABLE,
            "note": reason,
        },
        {
            "id": "outcome_clarity",
            "outcome": OUTCOME_UNAVAILABLE,
            "note": reason,
        },
    ]
    return {
        "evaluation_status": EVAL_UNAVAILABLE,
        "score": None,
        "score_available": False,
        "criteria": criteria,
        "strengths": [],
        "improvements": [
            "AI evaluation is unavailable. Your answer was saved; try again when the coach is ready, "
            "or use the deterministic practice checklist without a numeric score."
        ],
        "sample_better_answer": None,
        "source": DETERMINISTIC_FALLBACK_LABEL,
        "source_label": "unavailable_no_invented_score",
        "degraded": True,
    }


def _insufficient_evaluation(answer: str) -> dict[str, Any]:
    return {
        "evaluation_status": EVAL_INSUFFICIENT,
        "score": None,
        "score_available": False,
        "criteria": [
            {
                "id": "relevance",
                "outcome": OUTCOME_INSUFFICIENT,
                "note": "Empty or too short to assess",
            },
            {
                "id": "evidence_use",
                "outcome": OUTCOME_NOT_ASSESSED,
                "note": "No content",
            },
            {
                "id": "structure",
                "outcome": OUTCOME_NOT_ASSESSED,
                "note": "No content",
            },
            {
                "id": "outcome_clarity",
                "outcome": OUTCOME_NOT_ASSESSED,
                "note": "No content",
            },
        ],
        "strengths": [],
        "improvements": ["Answer cannot be empty."],
        "sample_better_answer": None,
        "source": DETERMINISTIC_FALLBACK_LABEL,
        "source_label": "insufficient_input",
        "degraded": True,
    }


def _heuristic_factual_observations(answer: str) -> list[dict]:
    """Return factual (non-semantic) observations about the answer text.

    NEVER assigned to semantic criteria like relevance/evidence_use/structure/outcome_clarity.
    Only reports what is verifiably present in the text.
    """
    words = len(re.findall(r"\w+", answer or ""))
    has_digit = bool(re.search(r"\d", answer or ""))
    has_star_keywords = bool(
        re.search(r"\b(situation|task|action|result|first|then|because)\b", answer or "", re.I)
    )
    return [
        {"id": "word_count", "value": words},
        {"id": "contains_digit", "present": has_digit},
        {"id": "has_star_keywords", "present": has_star_keywords},
    ]


def _heuristic_grounded_criteria(answer: str) -> list[dict[str, str]]:
    """Return NOT_ASSESSED for all semantic criteria — word-count/digit heuristics cannot
    determine relevance, evidence quality, structure, or outcome clarity honestly.

    Epic 2.26: answer '1' or any short/digit-only text MUST NOT yield SUPPORTED_IN_RESPONSE
    for evidence_use or any other criterion. Only factual_observations (separate field) may
    record what is present in the text.
    """
    note = "Deterministic checklist — semantic assessment requires AI review"
    return [
        {"id": "relevance", "outcome": OUTCOME_NOT_ASSESSED, "note": note},
        {"id": "evidence_use", "outcome": OUTCOME_NOT_ASSESSED, "note": note},
        {"id": "structure", "outcome": OUTCOME_NOT_ASSESSED, "note": note},
        {"id": "outcome_clarity", "outcome": OUTCOME_NOT_ASSESSED, "note": note},
    ]


def evaluate_answer(
    job: Job,
    question: str,
    answer: str,
    *,
    allow_deterministic_heuristics: bool = False,
) -> dict[str, Any]:
    """Evaluate a practice answer.

    When Anthropic is not configured or the call fails, return EVALUATION_UNAVAILABLE
    with score=None — never invent a numeric precision score from answer length.
    """
    if not (answer or "").strip():
        return _insufficient_evaluation(answer)

    ctx = job_posting_text(job)[:4000]
    if is_anthropic_configured():
        prompt = _EVAL_PROMPT.format(
            question=question[:500],
            answer=answer[:3000],
            job_ctx=ctx,
        )
        data = call_claude_json(prompt, max_tokens=1200)
        if data and isinstance(data.get("criteria"), list):
            data["source"] = "claude"
            data["source_label"] = "live_ai"
            data["score_available"] = False
            data["score"] = None  # Epic 2.26: no global 0–100 claim from coach
            data["evaluation_status"] = data.get("evaluation_status") or "COMPLETE"
            data["degraded"] = False
            # Drop legacy invented scores if model still emits them
            if "score" in data and data.get("score") is not None:
                data["legacy_score_ignored"] = True
                data["score"] = None
                data["score_available"] = False
            return data
        return _unavailable_evaluation(reason="AI provider returned unusable evaluation", answer=answer)

    if allow_deterministic_heuristics:
        return {
            "evaluation_status": "COMPLETE",
            "score": None,
            "score_available": False,
            "criteria": _heuristic_grounded_criteria(answer),
            "factual_observations": _heuristic_factual_observations(answer),
            "strengths": [],
            "improvements": [
                "This is a labeled deterministic checklist, not a live AI score.",
                "Add a measurable outcome if missing.",
            ],
            "sample_better_answer": "Situation → your action → measurable result tied to the question.",
            "source": DETERMINISTIC_FALLBACK_LABEL,
            "source_label": "deterministic_library",
            "degraded": True,
        }

    return _unavailable_evaluation(
        reason="AI evaluation provider not configured",
        answer=answer,
    )


def evaluate_submitted_answer_text(
    *,
    question: str,
    answer: str,
    job_ctx: str = "",
    allow_deterministic_heuristics: bool = True,
    ai_authorized: bool = False,
    provider_call=None,
) -> dict[str, Any]:
    """Evaluate without a Job ORM row (process-scoped practice).

    Args:
        ai_authorized: MUST be True for Claude to be called. Request-body booleans
            must NOT be passed here directly — callers must verify consent from the
            canonical privacy row first (see authorize_practice_ai in the practice service).
        provider_call: Optional injectable callable(question, answer, job_ctx) → dict.
            Used in tests to stub Claude without touching the real API.
    """
    if not (answer or "").strip():
        return _insufficient_evaluation(answer)

    # AI path — only when consent is explicitly authorized (not just configured)
    if ai_authorized and is_anthropic_configured():
        if provider_call is not None:
            result = provider_call(question, answer, job_ctx or "")
            if result and isinstance(result.get("criteria"), list):
                result.setdefault("source", "claude")
                result.setdefault("source_label", "live_ai")
                result["score"] = None
                result["score_available"] = False
                result.setdefault("evaluation_status", "COMPLETE")
                result["degraded"] = False
                return result
        else:
            prompt = _EVAL_PROMPT.format(
                question=question[:500],
                answer=answer[:3000],
                job_ctx=(job_ctx or "No job posting attached")[:4000],
            )
            data = call_claude_json(prompt, max_tokens=1200)
            if data and isinstance(data.get("criteria"), list):
                data["source"] = "claude"
                data["source_label"] = "live_ai"
                data["score"] = None
                data["score_available"] = False
                data["evaluation_status"] = data.get("evaluation_status") or "COMPLETE"
                data["degraded"] = False
                return data
        return _unavailable_evaluation(reason="AI provider returned unusable evaluation", answer=answer)

    # No-consent / deterministic path — factual observations, semantic criteria = NOT_ASSESSED
    if allow_deterministic_heuristics:
        return {
            "evaluation_status": "COMPLETE",
            "score": None,
            "score_available": False,
            "criteria": _heuristic_grounded_criteria(answer),
            "factual_observations": _heuristic_factual_observations(answer),
            "strengths": [],
            "improvements": [
                "Labeled deterministic checklist — not a live AI score or hiring probability.",
                "Enable AI practice in your privacy settings for semantic feedback.",
            ],
            "sample_better_answer": "Situation → your action → measurable result tied to the question.",
            "source": DETERMINISTIC_FALLBACK_LABEL,
            "source_label": "deterministic_library",
            "consent_denied": not ai_authorized,
            "degraded": True,
        }
    return _unavailable_evaluation(reason="AI evaluation provider not configured", answer=answer)


def generate_adaptive_follow_up(
    *,
    question: str,
    answer: str,
    rubric: str = "",
    ai_authorized: bool = False,
    provider_call=None,
) -> dict[str, Any]:
    """Generate a follow-up question adaptive to the submitted answer.

    When ai_authorized and Anthropic configured: calls Claude (or injectable stub).
    Otherwise: returns library-selected follow-up based on answer content (labeled library_not_adaptive_ai).
    Never claims AI adaptation without actual provider call.
    """
    if ai_authorized and is_anthropic_configured():
        if provider_call is not None:
            result = provider_call(question, answer, rubric)
            if result and result.get("follow_up"):
                return {
                    "follow_up": result["follow_up"],
                    "source": "claude",
                    "source_label": "live_ai_adaptive",
                    "degraded": False,
                }
        else:
            prompt = _ADAPTIVE_FOLLOWUP_PROMPT.format(
                question=question[:500],
                answer=answer[:2000],
                rubric=(rubric or "General behavioral interview")[:500],
            )
            data = call_claude_json(prompt, max_tokens=300)
            if data and data.get("follow_up"):
                return {
                    "follow_up": data["follow_up"],
                    "source": "claude",
                    "source_label": "live_ai_adaptive",
                    "degraded": False,
                }

    # Deterministic library — vary by answer content but NEVER claim adaptive AI
    return {
        "follow_up": _library_adaptive_follow_up(question=question, answer=answer),
        "source": DETERMINISTIC_FALLBACK_LABEL,
        "source_label": "library_not_adaptive_ai",
        "degraded": True,
        "consent_denied": not ai_authorized,
    }


def _library_adaptive_follow_up(*, question: str, answer: str) -> str:
    """Pick a library follow-up that varies by answer content — no AI, but not purely index-based."""
    words = len(re.findall(r"\w+", answer or ""))
    has_number = bool(re.search(r"\d", answer or ""))
    has_star = bool(re.search(r"\b(situation|task|action|result)\b", answer or "", re.I))
    has_outcome = bool(re.search(r"\b(result|outcome|achieved|delivered|improved|reduced)\b", answer or "", re.I))

    if words < 30:
        return "Can you walk me through this in more detail — what specifically was your role and what was the measurable outcome?"
    if has_number and not has_outcome:
        return "You mentioned some metrics — how did you measure the impact of your actions and verify those numbers?"
    if not has_star:
        return "That's a good start — could you structure this using the Situation, Task, Action, Result format to make it clearer?"
    if has_outcome:
        return "What would you do differently if you faced this situation again, knowing what you know now?"
    return "How did you decide on that particular approach over other options you might have considered?"
