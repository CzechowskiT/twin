"""Deployment identity / provenance helpers.

Prefer immutable platform build metadata over mutable GIT_COMMIT_SHA labels.
"""

from __future__ import annotations

import os
from typing import Any


def collect_deployment_identity(*, service_role: str = "api") -> dict[str, Any]:
    """Collect deployment identity without treating env labels as sole proof.

    Returns fields used by gates:
      - source_revision: platform-provided build SHA when available
      - runtime_label: mutable GIT_COMMIT_SHA (may be stale / operator-set)
      - deployment_id: platform deployment id when available
      - provenance: platform | runtime_label_only | unknown | mismatched
      - git_commit: preferred identity for consumers (platform first)
    """
    railway = (os.getenv("RAILWAY_GIT_COMMIT_SHA") or "").strip()[:64] or None
    vercel = (os.getenv("VERCEL_GIT_COMMIT_SHA") or "").strip()[:64] or None
    runtime_label = (os.getenv("GIT_COMMIT_SHA") or os.getenv("GIT_COMMIT") or "").strip()[:64] or None
    deployment_id = (
        (os.getenv("RAILWAY_DEPLOYMENT_ID") or "").strip()
        or (os.getenv("RAILWAY_DEPLOYMENT_DRAFT_ID") or "").strip()
        or (os.getenv("VERCEL_DEPLOYMENT_ID") or "").strip()
        or None
    )
    source_revision = railway or vercel
    if source_revision and runtime_label and source_revision != runtime_label:
        provenance = "mismatched"
        git_commit = source_revision
    elif source_revision:
        provenance = "platform"
        git_commit = source_revision
    elif runtime_label:
        provenance = "runtime_label_only"
        git_commit = runtime_label
    else:
        provenance = "unknown"
        git_commit = "unknown"

    return {
        "service_role": service_role,
        "git_commit": git_commit,
        "source_revision": source_revision,
        "runtime_label": runtime_label,
        "deployment_id": deployment_id[:64] if deployment_id else None,
        "provenance": provenance,
        "platform_railway_sha": railway,
        "platform_vercel_sha": vercel,
    }


def deployment_identity_gate(
    identity: dict[str, Any],
    *,
    expected_sha: str | None = None,
    require_platform: bool = True,
) -> dict[str, Any]:
    """Gate result for deployment provenance.

    A stale/mismatched runtime label must not PASS when platform revision differs.
    """
    failures: list[str] = []
    provenance = identity.get("provenance")
    if require_platform and provenance in ("runtime_label_only", "unknown"):
        failures.append(f"deployment_provenance_unverified:{provenance}")
    if provenance == "mismatched":
        failures.append(
            "runtime_label_mismatch:"
            f"label={identity.get('runtime_label')}:source={identity.get('source_revision')}"
        )
    if expected_sha:
        got = identity.get("source_revision") or identity.get("git_commit")
        if not got or not str(got).startswith(str(expected_sha)[:8]):
            failures.append(f"sha_mismatch:expected={expected_sha[:12]}:got={got}")
    return {
        "passed": len(failures) == 0,
        "failures": failures,
        "status": "PASS" if not failures else "DEPLOYMENT_PROVENANCE_UNVERIFIED",
        "identity": identity,
    }
