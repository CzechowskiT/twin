"""Server-owned provider execution metadata for practice evaluation.

Captured at the adapter boundary — never trusted from the model or candidate.
"""

from __future__ import annotations

import uuid
from typing import Any

PROMPT_VERSION_PRACTICE_EVAL = "practice_eval_v1"
PROMPT_VERSION_ADAPTIVE_FOLLOWUP = "practice_adaptive_followup_v1"

KIND_LIVE = "live"
KIND_STUB = "stub"
KIND_LIBRARY = "library"
KIND_OBJECTIVE = "objective_checker"

PROVIDER_ANTHROPIC = "anthropic"
PROVIDER_HARNESS = "harness_stub"
PROVIDER_LIBRARY = "deterministic_library"
PROVIDER_OBJECTIVE = "objective_answer_key"


def new_execution_id() -> str:
    return str(uuid.uuid4())


def build_execution(
    *,
    kind: str,
    provider: str,
    status: str = "completed",
    configured_model: str | None = None,
    returned_model: str | None = None,
    provider_request_id: str | None = None,
    input_turn_id: int | None = None,
    input_revision: int | None = None,
    prompt_version: str | None = None,
    rubric_version: str | None = None,
    usage: dict[str, Any] | None = None,
    execution_id: str | None = None,
) -> dict[str, Any]:
    """Build a bounded, privacy-safe execution record (no secrets, no answer text)."""
    return {
        "execution_id": execution_id or new_execution_id(),
        "kind": kind,
        "provider": provider,
        "configured_model": configured_model,
        "returned_model": returned_model,
        "provider_request_id": provider_request_id,
        "input_turn_id": input_turn_id,
        "input_revision": input_revision,
        "prompt_version": prompt_version,
        "rubric_version": rubric_version,
        "status": status,
        "usage": usage,
    }


def attach_input_binding(
    meta: dict[str, Any] | None,
    *,
    turn_id: int | None,
    revision: int | None,
) -> dict[str, Any] | None:
    if not meta:
        return None
    out = dict(meta)
    if turn_id is not None:
        out["input_turn_id"] = turn_id
    if revision is not None:
        out["input_revision"] = revision
    return out


def is_live_execution(meta: dict[str, Any] | None) -> bool:
    if not isinstance(meta, dict):
        return False
    return (
        meta.get("kind") == KIND_LIVE
        and meta.get("provider") == PROVIDER_ANTHROPIC
        and meta.get("status") == "completed"
        and bool(meta.get("execution_id"))
    )
