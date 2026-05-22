"""Shared helpers for AI career assistant services."""

from __future__ import annotations

import json
from typing import Any

from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured


def parse_claude_json(text: str) -> dict[str, Any] | None:
    """Extract JSON object from Claude response (fenced or raw)."""
    raw = (text or "").strip()
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0]
    raw = raw.strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def call_claude_json(prompt: str, *, max_tokens: int = 2500) -> dict[str, Any] | None:
    """Sync Anthropic call; returns parsed JSON dict or None."""
    if not is_anthropic_configured():
        return None
    client = get_anthropic_client()
    if not client:
        return None
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_out = msg.content[0].text if msg.content else ""
        return parse_claude_json(raw_out)
    except Exception:
        return None
