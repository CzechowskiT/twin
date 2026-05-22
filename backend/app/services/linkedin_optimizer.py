"""LinkedIn profile optimizer (US-C057)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, LinkedinOptimization
from app.services.career_assistant_common import call_claude_json

_LINKEDIN_PROMPT = """Optimize LinkedIn profile elements for a target role. Use ONLY facts from the CV — no invented employers.

Return ONLY valid JSON:
{{
  "headline": "string",
  "about": "string",
  "featured_skills": ["string"],
  "post_ideas": [{{"hook": "string", "outline": "string"}}]
}}

Target role: {target_role}

## CV
{cv}
"""


def _fallback_linkedin(candidate: Candidate, target_role: str) -> dict[str, Any]:
    name = candidate.name.strip() or "Professional"
    skills_raw = candidate.skills or "[]"
    try:
        skills = json.loads(skills_raw) if isinstance(skills_raw, str) else []
    except json.JSONDecodeError:
        skills = []
    skill_list = [str(s) for s in skills if str(s).strip()][:8]
    return {
        "headline": f"{name} | {target_role}"[:220],
        "about": (
            f"I am focused on {target_role}. "
            f"{(candidate.cv_text or '')[:400]}…"
        )[:2600],
        "featured_skills": skill_list or ["Communication", "Delivery"],
        "post_ideas": [
            {"hook": f"Lesson from my work toward {target_role}", "outline": "One concrete win + takeaway"},
            {"hook": "What I look for in a great team", "outline": "3 bullets from your real experience"},
        ],
    }


def optimize_linkedin_profile(
    db: Session,
    candidate: Candidate,
    target_role: str,
) -> dict[str, Any]:
    role = target_role.strip()[:200] or "my next role"
    cv = (candidate.cv_text or candidate.name or "").strip()[:10000]
    if not cv:
        raise ValueError("Upload a CV or complete your profile first.")

    prompt = _LINKEDIN_PROMPT.format(target_role=role, cv=cv)
    ai = call_claude_json(prompt, max_tokens=3000)
    body = ai if ai else _fallback_linkedin(candidate, role)
    db.add(
        LinkedinOptimization(
            candidate_id=candidate.id,
            target_role=role,
            optimization_json=json.dumps(body, ensure_ascii=False),
        )
    )
    db.commit()
    return body
