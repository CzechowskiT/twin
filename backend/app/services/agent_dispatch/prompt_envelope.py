"""Versioned prompt envelope with TWIN execution policy prefix."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from app.services.agent_dispatch.constants import PROMPT_ENVELOPE_VERSION

_SECRET_PATTERNS = (
    re.compile(r"(?i)(api[_-]?key|token|secret|password|bearer)\s*[:=]\s*\S+"),
    re.compile(r"(?i)sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"(?i)crsr_[a-zA-Z0-9]{20,}"),
    re.compile(r"(?i)ghp_[a-zA-Z0-9]{20,}"),
)
_GIT_ACTION_PROHIBITION = re.compile(
    r"(?i)\b(?:"
    r"(?:do\s+not|don't|must\s+not|may\s+not|never)\s+"
    r"(?:create|make|open|push|write|submit|start|checkout|switch|commit)\w*|"
    r"nie\s+(?:twórz|tworzyć|zakładaj|zakładać|rób|robić|wykonuj|"
    r"wykonywać|otwieraj|otwierać|commituj|commitować)|"
    r"(?:without\s+(?:creating|making|opening|committing)|"
    r"bez\s+(?:tworzenia|zakładania|robienia|wykonywania|otwierania|commitowania))|"
    r"zakaz\s+(?:tworzenia|zakładania|robienia|wykonywania|otwierania|commitowania)"
    r")\b[^.!?;\n]{0,200}"
)
_GIT_DIRECT_PROHIBITION = re.compile(
    r"(?i)\b(?:no|bez)\s+(?:new\s+|any\s+|nowych\s+)?"
    r"(?=(?:branch|branchy|brancha|branchów|gałąź|gałęzi|commit|pr\b|pr-ów|pull[\s-]+request))"
    r"[^.!?;\n]{0,200}"
)
_GIT_ARTIFACTS = (
    re.compile(r"(?i)\b(?:branch(?:es)?|brancha|branchy|branchów|gałęzi|gałąź)\b"),
    re.compile(r"(?i)\bcommit(?:s|ów|u|y|ach)?\b"),
    re.compile(r"(?i)\b(?:pr(?:s|-ów)?|pull[\s-]+requests?|pull[\s-]+requestu)\b"),
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


def prompt_forbids_git_artifacts(user_prompt: str) -> bool:
    """Detect an explicit ban on branch, commit, and PR creation."""
    prohibited = [False, False, False]
    normalized = (user_prompt or "").replace("’", "'")
    clauses = [
        *(_GIT_ACTION_PROHIBITION.finditer(normalized)),
        *(_GIT_DIRECT_PROHIBITION.finditer(normalized)),
    ]
    for match in clauses:
        clause = match.group(0)
        for index, artifact in enumerate(_GIT_ARTIFACTS):
            prohibited[index] = prohibited[index] or bool(artifact.search(clause))
    return all(prohibited)


def build_prompt_envelope(user_prompt: str, *, policy_prefix: str | None = None) -> PromptEnvelope:
    body = (user_prompt or "").strip()
    if not body:
        raise ValueError("prompt text is required")
    prefix = policy_prefix if policy_prefix is not None else TWIN_EXECUTION_POLICY
    rendered = f"{prefix}\n{body}\n"
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
