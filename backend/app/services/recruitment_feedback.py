"""Turn recruiter / process notes into structured upskill signals (Claude or fallback)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured

_FEEDBACK_PROMPT = """You help a job candidate preserve and structure feedback from hiring processes (email, call notes, rejection reasons).

Return ONLY valid JSON with this exact shape:
{{
  "skill_tool_gaps": ["string"],
  "positioning_gaps": ["string"],
  "what_stronger_candidates_showed": ["string"],
  "upskill_actions": [
    {{"title": "string", "priority": "high|medium|low", "rationale": "string"}}
  ],
  "summary": "string"
}}

Rules:
- Use ONLY what is implied or stated in the notes; do not invent company names or interview rounds.
- skill_tool_gaps: concrete tools, platforms, certifications, or domains missing (e.g. Celonis, Signavio).
- positioning_gaps: narrative / emphasis issues (e.g. too sales-led vs operational depth).
- what_stronger_candidates_showed: what interviewers said others brought — only if mentioned.
- upskill_actions: 3–8 specific, actionable next steps tied to the gaps.
- summary: 2–4 sentences in the same dominant language as the notes.

NOTES:
{notes}
"""


def _fallback_insights(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    lines = [re.sub(r"^[\s•\-–\d.)]+", "", ln).strip() for ln in text.splitlines() if ln.strip()]
    bullets = [ln[:400] for ln in lines if 10 < len(ln) < 500][:8]
    return {
        "skill_tool_gaps": [],
        "positioning_gaps": bullets[:4] if bullets else [],
        "what_stronger_candidates_showed": [],
        "upskill_actions": [
            {
                "title": "Review and practice stories for the gaps above",
                "priority": "medium",
                "rationale": "Structured AI parsing is limited without ANTHROPIC_API_KEY — add it for deeper extraction.",
            }
        ],
        "summary": (text[:900] + "…") if len(text) > 900 else text or "No notes provided.",
        "parsed_at": datetime.now(timezone.utc).isoformat(),
        "source": "fallback",
    }


def _parse_with_claude(raw: str) -> dict[str, Any] | None:
    client = get_anthropic_client()
    if not client:
        return None
    notes = raw.strip()[:14_000]
    if not notes:
        return None
    prompt = _FEEDBACK_PROMPT.format(notes=notes)
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_out = msg.content[0].text if msg.content else ""
        start = raw_out.find("{")
        end = raw_out.rfind("}")
        if start < 0 or end <= start:
            return None
        data = json.loads(raw_out[start : end + 1])
        if not isinstance(data, dict):
            return None
        out = {
            "skill_tool_gaps": _as_str_list(data.get("skill_tool_gaps"), 24, 120),
            "positioning_gaps": _as_str_list(data.get("positioning_gaps"), 16, 240),
            "what_stronger_candidates_showed": _as_str_list(
                data.get("what_stronger_candidates_showed"), 12, 280
            ),
            "upskill_actions": _as_actions(data.get("upskill_actions")),
            "summary": str(data.get("summary") or "").strip()[:2000],
        }
        if not out["summary"] and not out["skill_tool_gaps"] and not out["positioning_gaps"]:
            return None
        out["parsed_at"] = datetime.now(timezone.utc).isoformat()
        out["source"] = "claude"
        return out
    except Exception:
        return None


def _as_str_list(val: Any, max_n: int, max_len: int) -> list[str]:
    if not isinstance(val, list):
        return []
    out: list[str] = []
    for x in val:
        s = str(x).strip()[:max_len]
        if s and s not in out:
            out.append(s)
        if len(out) >= max_n:
            break
    return out


def _as_actions(val: Any) -> list[dict[str, str]]:
    if not isinstance(val, list):
        return []
    out: list[dict[str, str]] = []
    for x in val:
        if not isinstance(x, dict):
            continue
        title = str(x.get("title") or "").strip()[:200]
        if not title:
            continue
        pr = str(x.get("priority") or "medium").lower()
        if pr not in ("high", "medium", "low"):
            pr = "medium"
        rat = str(x.get("rationale") or "").strip()[:600]
        out.append({"title": title, "priority": pr, "rationale": rat})
        if len(out) >= 10:
            break
    return out


def build_feedback_insights(raw_notes: str) -> dict[str, Any]:
    """Produce insights dict to JSON-serialize into Application.feedback_insights_json."""
    text = (raw_notes or "").strip()
    if not text:
        raise ValueError("Feedback notes are empty.")
    if is_anthropic_configured():
        ai = _parse_with_claude(text)
        if ai:
            return ai
    fb = _fallback_insights(text)
    return fb


def parse_stored_insights_json(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def merge_unique_str(items: list[str], add: list[str], cap: int) -> None:
    seen = {x.lower() for x in items}
    for a in add:
        s = str(a).strip()
        if not s or s.lower() in seen:
            continue
        seen.add(s.lower())
        items.append(s)
        if len(items) >= cap:
            break
