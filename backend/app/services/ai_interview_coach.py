"""AI Interview Coach — generate questions and evaluate answers."""

from __future__ import annotations

import json
import re
from typing import Any

from app.database.models import Job
from app.services.anthropic_client import is_anthropic_configured
from app.services.career_assistant_common import call_claude_json, job_posting_text

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
  "score": 0,
  "strengths": ["..."],
  "improvements": ["..."],
  "sample_better_answer": "..."
}}
Score 0-100. Question: {question}
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
        "source": "fallback",
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
            return data
    return _fallback_questions(job)


def _fallback_evaluation(question: str, answer: str) -> dict[str, Any]:
    words = len(re.findall(r"\w+", answer or ""))
    score = min(85, 40 + words // 3)
    return {
        "score": score,
        "strengths": ["You provided a concrete response."] if words > 20 else [],
        "improvements": ["Add a measurable outcome (numbers or timeline)."] if words < 40 else ["Tighten the opening sentence."],
        "sample_better_answer": "Situation → your action → measurable result tied to the question.",
        "source": "fallback",
    }


def evaluate_answer(job: Job, question: str, answer: str) -> dict[str, Any]:
    """Score a practice answer against the job context."""
    if not (answer or "").strip():
        return {"score": 0, "strengths": [], "improvements": ["Answer cannot be empty."], "source": "fallback"}
    ctx = job_posting_text(job)[:4000]
    if is_anthropic_configured():
        prompt = _EVAL_PROMPT.format(question=question[:500], answer=answer[:3000], job_ctx=ctx)
        data = call_claude_json(prompt, max_tokens=1200)
        if data and "score" in data:
            data["source"] = "claude"
            return data
    return _fallback_evaluation(question, answer)
