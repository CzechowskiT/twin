"""Salary negotiation assistant (US-C054)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, Job, SalaryNegotiation
from app.services.career_assistant_common import call_claude_json

_NEGOTIATE_PROMPT = """Help a candidate negotiate salary. Do not invent their current salary — use only stated numbers.

Return ONLY valid JSON:
{{
  "market_range_pln_monthly": {{"low": 0, "mid": 0, "high": 0}},
  "recommended_ask_pln_monthly": 0,
  "talking_points": ["string"],
  "email_subject": "string",
  "email_body": "string"
}}

## Role: {title} at {company}
Job salary range: {salary_min}–{salary_max} PLN/mo (if known)
Candidate desired salary: {desired}
Location: {location}
"""


def _fallback_negotiate(job: Job, candidate: Candidate) -> dict[str, Any]:
    lo = job.salary_min or candidate.desired_salary or 12000
    hi = job.salary_max or (int(lo * 1.25) if lo else 15000)
    mid = int((lo + hi) / 2) if hi else lo
    ask = int(mid * 1.08) if mid else lo
    return {
        "market_range_pln_monthly": {"low": lo, "mid": mid, "high": hi},
        "recommended_ask_pln_monthly": ask,
        "talking_points": [
            "Anchor on role scope and outcomes from the job description.",
            "Reference market range for this title and location.",
        ],
        "email_subject": f"Offer discussion — {job.title}",
        "email_body": (
            f"Thank you for the offer for {job.title}. Based on the scope and market for this role, "
            f"I would like to discuss a base of {ask:,} PLN/month. I remain enthusiastic about joining {job.company}."
        ).replace(",", " "),
    }


def negotiate_salary_for_application(
    db: Session,
    application: Application,
    candidate: Candidate,
    job: Job,
) -> dict[str, Any]:
    prompt = _NEGOTIATE_PROMPT.format(
        title=job.title[:200],
        company=job.company[:200],
        salary_min=job.salary_min or "unknown",
        salary_max=job.salary_max or "unknown",
        desired=candidate.desired_salary or "not stated",
        location=candidate.location or job.location or "Poland",
    )
    ai = call_claude_json(prompt)
    body = ai if ai else _fallback_negotiate(job, candidate)
    db.add(
        SalaryNegotiation(
            application_id=application.id,
            negotiation_json=json.dumps(body, ensure_ascii=False),
        )
    )
    db.commit()
    return body
