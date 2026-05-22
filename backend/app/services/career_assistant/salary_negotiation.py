"""Salary negotiation coach (US-C054)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, Job, SalaryNegotiation
from app.services.career_assistant_common import call_claude_json, job_posting_text

_NEGOTIATE_PROMPT = """Help a candidate negotiate compensation for a specific offer context.

Return ONLY JSON:
{{
  "market_range_pln_monthly": {{"low": 0, "mid": 0, "high": 0}},
  "talking_points": ["..."],
  "counter_email": {{"subject": "...", "body": "..."}},
  "do_not_say": ["..."]
}}

Rules:
- PLN monthly gross unless posting states otherwise; use candidate desired salary and job salary fields as anchors.
- Offer amount (if provided): {offer_pln}
- Desired salary: {desired_pln}
- Job salary min/max: {salary_min}–{salary_max}
- 4–6 talking_points, professional counter_email, 3–5 do_not_say.
- No fabricated competing offers.

ROLE: {title} at {company}
LOCATION: {location}
JOB SNIPPET:
{job_ctx}
"""


def _fallback_negotiation(job: Job, candidate: Candidate, offer_pln: int | None) -> dict[str, Any]:
    desired = candidate.desired_salary or 0
    lo = job.salary_min or desired or 12000
    hi = job.salary_max or max(lo + 4000, desired + 2000)
    mid = (lo + hi) // 2
    anchor = offer_pln or mid
    return {
        "market_range_pln_monthly": {"low": lo, "mid": mid, "high": hi},
        "talking_points": [
            f"Anchor on scope of {job.title} and outcomes in the posting.",
            f"Reference market band {lo:,}–{hi:,} PLN/mo from listing or research.",
            "Ask about bonus, remote, and learning budget — total comp, not title alone.",
        ],
        "counter_email": {
            "subject": f"Re: {job.title} offer — compensation discussion",
            "body": (
                f"Thank you for the offer for {job.title}. "
                f"Based on the role scope and my background, I was targeting around {max(anchor, desired):,} PLN gross monthly. "
                "Could we explore aligning base salary closer to that range?"
            ),
        },
        "do_not_say": ["I have no other options", "I need this job urgently"],
        "source": "fallback",
    }


def build_salary_negotiation(
    db: Session,
    *,
    candidate: Candidate,
    application: Application,
    job: Job,
    offer_pln: int | None = None,
) -> SalaryNegotiation:
    prompt = _NEGOTIATE_PROMPT.format(
        offer_pln=offer_pln or "not provided",
        desired_pln=candidate.desired_salary or "unknown",
        salary_min=job.salary_min or "unknown",
        salary_max=job.salary_max or "unknown",
        title=job.title[:200],
        company=job.company[:200],
        location=(candidate.location or job.location or "Poland")[:120],
        job_ctx=job_posting_text(job)[:6000],
    )
    data = call_claude_json(prompt, max_tokens=2200)
    if not data:
        data = _fallback_negotiation(job, candidate, offer_pln)
    else:
        data["source"] = "claude"
    data["generated_at"] = datetime.now(timezone.utc).isoformat()

    row = SalaryNegotiation(
        application_id=application.id,
        negotiation_json=json.dumps(data, ensure_ascii=False),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
