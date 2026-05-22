"""Interview prep pack (US-C053)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, InterviewPrepSession, Job, ScheduledInterview
from app.services.career_assistant_common import call_claude_json, job_posting_text
from app.services.company_intelligence import research_company_for_job

_PREP_PROMPT = """Prepare a candidate for an interview.

Return ONLY JSON:
{{
  "questions_to_expect": ["..."],
  "questions_to_ask": ["..."],
  "star_stories": [{{"prompt": "...", "angle": "..."}}],
  "company_talking_points": ["..."],
  "day_of_checklist": ["..."]
}}

Rules:
- 5–7 questions_to_expect, 4–6 questions_to_ask, 3–5 star_stories, 4–6 talking_points, 5–7 checklist items.
- No invented candidate history; prompts reference CV themes only.
- Match job posting language.

ROLE: {title} at {company}
INTERVIEW: {interview_ctx}
JOB:
{job_ctx}
CV SNIPPET:
{cv}
"""


def _fallback_prep(job: Job, interview: ScheduledInterview | None) -> dict[str, Any]:
    title = job.title.strip()
    company = job.company.strip()
    when = ""
    if interview:
        when = interview.interview_start.isoformat() if interview.interview_start else ""
    return {
        "questions_to_expect": [
            f"Walk me through relevant experience for {title}.",
            "Describe a delivery you owned end-to-end.",
            "How do you prioritize when requirements shift?",
            "What attracted you to this role at " + company + "?",
            "Where do you want to grow in the next 12 months?",
        ],
        "questions_to_ask": [
            "What does success look like in the first 90 days?",
            "How is the team structured around this role?",
            "What is the biggest challenge for the hire right now?",
            "How do you make decisions on process vs speed?",
        ],
        "star_stories": [
            {"prompt": "Ownership under pressure", "angle": "Situation → action → measurable outcome."},
            {"prompt": "Cross-team collaboration", "angle": "Stakeholders, trade-offs, result."},
            {"prompt": "Learning something new fast", "angle": "Skill gap → how you closed it."},
        ],
        "company_talking_points": [
            f"Reference priorities from the {company} posting.",
            "Tie answers to vocabulary in the job description.",
        ],
        "day_of_checklist": [
            "Re-read the job description 30 minutes before.",
            "Test video link and backup audio.",
            "Prepare 2 questions that show you researched the team.",
            f"Confirm calendar block: {when}" if when else "Confirm calendar block.",
        ],
        "source": "fallback",
    }


def _claude_prep(
    job: Job,
    interview: ScheduledInterview | None,
    cv_text: str,
    intel: dict[str, Any] | None,
) -> dict[str, Any] | None:
    intel_block = json.dumps(intel, ensure_ascii=False)[:4000] if intel else "(none)"
    interview_ctx = "(application only)"
    if interview:
        interview_ctx = (
            f"{interview.interview_type} on {interview.interview_start.isoformat()} "
            f"with {interview.interviewer_name or 'panel'}"
        )
    prompt = _PREP_PROMPT.format(
        title=job.title[:200],
        company=job.company[:200],
        interview_ctx=interview_ctx,
        job_ctx=job_posting_text(job)[:8000] + "\n\nCOMPANY INTEL:\n" + intel_block,
        cv=(cv_text or "")[:6000],
    )
    data = call_claude_json(prompt, max_tokens=2800)
    if not data:
        return None
    data["source"] = "claude"
    return data


def build_interview_prep(
    db: Session,
    *,
    user_id: int,
    application: Application | None,
    interview: ScheduledInterview | None,
    candidate_cv: str,
) -> InterviewPrepSession:
    if not application and not interview:
        raise ValueError("application_id or scheduled_interview_id required")
    job: Job | None = None
    if application:
        job = db.query(Job).filter(Job.id == application.job_id).first()
    elif interview and interview.application_id:
        app = db.query(Application).filter(Application.id == interview.application_id).first()
        if app:
            application = app
            job = db.query(Job).filter(Job.id == app.job_id).first()
    if not job:
        raise ValueError("Could not resolve job for interview prep")

    intel, _, _ = research_company_for_job(db, job)
    prep = _claude_prep(job, interview, candidate_cv, intel) or _fallback_prep(job, interview)
    prep["generated_at"] = datetime.now(timezone.utc).isoformat()

    row = InterviewPrepSession(
        user_id=user_id,
        scheduled_interview_id=interview.id if interview else None,
        application_id=application.id if application else None,
        prep_json=json.dumps(prep, ensure_ascii=False),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
