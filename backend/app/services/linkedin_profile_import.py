"""Import and synthesize LinkedIn profiles — OAuth userinfo + optional API + AI."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.services.anthropic_client import is_anthropic_configured
from app.services.career_assistant_common import call_claude_json
from app.services.cv_enrichment import enrich_from_cv_text, merge_preferred_job_titles

LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

_SYNTHESIS_PROMPT = """Analyze profile data and return ONLY JSON:
{{
  "skills": {{"primary": [], "secondary": [], "soft_skills": []}},
  "experience_summary": "2-3 sentences",
  "career_trajectory": "junior|mid|senior|lead",
  "suggested_roles": [],
  "suggested_industries": [],
  "strengths": [],
  "gaps": [],
  "improvement_suggestions": [{{"area": "", "suggestion": "", "impact": "", "time_estimate": ""}}],
  "profile_completeness": 0,
  "quick_wins": []
}}

Use ONLY facts from the input. Same language as input (PL or EN).

PROFILE DATA:
{payload}
"""


async def fetch_linkedin_profile(access_token: str) -> dict[str, Any]:
    """Fetch LinkedIn OpenID userinfo; limited scopes — no positions/skills API."""
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(LINKEDIN_USERINFO_URL, headers=headers)
        if res.status_code != 200:
            raise ValueError("LinkedIn API unavailable — token may be expired or scopes limited")
        body = res.json()
    return {
        "profile": body,
        "positions": [],
        "skills": [],
        "education": [],
        "source": "linkedin_userinfo",
        "api_limited": True,
    }


def build_profile_from_candidate(candidate: Any, user: Any | None = None) -> dict[str, Any]:
    """Fallback when no LinkedIn token — use stored candidate + user fields."""
    name = getattr(candidate, "name", "") or ""
    email = getattr(user, "email", "") if user else ""
    skills_raw = getattr(candidate, "skills", "[]") or "[]"
    try:
        skills = json.loads(skills_raw) if isinstance(skills_raw, str) else skills_raw
    except json.JSONDecodeError:
        skills = []
    return {
        "profile": {"name": name, "email": email, "sub": getattr(user, "linkedin_id", None)},
        "positions": [],
        "skills": skills,
        "education": [],
        "cv_text": (getattr(candidate, "cv_text", None) or "")[:8000],
        "source": "candidate_profile",
        "api_limited": True,
    }


def synthesize_profile_deterministic(raw: dict[str, Any]) -> dict[str, Any]:
    """Rule-based synthesis when Claude is unavailable."""
    profile = raw.get("profile") or {}
    cv_text = str(raw.get("cv_text") or "")
    skills_list = raw.get("skills") or []
    if isinstance(skills_list, dict):
        skills_list = skills_list.get("elements", [])
    flat_skills: list[str] = []
    for item in skills_list:
        if isinstance(item, str):
            flat_skills.append(item)
        elif isinstance(item, dict):
            flat_skills.append(str(item.get("name") or item.get("title") or ""))
    if cv_text:
        enriched = enrich_from_cv_text(cv_text, {"skills": flat_skills, "experience_years": 0, "location": None, "preferred_job_titles": []})
        flat_skills = enriched.get("skills") or flat_skills
    primary = flat_skills[:8]
    secondary = flat_skills[8:16]
    name = str(profile.get("name") or profile.get("given_name") or "Candidate")
    summary = f"{name} — profile imported from LinkedIn or CV."
    if cv_text:
        snippet = re.sub(r"\s+", " ", cv_text.strip())[:280]
        summary = snippet
    completeness = min(100, 35 + len(primary) * 4 + (25 if cv_text else 0))
    return {
        "skills": {"primary": primary, "secondary": secondary, "soft_skills": ["communication", "teamwork"]},
        "experience_summary": summary,
        "career_trajectory": "mid",
        "suggested_roles": [],
        "suggested_industries": [],
        "strengths": primary[:3],
        "gaps": [],
        "improvement_suggestions": [],
        "profile_completeness": completeness,
        "quick_wins": ["Add quantified achievements", "Upload a fresh CV"],
        "source": "deterministic",
    }


def synthesize_profile_with_ai(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Claude synthesis when API key is configured."""
    if not is_anthropic_configured():
        return None
    payload = json.dumps(raw, ensure_ascii=False)[:12000]
    prompt = _SYNTHESIS_PROMPT.format(payload=payload)
    data = call_claude_json(prompt, max_tokens=2000)
    if not data:
        return None
    data["source"] = "claude"
    return data


def merge_synthesis_to_candidate_fields(synthesized: dict[str, Any]) -> dict[str, Any]:
    """Map synthesis output to Candidate column updates."""
    skills_block = synthesized.get("skills") or {}
    all_skills: list[str] = []
    for key in ("primary", "secondary", "soft_skills"):
        for s in skills_block.get(key) or []:
            label = str(s).strip()
            if label and label not in all_skills:
                all_skills.append(label)
    roles = [str(r).strip() for r in (synthesized.get("suggested_roles") or []) if str(r).strip()]
    trajectory = str(synthesized.get("career_trajectory") or "mid")
    exp_map = {"junior": 2, "mid": 5, "senior": 8, "lead": 12}
    return {
        "skills_json": json.dumps(all_skills, ensure_ascii=False),
        "preferred_job_titles_json": json.dumps(roles[:5], ensure_ascii=False),
        "experience_years": exp_map.get(trajectory, 5),
        "profile_signals_patch": {
            "linkedin_import": {
                "synthesized": synthesized,
                "completeness": synthesized.get("profile_completeness"),
            }
        },
    }


def apply_import_signals(candidate: Any, patch: dict[str, Any]) -> None:
    """Write synthesis metadata into profile_signals_json."""
    raw = getattr(candidate, "profile_signals_json", None) or "{}"
    try:
        signals = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        signals = {}
    if not isinstance(signals, dict):
        signals = {}
    for key, val in (patch.get("profile_signals_patch") or {}).items():
        signals[key] = val
    candidate.profile_signals_json = json.dumps(signals, ensure_ascii=False)


def apply_synthesis_to_candidate(candidate: Any, synthesized: dict[str, Any]) -> None:
    """Persist synthesized fields on Candidate row."""
    fields = merge_synthesis_to_candidate_fields(synthesized)
    candidate.skills = fields["skills_json"]
    existing_titles: list[str] = []
    try:
        existing_titles = json.loads(candidate.preferred_job_titles or "[]")
    except json.JSONDecodeError:
        pass
    new_titles = json.loads(fields["preferred_job_titles_json"])
    candidate.preferred_job_titles = json.dumps(
        merge_preferred_job_titles(existing_titles, new_titles),
        ensure_ascii=False,
    )
    if not candidate.experience_years:
        candidate.experience_years = fields["experience_years"]
    apply_import_signals(candidate, fields)
