"""LinkedIn headline / about optimizer (US-C057)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, LinkedinOptimization
from app.services.career_assistant_common import call_claude_json

_LINKEDIN_PROMPT = """Optimize LinkedIn profile copy for a target role using ONLY CV facts.

Return ONLY JSON:
{{
  "headline": "max 220 chars",
  "about": "max 2600 chars, short paragraphs",
  "featured_skills": ["..."],
  "profile_tips": ["..."]
}}

Rules:
- No invented employers, titles, or certifications.
- 8–12 featured_skills, 4–6 profile_tips.
- Match CV language.

TARGET ROLE: {role}
CV:
{cv}
"""


def _fallback_linkedin(cv_text: str, target_role: str) -> dict[str, Any]:
    snippet = re.sub(r"\s+", " ", cv_text.strip())[:400]
    skills = [w for w in re.findall(r"\w{5,}", cv_text.lower()) if len(w) > 4][:10]
    return {
        "headline": f"{target_role} | Delivery-focused professional · details in experience",
        "about": (
            f"I am focused on roles as {target_role}. "
            f"Highlights from my background: {snippet}… "
            "Open to conversations where my experience maps to your team's priorities."
        )[:2600],
        "featured_skills": skills[:12] or ["delivery", "collaboration", "problem solving"],
        "profile_tips": [
            "Pin a post or project that proves the headline claim.",
            "Ask 1–2 colleagues for endorsements on skills you actually use weekly.",
        ],
        "source": "fallback",
    }


def optimize_linkedin_profile(
    db: Session,
    *,
    candidate: Candidate,
    target_role: str,
) -> LinkedinOptimization:
    cv_text = (candidate.cv_text or "").strip()
    if not cv_text:
        raise ValueError("Upload a CV first.")
    role = target_role.strip()[:200]
    if not role:
        raise ValueError("target_role is required")

    prompt = _LINKEDIN_PROMPT.format(role=role, cv=cv_text[:14_000])
    data = call_claude_json(prompt, max_tokens=2500)
    if not data:
        data = _fallback_linkedin(cv_text, role)
    else:
        data["source"] = "claude"
    data["generated_at"] = datetime.now(timezone.utc).isoformat()

    row = LinkedinOptimization(
        candidate_id=candidate.id,
        target_role=role,
        optimization_json=json.dumps(data, ensure_ascii=False),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
