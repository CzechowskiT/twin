"""Regression tests for component-aware production deployment waits."""

from __future__ import annotations

import subprocess
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "production-deployment-targets.sh"


def _targets(*paths: str) -> dict[str, str]:
    result = subprocess.run(
        ["bash", str(SCRIPT)],
        input="\n".join(paths),
        check=True,
        capture_output=True,
        text=True,
    )
    return dict(line.split("=", 1) for line in result.stdout.splitlines())


def test_frontend_only_change_waits_only_for_vercel() -> None:
    assert _targets("frontend/src/app/page.tsx") == {
        "API_DEPLOY_REQUIRED": "false",
        "FRONTEND_DEPLOY_REQUIRED": "true",
    }


def test_backend_only_change_waits_only_for_railway() -> None:
    assert _targets("backend/app/main.py") == {
        "API_DEPLOY_REQUIRED": "true",
        "FRONTEND_DEPLOY_REQUIRED": "false",
    }


def test_non_runtime_change_waits_for_neither_platform() -> None:
    assert _targets("docs/OPS.md", ".github/workflows/smoke.yml") == {
        "API_DEPLOY_REQUIRED": "false",
        "FRONTEND_DEPLOY_REQUIRED": "false",
    }


def test_unknown_runtime_change_fails_safe_to_both_platforms() -> None:
    assert _targets("shared-contract.json") == {
        "API_DEPLOY_REQUIRED": "true",
        "FRONTEND_DEPLOY_REQUIRED": "true",
    }
