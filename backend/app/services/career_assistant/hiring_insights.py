"""Hiring-manager mindset insights per job (US-C056)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import HiringInsightsCache, Job
from app.services.career_assistant_common import call_claude_json, job_posting_text
from app.services.anthropic_client import is_anthropic_configured

_CACHE_DAYS = 7

_INSIGHTS_PROMPT = """Act as the hiring manager for this role. Explain what separates top ~3% applicants.

Return ONLY JSON:
{{
  "top_traits": ["..."],
  "red_flags": ["..."],
  "interview_focus": ["..."],
  "bar_summary": "2-3 sentences"
}}

Rules:
- Exactly 3 top_traits, 3 red_flags, 4 interview_focus items — specific to posting.
- No generic buzzwords; mirror JD language.
- Match posting language.

ROLE: {title} at {company}
JOB:
{job_ctx}
"""


def _coerce_insights(data: dict[str, Any]) -> dict[str, Any]:
    traits = [str(x).strip() for x in (data.get("top_traits") or []) if str(x).strip()][:3]
    flags = [str(x).strip() for x in (data.get("red_flags") or []) if str(x).strip()][:3]
    focus = [str(x).strip() for x in (data.get("interview_focus") or []) if str(x).strip()][:6]
    summary = str(data.get("bar_summary") or "").strip()[:2000]
    while len(traits) < 3:
        traits.append("Shows measurable outcomes in this scope, not generic claims.")
    while len(flags) < 3:
        flags.append("Generic motivation letter with no tie to posting priorities.")
    while len(focus) < 4:
        focus.append("Probe for ownership of delivery in similar environments.")
    if not summary:
        summary = "Hiring bar follows the posting: depth in role scope beats volume of buzzwords."
    return {"top_traits": traits, "red_flags": flags, "interview_focus": focus, "bar_summary": summary}


def _fallback_insights(job: Job) -> dict[str, Any]:
    desc = job_posting_text(job)[:1500]
    return _coerce_insights(
        {
            "top_traits": [
                f"Evidence of shipping in {job.title} scope",
                "Clear narrative tied to posting requirements",
                "Realistic salary and start-date expectations",
            ],
            "red_flags": [
                "Keyword stuffing without substantiated projects",
                "Mismatch between seniority claimed and CV timeline",
                "No sign they read the company/role context",
            ],
            "interview_focus": [
                "Deep dive on hardest project in this domain",
                "How they handle ambiguity and stakeholders",
                "Tooling named in posting — practical depth",
                "Motivation specific to " + job.company,
            ],
            "bar_summary": f"Strong candidates connect CV proof to: {desc[:200]}…",
        }
    )


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


def _save_cache(db: Session, job_id: int, insights: dict[str, Any]) -> datetime:
    now = datetime.now(timezone.utc)
    row = HiringInsightsCache(
        job_id=job_id,
        insights_json=json.dumps(insights, ensure_ascii=False),
        researched_at=now,
        expires_at=now + timedelta(days=_CACHE_DAYS),
    )
    db.add(row)
    db.commit()
    return now


def research_hiring_insights_for_job(db: Session, job: Job) -> tuple[dict[str, Any], datetime, bool]:
    cached = _load_cache(db, job.id)
    if cached:
        return cached, datetime.now(timezone.utc), True

    insights: dict[str, Any] | None = None
    if is_anthropic_configured():
        prompt = _INSIGHTS_PROMPT.format(
            title=job.title[:200],
            company=job.company[:200],
            job_ctx=job_posting_text(job)[:10_000],
        )
        raw = call_claude_json(prompt, max_tokens=2000)
        if raw:
            insights = _coerce_insights(raw)
    if not insights:
        insights = _fallback_insights(job)
    researched_at = _save_cache(db, job.id, insights)
    return insights, researched_at, False
