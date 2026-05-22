"""Hiring manager mindset insights per job (US-C056)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import HiringInsightsCache, Job
from app.services.career_assistant_common import call_claude_json

_CACHE_DAYS = 7

_INSIGHTS_PROMPT = """Act like a hiring manager reviewing applications for this role.

Return ONLY valid JSON:
{{
  "top_traits": ["string"],
  "common_mistakes": ["string"],
  "standout_signals": ["string"],
  "summary": "string"
}}

Exactly 3 items in each list. Be specific to the posting — not generic career advice.

## {title} at {company}
{description}
"""


def _fallback_insights(job: Job) -> dict[str, Any]:
    desc = (job.description or "")[:500]
    return {
        "top_traits": [
            "Evidence of delivery in the same domain as the posting",
            "Clear mapping from CV bullets to listed requirements",
            "Concise motivation tied to company context",
        ],
        "common_mistakes": [
            "Generic cover letter with no role-specific keywords",
            "Inflated titles without measurable outcomes",
            "Ignoring must-have tools mentioned in the JD",
        ],
        "standout_signals": [
            f"Quantified impact relevant to {job.title}",
            "Language mirroring the team's stated priorities",
            "Short, scannable CV aligned to ATS keywords",
        ],
        "summary": f"Top applicants for {job.title} show proof, precision, and posting alignment.{(' ' + desc[:120]) if desc else ''}",
    }


def _load_cache(db: Session, job_id: int) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc)
    row = (
        db.query(HiringInsightsCache)
        .filter(HiringInsightsCache.job_id == job_id, HiringInsightsCache.expires_at > now)
        .order_by(HiringInsightsCache.researched_at.desc())
        .first()
    )
    if not row:
        return None
    try:
        data = json.loads(row.insights_json)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def hiring_insights_for_job(db: Session, job: Job) -> tuple[dict[str, Any], datetime, bool]:
    cached = _load_cache(db, job.id)
    if cached:
        return cached, datetime.now(timezone.utc), True

    prompt = _INSIGHTS_PROMPT.format(
        title=job.title[:200],
        company=job.company[:200],
        description=(job.description or job.requirements or "")[:8000],
    )
    ai = call_claude_json(prompt)
    insights = ai if ai else _fallback_insights(job)
    now = datetime.now(timezone.utc)
    db.add(
        HiringInsightsCache(
            job_id=job.id,
            insights_json=json.dumps(insights, ensure_ascii=False),
            researched_at=now,
            expires_at=now + timedelta(days=_CACHE_DAYS),
        )
    )
    db.commit()
    return insights, now, False
