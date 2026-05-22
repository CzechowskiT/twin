"""Interview prep generator (US-C053)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, InterviewPrepSession, Job, ScheduledInterview
from app.services.career_assistant_common import call_claude_json

_PREP_PROMPT = """Generate interview prep for a candidate. Use ONLY CV facts — do not invent employers or projects.

Return ONLY valid JSON:
{{
  "questions": [
    {{"question": "string", "why_asked": "string", "star_answer": "string"}}
  ],
  "company_talking_points": ["string"],
  "questions_to_ask_them": ["string"]
}}

Exactly 10 questions. Match job posting language.

## Role: {title} at {company}
{description}

## CV excerpt
{cv}
"""


def _fallback_prep(job: Job, cv: str) -> dict[str, Any]:
    title = job.title.strip()
    qs = [
        {
            "question": f"Why are you interested in this {title} role?",
            "why_asked": "Motivation and fit",
            "star_answer": "Prepare a concise story from your CV about relevant impact.",
        },
        {
            "question": "Describe a challenging project you delivered.",
            "why_asked": "Execution proof",
            "star_answer": "Use Situation–Task–Action–Result from a real CV bullet.",
        },
    ]
    while len(qs) < 10:
        qs.append(
            {
                "question": f"How would you approach a key responsibility in {title}?",
                "why_asked": "Role-specific depth",
                "star_answer": "Tie to skills listed in your CV and the job description.",
            }
        )
    return {
        "questions": qs[:10],
        "company_talking_points": [job.company, (job.description or "")[:200]],
        "questions_to_ask_them": [
            "What does success look like in the first 90 days?",
            "How is the team structured for this role?",
        ],
    }


def _coerce_prep(data: dict[str, Any], job: Job, cv: str) -> dict[str, Any]:
    qs = data.get("questions") if isinstance(data.get("questions"), list) else []
    clean = []
    for q in qs[:10]:
        if isinstance(q, dict) and q.get("question"):
            clean.append(
                {
                    "question": str(q["question"])[:500],
                    "why_asked": str(q.get("why_asked") or "")[:300],
                    "star_answer": str(q.get("star_answer") or "")[:1500],
                }
            )
    fb = _fallback_prep(job, cv)
    while len(clean) < 10:
        clean.append(fb["questions"][len(clean) % 10])
    tips = [str(x) for x in (data.get("company_talking_points") or []) if str(x).strip()][:6]
    ask = [str(x) for x in (data.get("questions_to_ask_them") or []) if str(x).strip()][:6]
    return {
        "questions": clean[:10],
        "company_talking_points": tips or fb["company_talking_points"],
        "questions_to_ask_them": ask or fb["questions_to_ask_them"],
    }


def build_interview_prep(
    db: Session,
    *,
    user_id: int,
    interview: ScheduledInterview | None,
    application: Application | None,
    candidate: Candidate,
    job: Job,
) -> dict[str, Any]:
    cv = (candidate.cv_text or "No CV on file.")[:8000]
    prompt = _PREP_PROMPT.format(
        title=job.title[:200],
        company=job.company[:200],
        description=(job.description or job.requirements or "")[:6000],
        cv=cv,
    )
    ai = call_claude_json(prompt, max_tokens=4500)
    prep = _coerce_prep(ai, job, cv) if ai else _fallback_prep(job, cv)

    row = InterviewPrepSession(
        user_id=user_id,
        scheduled_interview_id=interview.id if interview else None,
        application_id=application.id if application else None,
        prep_json=json.dumps(prep, ensure_ascii=False),
    )
    db.add(row)
    db.commit()
    return prep
