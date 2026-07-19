"""Autonomous Planner — goal, batch, contract, Product Agent prompt (no founder copy)."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from app.services.founder_command.constants import (
    AutonomyLevel,
    DEFAULT_BASE_BRANCH,
    DEFAULT_MAX_BATCHES,
    DEFAULT_MAX_RUNTIME_MINUTES,
    DEFAULT_REPO_URL,
    GATE_F_STATUS,
    LAUNCH_STANCE,
)

PLANNER_EXECUTION_MODE_MISMATCH = "planner_execution_mode_mismatch"

# Explicit read-only / analysis-only intent (Polish + English).
_EXPLICIT_ANALYSIS = re.compile(
    r"("
    r"\b(diagnos\w*|inspect\w*|audit\w*|analy[sz]\w*|read[\s-]?only|diagnostycz\w*)\b"
    r"|"
    r"\b(przeanaliz\w*|analizuj\w*|analiza)\b"
    r"|"
    r"\b(bez\s+zmian|without\s+mutations?|no\s+mutations?|inspection[\s-]?only|"
    r"tylko\s+odczyt|bezpieczn\w*\s+diagnostycz\w*)\b"
    r")",
    re.I,
)

# Mutating scope: code/tests/PR/merge/deploy/policy — must never silently become analysis.
_MUTATING_SCOPE = re.compile(
    r"("
    r"\b(build|implement|fix|ship|commit|napraw\w*|zbuduj\w*|zaimplement\w*|"
    r"merge|deploy(?:ment|ed|uj\w*)?|railway|vercel|production|produkcj\w*|"
    r"testy|tests?|regres\w*|policy|approval\s*policy|pr\b|pull\s*request)\b"
    r"|"
    r"\b(zmień|zmien|dodaj|utwórz|utworz|wdroż\w*|wdroz\w*|scal\w*)\b"
    r")",
    re.I,
)

_DEPLOY = re.compile(
    r"\b(deploy(?:ment|ed|uj\w*)?|railway|vercel|production|produkcj\w*|wdroż\w*|wdroz\w*)\b",
    re.I,
)
_BUILD = re.compile(
    r"\b(build|implement|fix|ship|pr\b|pull\s*request|commit|napraw\w*|zbuduj\w*|"
    r"testy|tests?|policy|approval\s*policy|zmień|zmien|dodaj|utwórz|utworz)\b",
    re.I,
)
_CONTINUOUS = re.compile(r"\b(continu|ciągł|keep (going|shipping)|wystarczy|loop)\b", re.I)

_PLANNER_MODES = frozenset({"analysis", "build", "deploy", "continuous"})


def has_mutating_scope(command_text: str) -> bool:
    return bool(_MUTATING_SCOPE.search(command_text or ""))


def has_explicit_analysis_request(command_text: str, *, action: str = "start") -> bool:
    if action == "analyze":
        return True
    return bool(_EXPLICIT_ANALYSIS.search(command_text or ""))


def _truncate_goal(text: str, limit: int = 240) -> str:
    cleaned = " ".join((text or "").split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def _infer_mode(command_text: str, autonomy_level: int) -> str:
    """Classify planner mode. Never silently force analysis over mutating scope."""
    mutating = has_mutating_scope(command_text)
    explicit_analysis = bool(_EXPLICIT_ANALYSIS.search(command_text or ""))

    if mutating and explicit_analysis:
        # e.g. "przeanalizuj i napraw" — mutation wins when autonomy allows work.
        if autonomy_level <= AutonomyLevel.ANALYSIS.value:
            raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)
        explicit_analysis = False

    if explicit_analysis and not mutating:
        return "analysis"

    if autonomy_level <= AutonomyLevel.ANALYSIS.value:
        if mutating:
            raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)
        return "analysis"

    if autonomy_level >= AutonomyLevel.CONTINUOUS.value and _CONTINUOUS.search(command_text):
        return "continuous"
    if autonomy_level >= AutonomyLevel.DEPLOY.value and _DEPLOY.search(command_text):
        return "deploy"
    if autonomy_level >= AutonomyLevel.BUILD.value and _BUILD.search(command_text):
        return "build"
    if autonomy_level >= AutonomyLevel.CONTINUOUS.value:
        return "continuous"
    if autonomy_level >= AutonomyLevel.DEPLOY.value:
        return "deploy"
    if autonomy_level >= AutonomyLevel.BUILD.value:
        return "build"
    # Ambiguous with no mutating signal and no analysis — do not invent read-only.
    raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)


def _execution_contract_for_mode(mode: str) -> dict[str, Any]:
    """Explicit False preservation for non-required mutation flags."""
    if mode == "analysis":
        return {
            "execution_mode": "read_only",
            "read_only": True,
            "mutation_required": False,
            "commit_required": False,
            "pr_required": False,
            "merge_required": False,
            "deployment_required": False,
            "production_regression_required": False,
            "operator_execution_required": False,
        }
    if mode == "build":
        return {
            "execution_mode": "mutating",
            "read_only": False,
            "mutation_required": True,
            "commit_required": True,
            "pr_required": True,
            "merge_required": False,
            "deployment_required": False,
            "production_regression_required": False,
            "operator_execution_required": True,
        }
    # deploy + continuous: mutating with operator; merge stays manual
    return {
        "execution_mode": "mutating",
        "read_only": False,
        "mutation_required": True,
        "commit_required": True,
        "pr_required": True,
        "merge_required": False,
        "deployment_required": True,
        "production_regression_required": True,
        "operator_execution_required": True,
    }


def _merge_explicit_contract(
    base: dict[str, Any], explicit: dict[str, Any] | None
) -> dict[str, Any]:
    if not explicit:
        return base
    out = dict(base)
    for key, value in explicit.items():
        if value is None:
            continue
        out[key] = value
    # Keep dispatcher mode / read_only consistent.
    if out.get("read_only") is True:
        out["execution_mode"] = "read_only"
    elif out.get("read_only") is False or any(
        out.get(k) is True
        for k in (
            "mutation_required",
            "commit_required",
            "pr_required",
            "merge_required",
            "deployment_required",
        )
    ):
        out["execution_mode"] = "mutating"
        out["read_only"] = False
    return out


def _validate_plan_against_intent(
    *,
    command_text: str,
    action: str,
    autonomy_level: int,
    mode: str,
    contract: dict[str, Any],
    explicit_analysis_override: bool,
) -> None:
    """Reject silent analysis/read-only plans for mutating founder intent."""
    mutating = has_mutating_scope(command_text)
    explicit_analysis = explicit_analysis_override or has_explicit_analysis_request(
        command_text, action=action
    )
    # action=analyze with mutating scope is already rejected earlier unless override.
    if action == "analyze" and mutating and not explicit_analysis_override:
        raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)
    read_only_plan = mode == "analysis" or (
        contract.get("read_only") is True
        and contract.get("execution_mode") == "read_only"
    )
    if read_only_plan and not explicit_analysis:
        if mutating or autonomy_level >= AutonomyLevel.BUILD.value:
            raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)
    if mode != "analysis" and contract.get("read_only") is True:
        raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)
    if mode == "analysis" and contract.get("mutation_required") is True:
        raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)


def plan_contract_fingerprint(
    *,
    direction: str,
    execution_mode: str,
    autonomy_level: int,
    contract: dict[str, Any],
) -> str:
    """Stable hash so idempotency cannot reuse a different execution contract."""
    payload = {
        "direction": " ".join((direction or "").split()),
        "execution_mode": execution_mode,
        "autonomy_level": autonomy_level,
        "mutating_scope": has_mutating_scope(direction),
        "contract": {
            k: contract.get(k)
            for k in (
                "execution_mode",
                "read_only",
                "mutation_required",
                "commit_required",
                "pr_required",
                "merge_required",
                "deployment_required",
                "production_regression_required",
                "operator_execution_required",
            )
        },
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def _product_agent_prompt(
    *,
    command_text: str,
    goal: str,
    batch_objective: str,
    mode: str,
    contract: dict[str, Any],
    project_state: dict[str, Any],
    acceptance: list[str],
    stop_conditions: list[str],
) -> str:
    prod = project_state.get("production") or {}
    counters = project_state.get("counters") or {}
    if mode == "analysis":
        constraints = [
            "- Inspection-only diagnostic — no git writes and no production changes.",
            "- Use existing Agent Dispatcher / Operator diagnose paths when needed.",
            "- No secrets in reports; no fake PASS; no `|| true`.",
            "- Reply with ONE Polish consolidated report including LINKS.",
        ]
    else:
        constraints = [
            "- Integrate with existing Agent Dispatcher / Operator — do not rebuild them.",
            "- No secrets in reports; no fake PASS; no `|| true`.",
            "- Prefer ONE main PR; manual merge after CI.",
            "- Reply with ONE Polish consolidated report including LINKS.",
        ]
    lines = [
        "# TWIN Product Agent — auto-generated by Founder Command Center",
        "# Founder must NEVER copy this prompt manually.",
        "",
        f"## Goal\n{goal}",
        f"## Batch objective\n{batch_objective}",
        f"## Execution mode\n{mode}",
        "## Execution contract (explicit; preserve False)",
        "```json",
        json.dumps(contract, indent=2, sort_keys=True),
        "```",
        "## Project state (canonical)",
        f"- api_git_commit: {prod.get('api_git_commit')}",
        f"- alignment: {prod.get('alignment_status')}",
        f"- Gate F: {GATE_F_STATUS} (preserve)",
        f"- Launch: {LAUNCH_STANCE} (preserve)",
        f"- counters: {json.dumps(counters, sort_keys=True)}",
        "",
        "## Founder direction",
        command_text.strip(),
        "",
        "## Acceptance",
        *[f"- {a}" for a in acceptance],
        "",
        "## Stop conditions",
        *[f"- {s}" for s in stop_conditions],
        "",
        "## Constraints",
        *constraints,
    ]
    return "\n".join(lines)


def plan_from_command(
    *,
    command_text: str,
    project_state: dict[str, Any],
    autonomy_level: int,
    max_batches: int | None,
    max_runtime_minutes: int | None,
    action: str = "start",
    explicit_execution_mode: str | None = None,
    explicit_execution_contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build an autonomous plan. Explicit API contract overrides text inference."""
    text = (command_text or "").strip()
    mutating = has_mutating_scope(text)

    # action=analyze + mutating scope must not silently become read-only.
    if action == "analyze" and mutating and not explicit_execution_mode:
        raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)

    if explicit_execution_mode:
        if explicit_execution_mode not in _PLANNER_MODES:
            raise ValueError(PLANNER_EXECUTION_MODE_MISMATCH)
        mode = explicit_execution_mode
    elif action == "analyze":
        mode = "analysis"
        autonomy_level = min(autonomy_level, AutonomyLevel.ANALYSIS.value)
    else:
        mode = _infer_mode(text, autonomy_level)

    if mode == "analysis":
        autonomy_level = min(autonomy_level, AutonomyLevel.ANALYSIS.value)

    if autonomy_level >= AutonomyLevel.CONTINUOUS.value:
        if not max_batches or not max_runtime_minutes:
            raise ValueError("level_4_requires_max_batches_and_max_runtime")
    batches = int(max_batches or DEFAULT_MAX_BATCHES)
    runtime = int(max_runtime_minutes or DEFAULT_MAX_RUNTIME_MINUTES)

    contract = _merge_explicit_contract(
        _execution_contract_for_mode(mode), explicit_execution_contract
    )
    # If explicit contract forces mutating flags, upgrade planner mode out of analysis.
    if mode == "analysis" and contract.get("read_only") is False:
        mode = "build"
        contract = _merge_explicit_contract(
            _execution_contract_for_mode(mode), explicit_execution_contract
        )

    explicit_analysis_override = bool(
        explicit_execution_mode == "analysis"
        or (explicit_execution_contract or {}).get("read_only") is True
    )
    _validate_plan_against_intent(
        command_text=text,
        action=action,
        autonomy_level=autonomy_level,
        mode=mode,
        contract=contract,
        explicit_analysis_override=explicit_analysis_override,
    )

    # Goal preserves founder direction — never replace mutating work with a fixed diagnostic.
    if mode == "analysis":
        goal = _truncate_goal(text) or "Diagnose TWIN production readiness without mutations"
        batch_objective = (
            "Safe diagnostic batch: health, dispatcher, Gate F/Launch, counters → PASS handoff"
        )
    else:
        goal = _truncate_goal(text) or "Ship the next safe MVP batch toward Founder Command autonomy"
        batch_objective = f"Execute one bounded {mode} batch with explicit contract and auto handoff"

    acceptance = [
        "No manual founder copy of prompts/reports/run IDs",
        "Cursor Agent URL present in Founder Command UI when dispatched",
        "Final summary + handoff links recorded",
        "Counters return to zero or documented residual with decision",
        f"Gate F remains {GATE_F_STATUS}; Launch remains {LAUNCH_STANCE}",
    ]
    stop_conditions = [
        f"max_batches={batches}",
        f"max_runtime_minutes={runtime}",
        "max_consecutive_failures reached",
        "pending high-risk decision without approval",
        "Gate F or Launch regression detected",
    ]
    approval_needs: list[str] = []
    # Standard deploy after green CI is auto under Approval Policy; do not duplicate
    # production_deploy here — high-risk/destructive ops still require founder approval.
    if autonomy_level >= AutonomyLevel.CONTINUOUS.value:
        approval_needs.append("continuous_loop")

    repo = (project_state.get("repo") or {}).get("url") or DEFAULT_REPO_URL
    base = (project_state.get("repo") or {}).get("base_branch") or DEFAULT_BASE_BRANCH
    prompt = _product_agent_prompt(
        command_text=text,
        goal=goal,
        batch_objective=batch_objective,
        mode=mode,
        contract=contract,
        project_state=project_state,
        acceptance=acceptance,
        stop_conditions=stop_conditions,
    )
    fingerprint = plan_contract_fingerprint(
        direction=text,
        execution_mode=mode,
        autonomy_level=autonomy_level,
        contract=contract,
    )
    plan = {
        "goal": goal,
        "batch_objective": batch_objective,
        "execution_mode": mode,
        "autonomy_level": autonomy_level,
        "execution_contract": contract,
        "acceptance": acceptance,
        "stop_conditions": stop_conditions,
        "approval_needs": approval_needs,
        "next_batch_proposal": {
            "task_name": f"founder-cmd-{mode}",
            "repository_url": repo,
            "base_branch": base,
            "auto_create_pr": bool(contract.get("pr_required")),
        },
        "limits": {
            "max_batches": batches,
            "max_runtime_minutes": runtime,
        },
        "product_agent_prompt": prompt,
        "product_agent_prompt_hash": hashlib.sha256(prompt.encode()).hexdigest(),
        "contract_fingerprint": fingerprint,
    }
    return plan
