"""Post-interview follow-up email generator (US-C055)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import FollowUpEmail, ScheduledInterview
from app.services.career_assistant_common import call_claude_json

_FOLLOW_UP_PROMPT = """Draft a concise post-interview thank-you / follow-up email.

Return ONLY JSON:
{{
  "subject": "...",
  "body": "...",
  "send_timing": "within 24h|same day"
}}

Rules:
- Professional, specific to role and interview; no invented facts beyond notes.
- Match language of notes (Polish vs English).
- body max ~1200 chars.

COMPANY: {company}
ROLE: {title}
INTERVIEWER: {interviewer}
INTERVIEW TIME: {when}
NOTES:
{notes}
"""


def _fallback_follow_up(interview: ScheduledInterview, notes: str) -> dict[str, Any]:
    name = interview.interviewer_name or "there"
    return {
        "subject": f"Thank you — {interview.job_title} conversation",
        "body": (
            f"Hi {name},\n\n"
            f"Thank you for taking the time to discuss the {interview.job_title} role at {interview.company_name}. "
            f"I appreciated learning more about the team"
            + (f" — especially: {notes[:200]}…" if notes.strip() else ".")
            + "\n\nI remain very interested and happy to provide any further detail.\n\nBest regards"
        ),
        "send_timing": "within 24h",
        "source": "fallback",
    }


def generate_follow_up_email(
    db: Session,
    *,
    interview: ScheduledInterview,
    notes: str,
) -> FollowUpEmail:
    raw_notes = (notes or interview.notes or "").strip()
    prompt = _FOLLOW_UP_PROMPT.format(
        company=interview.company_name[:200],
        title=interview.job_title[:200],
        interviewer=interview.interviewer_name or "Hiring team",
        when=interview.interview_start.isoformat() if interview.interview_start else "recently",
        notes=raw_notes[:8000] or "(no extra notes)",
    )
    data = call_claude_json(prompt, max_tokens=1200)
    if not data:
        data = _fallback_follow_up(interview, raw_notes)
    else:
        data["source"] = "claude"
    data["generated_at"] = datetime.now(timezone.utc).isoformat()

    row = FollowUpEmail(
        scheduled_interview_id=interview.id,
        notes=raw_notes or None,
        email_json=json.dumps(data, ensure_ascii=False),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
