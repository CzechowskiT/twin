"""Enrich candidate profile from CV text (rules + optional Claude)."""

import json
import re
from typing import Any

from app.matching.synonyms import SKILL_ALIASES, SKILL_SYNONYMS
from app.config import get_settings
from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured

_ENRICH_PROMPT = """You analyze a job seeker's CV (Polish and/or English). The CV below is plain text extracted from their PDF/DOCX/TXT file — infer everything only from this text.

Return ONLY valid JSON with this exact shape:
{
  "skills": ["skill1", "skill2"],
  "experience_years": 0,
  "location": "City or null",
  "headline": "one-line professional summary in Polish, max 120 chars",
  "preferred_job_titles": ["role 1", "role 2"],
  "cv_analysis": {
    "summary_bullets": ["bullet 1", "bullet 2", "bullet 3"],
    "languages": ["Polish", "English"],
    "industries": ["e.g. B2B SaaS", "FMCG"],
    "seniority": "junior|mid|senior|lead|executive|unknown"
  }
}
Rules:
- skills: 5-15 concrete professional skills (tools, methods, domains, languages as skills when relevant)
- experience_years: integer total relevant professional experience
- location: city/region if clearly stated for work, else null
- preferred_job_titles: 4-10 realistic job titles this person should search for on job boards; use short phrases that often appear verbatim in postings (PL or EN, mixed OK), e.g. "Key Account Manager", "Product Owner", "Inżynier ds. jakości"
- cv_analysis.summary_bullets: 3-5 factual highlights from the CV (no fluff)
- cv_analysis.languages: spoken/working languages evident from CV
- cv_analysis.industries: 1-6 industries or company types
- cv_analysis.seniority: one word from the list above

CV:
"""


def enrich_from_cv_text(cv_text: str, existing: dict[str, Any]) -> dict[str, Any]:
    """Merge CV insights into profile fields."""
    merged = dict(existing)
    merged.setdefault("preferred_job_titles", [])
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
                merged["cv_headline"] = str(ai["headline"]).strip()[:200]
            raw_titles = ai.get("preferred_job_titles")
            if isinstance(raw_titles, list) and raw_titles:
                merged["preferred_job_titles"] = merge_preferred_job_titles(
                    list(merged.get("preferred_job_titles", [])),
                    [str(x).strip() for x in raw_titles if str(x).strip()],
                )
            insights = _normalize_cv_insights(ai.get("cv_analysis"), merged.get("cv_headline"))
            if insights:
                merged["cv_insights"] = insights
    return merged


def merge_preferred_job_titles(existing: list[str], suggested: list[str], *, max_titles: int = 25) -> list[str]:
    """Dedupe case-insensitively; suggested titles are appended after existing."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in [*existing, *suggested]:
        s = str(raw).strip()[:120]
        if not s:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= max_titles:
            break
    return out


def _normalize_cv_insights(raw: Any, headline: str | None) -> dict[str, Any] | None:
    hl = (headline or "").strip()[:200] or None

    if raw is None or not isinstance(raw, dict):
        if hl:
            return {
                "headline": hl,
                "summary_bullets": [],
                "languages": [],
                "industries": [],
                "seniority": "unknown",
            }
        return None

    bullets = raw.get("summary_bullets") or raw.get("bullets") or []
    if isinstance(bullets, list):
        bullets = [str(b).strip()[:280] for b in bullets if str(b).strip()][:6]
    else:
        bullets = []

    langs = raw.get("languages") or []
    if isinstance(langs, list):
        langs = [str(x).strip()[:40] for x in langs if str(x).strip()][:12]
    else:
        langs = []

    industries = raw.get("industries") or raw.get("domains") or []
    if isinstance(industries, list):
        industries = [str(x).strip()[:60] for x in industries if str(x).strip()][:8]
    else:
        industries = []

    seniority = str(raw.get("seniority") or "unknown").strip().lower()[:20]
    if seniority not in ("junior", "mid", "senior", "lead", "executive", "unknown"):
        seniority = "unknown"

    out: dict[str, Any] = {
        "summary_bullets": bullets,
        "languages": langs,
        "industries": industries,
        "seniority": seniority,
    }
    if hl:
        out["headline"] = hl
    elif raw.get("headline"):
        out["headline"] = str(raw["headline"]).strip()[:200]

    if (
        not bullets
        and not langs
        and not industries
        and seniority == "unknown"
        and "headline" not in out
    ):
        return None
    return out


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
            model=get_settings().anthropic_model,
            max_tokens=2000,
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
        if isinstance(data.get("preferred_job_titles"), list):
            data["preferred_job_titles"] = [
                str(s).strip()[:120] for s in data["preferred_job_titles"] if str(s).strip()
            ][:12]
        return data
    except Exception:
        return None
