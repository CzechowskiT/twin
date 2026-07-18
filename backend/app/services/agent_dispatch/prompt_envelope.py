"""Versioned prompt envelope with TWIN execution policy prefix."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any

from app.services.agent_dispatch.constants import PROMPT_ENVELOPE_VERSION

_SECRET_PATTERNS = (
    re.compile(r"(?i)(api[_-]?key|token|secret|password|bearer)\s*[:=]\s*\S+"),
    re.compile(r"(?i)sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"(?i)crsr_[a-zA-Z0-9]{20,}"),
    re.compile(r"(?i)ghp_[a-zA-Z0-9]{20,}"),
)

TWIN_EXECUTION_POLICY = """# TWIN Agent Dispatcher — execution policy (mandatory)

You are executing a production batch for the TWIN monorepo via the Agent Dispatcher.

Hard rules:
1. Follow the task prompt below exactly; do not expand into unrelated product work.
2. Never commit secrets, API keys, `.env`, or credentials. Never print secrets in logs or reports.
3. Prefer additive migrations and existing backend patterns. One PR when asked; no force-push to protected branches.
4. Manual merge only: never enable GitHub auto-merge; never merge PRs; never admin-override locks.
5. Gate F stays PENDING; Launch stays NO-GO unless the task explicitly changes those gates.
6. Return ONE consolidated Polish report at the end matching the task's required sections.
7. Use official Cursor / project docs when touching external APIs — do not invent endpoints.
8. After substantive code changes: run targeted tests, commit only related files when the task asks to ship.
9. Emit the final report once (final_report_once); do not spam duplicate status dumps.
10. Your own completion claim is not authoritative. Report evidence for every expected artifact;
    the Dispatcher independently reconciles and decides the final status.

---
# Task prompt
"""


@dataclass(frozen=True)
class PromptEnvelope:
    version: str
    prompt_hash: str
    rendered_text: str
    redacted_preview: str


def redact_secrets(text: str) -> str:
    out = text
    for pat in _SECRET_PATTERNS:
        out = pat.sub("[REDACTED]", out)
    return out


def build_prompt_envelope(
    user_prompt: str,
    *,
    policy_prefix: str | None = None,
    expected_artifacts: dict[str, Any] | None = None,
) -> PromptEnvelope:
    body = (user_prompt or "").strip()
    if not body:
        raise ValueError("prompt text is required")
    prefix = policy_prefix if policy_prefix is not None else TWIN_EXECUTION_POLICY
    contract = ""
    if expected_artifacts is not None:
        serialized = json.dumps(expected_artifacts, sort_keys=True, separators=(",", ":"))
        contract = f"\n# Dispatcher expected_artifacts\n{serialized}\n"
    rendered = f"{prefix}{contract}\n{body}\n"
    digest = hashlib.sha256(rendered.encode("utf-8")).hexdigest()
    preview = redact_secrets(body)
    if len(preview) > 240:
        preview = preview[:237] + "..."
    return PromptEnvelope(
        version=PROMPT_ENVELOPE_VERSION,
        prompt_hash=digest,
        rendered_text=rendered,
        redacted_preview=preview,
    )
