"""Enrich candidate profile from CV text (rules + optional Claude)."""

import json
import re
from typing import Any

from app.matching.synonyms import SKILL_ALIASES, SKILL_SYNONYMS
from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured

_ENRICH_PROMPT = """You analyze a job seeker's CV (Polish or English).
Return ONLY valid JSON with this shape:
{
  "skills": ["skill1", "skill2"],
  "experience_years": 0,
  "location": "City or null",
  "headline": "one-line professional summary in Polish"
}
Rules:
- skills: 5-15 concrete professional skills (sales, B2B, CRM, languages, industries)
- experience_years: integer estimate from career history
- location: preferred city if clear, else null
- headline: max 120 chars

CV:
"""


def enrich_from_cv_text(cv_text: str, existing: dict[str, Any]) -> dict[str, Any]:
    """Merge CV insights into profile fields."""
    merged = dict(existing)
    rule_skills = _skills_from_cv_keywords(cv_text)
    merged["skills"] = _merge_skills(existing.get("skills", []), rule_skills)

    if is_anthropic_configured():
        ai = _enrich_with_claude(cv_text)
        if ai:
            merged["skills"] = _merge_skills(merged["skills"], ai.get("skills", []))
            if not merged.get("experience_years") and ai.get("experience_years"):
                merged["experience_years"] = ai["experience_years"]
            if not merged.get("location") and ai.get("location"):
                merged["location"] = ai["location"]
            if ai.get("headline"):
                merged["cv_headline"] = ai["headline"]
    return merged


def _merge_skills(existing: list[str], found: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in [*existing, *found]:
        key = str(raw).lower().strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(SKILL_ALIASES.get(key, key))
    return out[:25]


def _skills_from_cv_keywords(cv_text: str) -> list[str]:
    text = cv_text.lower()
    found: list[str] = []
    for skill, terms in SKILL_SYNONYMS.items():
        if any(term in text for term in terms):
            found.append(skill)
    # Obvious PL/EN sales phrases
    extra_patterns = [
        (r"\bb2b\b", "b2b"),
        (r"\bb2c\b", "b2c"),
        (r"\bkey account\b", "key account"),
        (r"\baccount manager\b", "account management"),
        (r"\bhandlow", "sales"),
        (r"\bsprzeda", "sales"),
        (r"\bnegocjac", "negotiation"),
        (r"\bcrm\b", "crm"),
        (r"\bsalesforce\b", "salesforce"),
        (r"\bhubspot\b", "hubspot"),
    ]
    for pattern, skill in extra_patterns:
        if re.search(pattern, text) and skill not in found:
            found.append(skill)
    return found


def _enrich_with_claude(cv_text: str) -> dict[str, Any] | None:
    client = get_anthropic_client()
    if not client:
        return None
    snippet = cv_text[:12_000]
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{"role": "user", "content": _ENRICH_PROMPT + snippet}],
        )
        raw = msg.content[0].text if msg.content else ""
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            return None
        data = json.loads(raw[start : end + 1])
        if isinstance(data.get("skills"), list):
            data["skills"] = [str(s).strip() for s in data["skills"] if str(s).strip()]
        return data
    except Exception:
        return None
