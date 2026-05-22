"""Post-interview follow-up email generator (US-C055)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import FollowUpEmail, ScheduledInterview
from app.services.career_assistant_common import call_claude_json

_FOLLOWUP_PROMPT = """Write a concise post-interview thank-you email. Use meeting notes only — do not invent conversation details.

Return ONLY valid JSON:
{{
  "subject": "string",
  "body": "string",
  "send_timing": "string"
}}

## Interview
Role: {title} at {company}
Interviewer: {interviewer}
Type: {itype}

## Candidate notes from interview
{notes}
"""


def _fallback_followup(interview: ScheduledInterview, notes: str) -> dict[str, Any]:
    name = interview.interviewer_name or "the team"
    ref = notes.strip()[:200] if notes.strip() else "our discussion"
    return {
        "subject": f"Thank you — {interview.job_title}",
        "body": (
            f"Dear {name},\n\nThank you for your time today regarding the {interview.job_title} role at "
            f"{interview.company_name}. I appreciated {ref}.\n\nI remain very interested in the opportunity "
            f"and look forward to next steps.\n\nBest regards"
        ),
        "send_timing": "Within 24 hours of the interview",
    }


def generate_follow_up(
    db: Session,
    interview: ScheduledInterview,
    notes: str | None,
) -> dict[str, Any]:
    note_text = (notes or interview.notes or "").strip()[:4000]
    prompt = _FOLLOWUP_PROMPT.format(
        title=interview.job_title[:200],
        company=interview.company_name[:200],
        interviewer=interview.interviewer_name or "Hiring team",
        itype=interview.interview_type or "video",
        notes=note_text or "(no notes provided — keep email general)",
    )
    ai = call_claude_json(prompt)
    body = ai if ai else _fallback_followup(interview, note_text)
    db.add(
        FollowUpEmail(
            scheduled_interview_id=interview.id,
            notes=note_text or None,
            email_json=json.dumps(body, ensure_ascii=False),
        )
    )
    db.commit()
    return body
