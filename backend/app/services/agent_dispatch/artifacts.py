"""Infer and evaluate workflow artifacts without trusting agent-reported status."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

EXPECTED_KEYS = (
    "pr_required",
    "merge_required",
    "deployment_required",
    "ci_required",
    "regression_required",
    "production_regression_required",
    "mutation_required",
    "operator_execution_required",
)
MUTATION_KEYS = (
    "mutation_required",
    "commit_required",
    "pr_required",
    "merge_required",
    "deployment_required",
    "production_regression_required",
    "operator_execution_required",
)
VERIFIED_KEYS = (
    "pr_exists",
    "merge_verified",
    "deployment_verified",
    "ci_passed",
    "regression_passed",
)

_READ_ONLY = re.compile(r"\b(read[\s-]?only|tylko do odczytu)\b", re.I)
_NOT_READ_ONLY = re.compile(
    r"\b(remove|disable|turn off|usuń|wyłącz)\b.{0,16}\bread[\s-]?only\b",
    re.I,
)
_NO_BRANCH = re.compile(r"\b(no|not|without|nie|bez)\b.{0,24}\b(branch|brancha|gałęzi)\b", re.I)
_NO_COMMIT = re.compile(
    r"\b(no|not|without|nie|bez)\b.{0,24}\b(commit|commitu|zatwierdzeń)\b",
    re.I,
)
_NO_PR = re.compile(r"\b(no|not|without|nie|bez)\b.{0,24}\b(pr|pull request)\b", re.I)
_NO_GIT_WRITES = re.compile(
    r"(?:do not|don't|nie|bez).{0,24}branch.{0,16}commit.{0,16}(?:pr|pull request)",
    re.I,
)
_NULL_GIT_ARTIFACTS = re.compile(
    r"\b(?:branch|commit|pr|pull request)"
    r"(?:\s*[/,]\s*(?:branch|commit|pr|pull request)){1,}"
    r"\s*(?:are\s+)?(?:null|none)\b",
    re.I,
)
_MUTATION_REQUIREMENT = re.compile(
    r"\b(?:"
    r"implement|fix|add|update|change|remove|build|"
    r"commit|push|merge|deploy|workflow_dispatch|runtime config|"
    r"(?:create|open|update)\s+(?:a\s+)?(?:pr|pull request)|"
    r"(?:commit|pr|pull request|merge|deployment)\s+(?:is\s+)?required|"
    r"release (?:the )?lock|operator service|"
    r"napraw\w*|dodaj\w*|zmień\w*|usuń\w*|wdroż\w*|zbuduj\w*|"
    r"zacommit\w*|wypchn\w*|zwolnij\w*.{0,16}\block"
    r")\b",
    re.I,
)


def _mentions(text: str, *patterns: str) -> bool:
    return any(re.search(pattern, text, re.I) is not None for pattern in patterns)


def is_explicit_read_only(prompt: str) -> bool:
    """Only hide git artifacts when the prompt explicitly bans all git writes."""
    text = " ".join((prompt or "").split())
    return bool(
        (_READ_ONLY.search(text) and not _NOT_READ_ONLY.search(text))
        or _NO_GIT_WRITES.search(text)
        or (_NO_BRANCH.search(text) and _NO_COMMIT.search(text) and _NO_PR.search(text))
    )


def has_mutation_requirement(prompt: str) -> bool:
    """Detect explicit write work independently from read-only wording."""
    task_prompt = (prompt or "").rsplit("# Task prompt", 1)[-1]
    text = _NULL_GIT_ARTIFACTS.sub("", " ".join(task_prompt.split()))
    for match in _MUTATION_REQUIREMENT.finditer(text):
        prefix = text[max(0, match.start() - 24) : match.start()]
        if not re.search(r"\b(?:do not|don't|never|without|no|nie|bez)\b.{0,20}$", prefix, re.I):
            return True
    return False


def _invalid_contract(contract: dict[str, Any]) -> bool:
    mode = contract.get("execution_mode")
    if (mode == "read_only" and contract.get("read_only") is False) or (
        mode == "mutating" and contract.get("read_only") is True
    ):
        return True
    read_only = contract.get("read_only") is True or mode == "read_only"
    mutating = mode == "mutating" or any(
        contract.get(key) is True for key in MUTATION_KEYS
    )
    return bool(read_only and mutating)


def validate_execution_contract(contract: dict[str, Any]) -> None:
    """Reject contradictory contracts before persistence or dispatch."""
    mode = contract.get("execution_mode")
    if mode is not None and mode not in {"read_only", "mutating"}:
        raise ValueError("invalid_execution_contract")
    for key in ("read_only", *MUTATION_KEYS):
        value = contract.get(key)
        if key in contract and value is not None and not isinstance(value, bool):
            raise ValueError("invalid_execution_contract")
    if _invalid_contract(contract):
        raise ValueError("invalid_execution_contract")


def infer_expected_artifacts(prompt: str, *, auto_create_pr: bool = False) -> dict[str, Any]:
    """Infer required workflow gates from the user's command."""
    task_prompt = (prompt or "").rsplit("# Task prompt", 1)[-1]
    text = " ".join(task_prompt.split())
    mutation_signal = has_mutation_requirement(text)
    explicit_read_only = is_explicit_read_only(text)
    merge = _mentions(text, r"\bmerge[dr]?\b", r"\bzmerg\w*\b", r"\bscal\w*\b")
    merge &= not _mentions(
        text,
        r"\b(?:do not|don't|without|never|no(?!\s+auto))\b.{0,20}\bmerge\b",
        r"\b(?:nie|bez)\b.{0,20}\b(?:merge|merg|scal)",
    )
    deployment = _mentions(text, r"\bdeploy(?:ment|ed|uj\w*)?\b", r"\bwdroż\w*\b")
    deployment &= not _mentions(
        text,
        r"\b(?:do not|don't|without|no)\b.{0,20}\bdeploy",
        r"\b(?:nie|bez)\b.{0,20}\bwdroż",
    )
    regression = _mentions(text, r"\bregression\b", r"\bregres\w*\b")
    regression &= not _mentions(text, r"\b(?:skip|without|no)\b.{0,20}\bregres")
    ci = _mentions(text, r"\bci\b", r"\bcontinuous integration\b", r"\bzielon\w+ (?:ci|check)")
    ci &= not _mentions(text, r"\b(?:skip|without|no)\b.{0,20}\bci\b")
    pr = bool(auto_create_pr) or _mentions(
        text,
        r"\bpull request\b",
        r"\bpr\b",
        r"\butw[oó]rz\w* pr\b",
    )
    pr &= not _mentions(
        text,
        r"\b(?:do not|don't|without|no)\b.{0,20}\b(?:pr|pull request)\b",
        r"\b(?:nie|bez)\b.{0,20}\b(?:pr|pull request)\b",
    )
    ci = ci or merge
    commit = _mentions(
        text,
        r"\bcommit\b",
        r"\bsha\b",
        r"\bzacommit\w*\b",
        r"\bpush\b",
        r"\bwypchn\w*\b",
        r"\bship\b",
    )
    mutation = _mentions(
        text,
        r"\b(implement|fix|add|update|change|remove|build)\b",
        r"\b(napraw|dodaj|zmień|usuń|wdroż|zbuduj)\w*\b",
    )
    commit = commit or mutation
    commit &= not _mentions(
        text,
        r"\b(?:do not|don't|without|no)\b.{0,20}\bcommit\b",
        r"\b(?:nie|bez)\b.{0,20}\bcommit",
    )
    mutation = mutation or mutation_signal
    if explicit_read_only and not mutation_signal:
        pr = merge = deployment = ci = regression = commit = mutation = False
    pr = pr or merge
    commit = commit or pr or deployment or ci or regression
    inferred_mutation = bool(mutation or commit or pr or merge or deployment or ci or regression)
    mutating = inferred_mutation or not explicit_read_only
    return {
        "execution_mode": "mutating" if mutating else "read_only",
        "pr_required": pr,
        "merge_required": merge,
        "deployment_required": deployment,
        "ci_required": ci,
        "regression_required": regression,
        "production_regression_required": regression,
        "commit_required": commit,
        "mutation_required": mutating,
        "operator_execution_required": mutating,
        "read_only": not mutating,
    }


