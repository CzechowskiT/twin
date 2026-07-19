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
_READ_ONLY_REGRESSION = re.compile(
    r"(?:"
    r"\b(?:read[\s-]?only|tylko do odczytu)\b"
    r"(?:\s+[\w-]+){0,3}\s+\b(?:regression|regres\w*)\b"
    r"|"
    r"\b(?:regression|regres\w*)\b"
    r"(?:\s+[\w-]+){0,3}\s+\b(?:read[\s-]?only|tylko do odczytu)\b"
    r")",
    re.I,
)
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
_INSPECTION = re.compile(
    r"\b(inspect|audit|review|analy[sz]\w*|inspek\w*|audyt\w*|przejrzyj)\b",
    re.I,
)
_NO_CHANGES = re.compile(
    r"\b(no changes|without changes|do not (?:modify|change)|"
    r"bez zmian|nie (?:modyfikuj|zmieniaj))\b",
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


def _has_unscoped_read_only(text: str) -> bool:
    scoped_spans = [match.span() for match in _READ_ONLY_REGRESSION.finditer(text)]
    return any(
        not any(start <= match.start() and match.end() <= end for start, end in scoped_spans)
        for match in _READ_ONLY.finditer(text)
    )


def is_explicit_read_only(prompt: str) -> bool:
    """Only hide git artifacts when the prompt explicitly bans all git writes."""
    text = " ".join((prompt or "").split())
    return bool(
        (_has_unscoped_read_only(text) and not _NOT_READ_ONLY.search(text))
        or _NO_GIT_WRITES.search(text)
        or (_NO_BRANCH.search(text) and _NO_COMMIT.search(text) and _NO_PR.search(text))
        or (_INSPECTION.search(text) and _NO_CHANGES.search(text))
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
    ci = ci or (merge and (deployment or regression))
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


_EXPLICIT_CONTRACT_KEYS = (
    "execution_mode",
    "read_only",
    *MUTATION_KEYS,
    "ci_required",
    "regression_required",
    "production_regression_required",
)
_DELIVERY_KEYS = (
    "commit_required",
    "pr_required",
    "merge_required",
    "deployment_required",
    "ci_required",
    "regression_required",
)


def resolve_execution_contract(
    prompt: str,
    *,
    explicit: dict[str, Any] | None = None,
    auto_create_pr: bool = False,
) -> dict[str, Any]:
    """Merge inference with explicit caller intent; mutation always wins.

    Explicit True/False flags override prompt inference for those keys. Delivery
    implications (merge→PR/CI, delivery→commit) only fill keys the caller did
    not set — so a mutating operator diagnose with commit_required=false and
    deployment_required=false stays workflow-only.
    """
    contract = infer_expected_artifacts(prompt, auto_create_pr=auto_create_pr)
    supplied = {key: value for key, value in (explicit or {}).items() if value is not None}
    validate_execution_contract(supplied)

    for key in _EXPLICIT_CONTRACT_KEYS:
        if key in supplied:
            contract[key] = supplied[key]
    if "production_regression_required" in supplied:
        contract["regression_required"] = bool(supplied["production_regression_required"])
    elif "regression_required" in supplied:
        contract["production_regression_required"] = bool(supplied["regression_required"])
    if supplied.get("execution_mode") == "mutating" or supplied.get("read_only") is False:
        contract["mutation_required"] = True
        contract["read_only"] = False
        contract["execution_mode"] = "mutating"
    if supplied.get("operator_execution_required") is True:
        contract["operator_execution_required"] = True
    explicit_read_only = (
        supplied.get("execution_mode") == "read_only" or supplied.get("read_only") is True
    )
    prompt_requires_mutation = has_mutation_requirement(prompt) or any(
        contract.get(key) is True for key in _DELIVERY_KEYS
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

    def _imply(key: str) -> None:
        if key not in supplied:
            contract[key] = True

    if contract["merge_required"]:
        _imply("pr_required")
        _imply("ci_required")
    delivery_needs_commit = any(
        contract.get(key)
        for key in ("pr_required", "deployment_required", "ci_required", "regression_required")
    )
    if delivery_needs_commit:
        if supplied.get("commit_required") is False:
            raise ValueError("invalid_execution_contract")
        contract["commit_required"] = True
    mutating = any(contract.get(key) is True for key in MUTATION_KEYS)
    if mutating:
        contract.update(
            execution_mode="mutating",
            read_only=False,
            mutation_required=True,
            operator_execution_required=supplied.get("operator_execution_required") is not False,
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
    )
    for required, present, reason in checks:
        if expected.get(required) and not verified.get(present):
            return reason
    if expected.get("commit_required") and not (
        verified.get("commit_exists") and verified.get("head_sha_verified")
    ):
        return "expected_commit_missing"
    checks = (
        ("ci_required", "ci_passed", "expected_ci_missing"),
        ("regression_required", "regression_passed", "expected_regression_missing"),
    )
    for required, present, reason in checks:
        if expected.get(required) and not verified.get(present):
            return reason
    return None


ARTIFACT_STATE_NOT_REQUIRED = "not_required"
ARTIFACT_STATE_PRESENT = "expected_present"
ARTIFACT_STATE_PENDING = "expected_pending"
ARTIFACT_STATE_MISSING = "expected_missing"
ARTIFACT_STATE_INCONSISTENT = "inconsistent"
CONTRACT_BACKFILL_VERSION = "artifact-contract-v1"


def sha_matches(left: str | None, right: str | None) -> bool:
    """Compare full or abbreviated Git SHAs without weakening length floors."""
    a = (left or "").strip().lower()
    b = (right or "").strip().lower()
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) < 7 or len(b) < 7:
        return False
    hex_chars = "0123456789abcdef"
    if not (all(c in hex_chars for c in a) and all(c in hex_chars for c in b)):
        return False
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    return longer.startswith(shorter)


def artifact_requirement_states(
    expected: dict[str, Any],
    verified: dict[str, Any],
    *,
    pending: dict[str, bool] | None = None,
    linked: dict[str, bool] | None = None,
) -> dict[str, str]:
    """Explicit per-artifact gate states derived only from the stored contract."""
    exp = normalize_expected(expected)
    ver = normalize_verified(verified)
    pending_flags = pending or {}
    linked_flags = linked or {}
    pairs = (
        ("pr", "pr_required", "pr_exists"),
        ("merge", "merge_required", "merge_verified"),
        ("deployment", "deployment_required", "deployment_verified"),
        ("ci", "ci_required", "ci_passed"),
        ("regression", "regression_required", "regression_passed"),
    )
    states: dict[str, str] = {}
    for name, required_key, verified_key in pairs:
        if not exp.get(required_key):
            states[name] = ARTIFACT_STATE_NOT_REQUIRED
            continue
        if linked_flags.get(name) is False:
            states[name] = ARTIFACT_STATE_INCONSISTENT
        elif ver.get(verified_key):
            states[name] = ARTIFACT_STATE_PRESENT
        elif pending_flags.get(name):
            states[name] = ARTIFACT_STATE_PENDING
        else:
            states[name] = ARTIFACT_STATE_MISSING
    if not exp.get("commit_required"):
        states["commit"] = ARTIFACT_STATE_NOT_REQUIRED
    elif linked_flags.get("commit") is False:
        states["commit"] = ARTIFACT_STATE_INCONSISTENT
    elif ver.get("commit_exists") and ver.get("head_sha_verified"):
        states["commit"] = ARTIFACT_STATE_PRESENT
    elif pending_flags.get("commit"):
        states["commit"] = ARTIFACT_STATE_PENDING
    else:
        states["commit"] = ARTIFACT_STATE_MISSING
    return states


def backfill_execution_contract(
    raw: dict[str, Any] | None,
    *,
    source: str,
    reason: str,
) -> tuple[dict[str, Any], dict[str, str]]:
    """Deterministic normalize for incomplete stored contracts; never invent flags."""
    payload = dict(raw or {})
    if payload.get("read_only") is True and any(payload.get(key) is True for key in MUTATION_KEYS):
        raise ValueError("invalid_execution_contract")
    if payload.get("execution_mode") == "read_only" and any(
        payload.get(key) is True for key in MUTATION_KEYS
    ):
        raise ValueError("invalid_execution_contract")
    contract = normalize_expected(payload)
    meta = {
        "reason": reason,
        "source": source,
        "version": CONTRACT_BACKFILL_VERSION,
    }
    return contract, meta


def artifact_outcome(
    expected: dict[str, Any],
    verified: dict[str, Any],
    *,
    reconcile_ok: bool = True,
    verification_error: bool = False,
) -> tuple[str, str | None]:
    """Return the final workflow outcome without trusting an agent-reported status."""
    reason = missing_reason(normalize_expected(expected), normalize_verified(verified))
    if not reconcile_ok or verification_error:
        return "needs_attention", "reconcile_failed"
    if reason:
        return "needs_attention", reason
    return "succeeded", None


def artifact_gate_canary_probe() -> dict[str, Any]:
    """Health-probe for contract-scoped gating (operator diagnose / no deploy)."""
    expected = {
        "execution_mode": "mutating",
        "read_only": False,
        "mutation_required": True,
        "operator_execution_required": True,
        "commit_required": False,
        "pr_required": False,
        "merge_required": False,
        "deployment_required": False,
        "ci_required": False,
        "regression_required": False,
        "production_regression_required": False,
    }
    verified = normalize_verified(None)
    outcome, reason = artifact_outcome(expected, verified)
    states = artifact_requirement_states(expected, verified)
    missing = next(
        (
            name
            for name, state in states.items()
            if state in {ARTIFACT_STATE_MISSING, ARTIFACT_STATE_INCONSISTENT}
        ),
        None,
    )
    return {
        "status": "PASS" if outcome == "succeeded" else "needs_attention",
        "reason_code": reason,
        "missing_artifact": missing,
        "artifact_states": states,
        "contract": normalize_expected(expected),
    }
