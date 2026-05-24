"""Company intelligence for targeted applications (US-C051)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CompanyIntelligenceCache, Job
from app.config import get_settings
from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured

_CACHE_DAYS = 7

_RESEARCH_PROMPT = """Act like an executive headhunter researching {company} for a candidate applying as: {title}.

## Job description
{description}

## Requirements
{requirements}

Return ONLY valid JSON:
{{
  "priorities": ["...", "...", "..."],
  "pain_points": ["...", "...", "..."],
  "insider_language": {{ "use": ["..."], "avoid": ["..."] }},
  "cover_letter_draft": "3 short paragraphs, factual tone, no invented candidate history"
}}

Rules:
- Exactly 3 priorities and 3 pain_points — specific to this company/role, not generic.
- insider_language: 3–6 terms to use, 2–4 to avoid.
- cover_letter_draft: show research; do not invent degrees or employers for the candidate.
- Match the language of the job posting (Polish vs English).
"""


def _normalize_key(value: str, max_len: int = 200) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())[:max_len]


def _parse_json_blob(text: str) -> dict[str, Any] | None:
    raw = (text or "").strip()
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0]
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def _coerce_intel(data: dict[str, Any]) -> dict[str, Any]:
    priorities = [str(x).strip() for x in (data.get("priorities") or []) if str(x).strip()][:3]
    pains = [str(x).strip() for x in (data.get("pain_points") or []) if str(x).strip()][:3]
    lang = data.get("insider_language") if isinstance(data.get("insider_language"), dict) else {}
    use = [str(x).strip() for x in (lang.get("use") or []) if str(x).strip()][:8]
    avoid = [str(x).strip() for x in (lang.get("avoid") or []) if str(x).strip()][:8]
    letter = str(data.get("cover_letter_draft") or "").strip()[:6000]
    while len(priorities) < 3:
        priorities.append("Align application narrative with the role's stated outcomes.")
    while len(pains) < 3:
        pains.append("Team needs someone productive in this scope without long ramp-up.")
    if not letter:
        letter = (
            f"I am applying for {priorities[0][:80]}. "
            "I reviewed your posting and believe my background matches the priorities you listed."
        )
    return {
        "priorities": priorities,
        "pain_points": pains,
        "insider_language": {"use": use or ["impact", "delivery"], "avoid": avoid or ["synergy"]},
        "cover_letter_draft": letter,
    }


def _fallback_intel(job: Job) -> dict[str, Any]:
    desc = (job.description or job.requirements or "")[:2000]
    title = job.title.strip()
    company = job.company.strip()
    return _coerce_intel(
        {
            "priorities": [
                f"Fill the {title} role with measurable delivery",
                f"Strengthen {company}'s team capacity in this scope",
                "Reduce time-to-productivity for new hires",
            ],
            "pain_points": [
                "Open headcount with a defined skill bar in the posting",
                "Pressure to hire without diluting the technical bar",
                "Need credible motivation letters, not generic spam",
            ],
            "insider_language": {
                "use": re.findall(r"\w{5,}", desc.lower())[:6] or ["delivery", "ownership"],
                "avoid": ["rockstar", "ninja"],
            },
            "cover_letter_draft": (
                f"I am applying for {title} at {company}. "
                f"I studied your posting and focused on: {desc[:280]}… "
                "I would welcome a conversation about how my experience maps to your priorities."
            ),
        }
    )


def _research_with_claude(job: Job) -> dict[str, Any] | None:
    client = get_anthropic_client()
    if not client:
        return None
    prompt = _RESEARCH_PROMPT.format(
        company=job.company.strip()[:200],
        title=job.title.strip()[:200],
        description=(job.description or "(not provided)")[:8000],
        requirements=(job.requirements or "(not provided)")[:4000],
    )
    try:
        msg = client.messages.create(
            model=get_settings().anthropic_model,
            max_tokens=3000,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text if msg.content else ""
        parsed = _parse_json_blob(raw)
        return _coerce_intel(parsed) if parsed else None
    except Exception:
        return None


def _load_cache(db: Session, company: str, title: str) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc)
    row = (
        db.query(CompanyIntelligenceCache)
        .filter(
            CompanyIntelligenceCache.company_name == _normalize_key(company),
            CompanyIntelligenceCache.job_title == _normalize_key(title),
            CompanyIntelligenceCache.expires_at > now,
        )
        .order_by(CompanyIntelligenceCache.researched_at.desc())
        .first()
    )
    if not row:
        return None
    try:
        data = json.loads(row.intel_json)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def _save_cache(db: Session, company: str, title: str, intel: dict[str, Any]) -> datetime:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=_CACHE_DAYS)
    row = CompanyIntelligenceCache(
        company_name=_normalize_key(company),
        job_title=_normalize_key(title),
        intel_json=json.dumps(intel, ensure_ascii=False),
        researched_at=now,
        expires_at=expires,
    )
    db.add(row)
    db.commit()
    return now


def research_company_for_job(db: Session, job: Job) -> tuple[dict[str, Any], datetime, bool]:
    """Return intel dict, researched_at, from_cache."""
    cached = _load_cache(db, job.company, job.title)
    if cached:
        return cached, datetime.now(timezone.utc), True

    intel = _research_with_claude(job) if is_anthropic_configured() else None
    if not intel:
        intel = _fallback_intel(job)
    researched_at = _save_cache(db, job.company, job.title, intel)
    return intel, researched_at, False