def resolve_execution_contract(
    prompt: str,
    *,
    explicit: dict[str, Any] | None = None,
    auto_create_pr: bool = False,
) -> dict[str, Any]:
    """Merge inference with explicit caller intent; mutation always wins."""
    contract = infer_expected_artifacts(prompt, auto_create_pr=auto_create_pr)
    supplied = {key: value for key, value in (explicit or {}).items() if value is not None}
    validate_execution_contract(supplied)

    for key in MUTATION_KEYS:
        if supplied.get(key) is True:
            contract[key] = True
    if supplied.get("production_regression_required") is True:
        contract["regression_required"] = True
    if supplied.get("execution_mode") == "mutating" or supplied.get("read_only") is False:
        contract["mutation_required"] = True
    explicit_read_only = (
        supplied.get("execution_mode") == "read_only" or supplied.get("read_only") is True
    )
    prompt_requires_mutation = has_mutation_requirement(prompt) or any(
        contract.get(key) is True
        for key in (
            "commit_required",
            "pr_required",
            "merge_required",
            "deployment_required",
            "ci_required",
            "regression_required",
        )
    )
    if explicit_read_only:
        if prompt_requires_mutation:
            raise ValueError("invalid_execution_contract")
        for key in MUTATION_KEYS:
            contract[key] = False
        contract.update(
            execution_mode="read_only",
            read_only=True,
            regression_required=False,
            production_regression_required=False,
        )
        validate_execution_contract(contract)
        return contract

    contract["pr_required"] |= bool(contract["merge_required"])
    contract["ci_required"] |= bool(contract["merge_required"])
    contract["commit_required"] |= bool(
        contract["pr_required"]
        or contract["deployment_required"]
        or contract["ci_required"]
        or contract["regression_required"]
    )
    mutating = any(contract.get(key) is True for key in MUTATION_KEYS)
    if mutating:
        contract.update(
            execution_mode="mutating",
            read_only=False,
            mutation_required=True,
            operator_execution_required=True,
        )
    else:
        contract.update(
            execution_mode="read_only",
            read_only=True,
            mutation_required=False,
            operator_execution_required=False,
        )
    contract["production_regression_required"] = bool(contract["regression_required"])
    validate_execution_contract(contract)
    return contract


