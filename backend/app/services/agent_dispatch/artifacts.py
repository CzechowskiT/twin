"""Infer and evaluate workflow artifacts without trusting agent-reported status."""

from __future__ import annotations

import re
from typing import Any

EXPECTED_KEYS = (
    "pr_required",
    "merge_required",
    "deployment_required",
    "ci_required",
    "regression_required",
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


def infer_expected_artifacts(prompt: str, *, auto_create_pr: bool = False) -> dict[str, bool]:
    """Infer required workflow gates from the user's command."""
    task_prompt = (prompt or "").rsplit("# Task prompt", 1)[-1]
    text = " ".join(task_prompt.split())
    read_only = is_explicit_read_only(text)
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
    if read_only:
        pr = merge = deployment = ci = regression = commit = False
    pr = pr or merge
    commit = commit or pr or deployment or ci or regression
    return {
        "pr_required": pr,
        "merge_required": merge,
        "deployment_required": deployment,
        "ci_required": ci,
        "regression_required": regression,
        "commit_required": commit,
        "read_only": read_only,
    }


def normalize_expected(value: dict[str, Any] | None) -> dict[str, bool]:
    raw = value or {}
    return {
        **{key: bool(raw.get(key, False)) for key in EXPECTED_KEYS},
        "commit_required": bool(raw.get("commit_required", False)),
        "read_only": bool(raw.get("read_only", False)),
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