def execution_contract_hash(contract: dict[str, Any]) -> str:
    """Stable idempotency discriminator without prompt or secret material."""
    canonical = json.dumps(normalize_expected(contract), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def normalize_expected(value: dict[str, Any] | None) -> dict[str, Any]:
    raw = value or {}
    regression = bool(
        raw.get("regression_required", raw.get("production_regression_required", False))
    )
    mutating = bool(
        raw.get("mutation_required", False)
        or raw.get("execution_mode") == "mutating"
        or any(raw.get(key, False) for key in MUTATION_KEYS[1:])
    )
    read_only = bool(raw.get("read_only", not mutating))
    return {
        **{
            key: bool(raw.get(key, False))
            for key in EXPECTED_KEYS
            if key not in {"regression_required", "production_regression_required"}
        },
        "execution_mode": raw.get("execution_mode")
        if raw.get("execution_mode") in {"read_only", "mutating"}
        else ("read_only" if read_only else "mutating"),
        "regression_required": regression,
        "production_regression_required": regression,
        "commit_required": bool(raw.get("commit_required", False)),
        "mutation_required": mutating,
        "operator_execution_required": bool(raw.get("operator_execution_required", mutating)),
        "read_only": read_only,
    }


def normalize_verified(value: dict[str, Any] | None) -> dict[str, bool]:
    raw = value or {}
    return {
        **{key: bool(raw.get(key, False)) for key in VERIFIED_KEYS},
        "commit_exists": bool(raw.get("commit_exists", False)),
        "head_sha_verified": bool(raw.get("head_sha_verified", False)),
    }


def missing_reason(expected: dict[str, Any], verified: dict[str, Any]) -> str | None:
    """Return the first deterministic missing-artifact reason code."""
    checks = (
        ("pr_required", "pr_exists", "expected_pr_missing"),
        ("merge_required", "merge_verified", "expected_merge_missing"),
        ("deployment_required", "deployment_verified", "expected_deployment_missing"),
        ("commit_required", "commit_exists", "expected_commit_missing"),
        ("ci_required", "ci_passed", "expected_ci_missing"),
        ("regression_required", "regression_passed", "expected_regression_missing"),
    )
    for required, present, reason in checks:
        if expected.get(required) and not verified.get(present):
            return reason
    return None
