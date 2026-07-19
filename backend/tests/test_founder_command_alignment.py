"""Founder Command deployment alignment tests."""

from __future__ import annotations

import httpx

from app.config import Settings
from app.services.founder_command.deployment_alignment import (
    resolve_deployment_alignment,
)

API_SHA = "1a5d577c9c21279bb68c19bc1cfa5d7bcac04dfe"
REPO_SHA = "844176fb158555c8dd0c1d60dcaba29eb9e66915"


def _settings() -> Settings:
    return Settings(
        agent_dispatch_repo_allowlist="https://github.com/CzechowskiT/twin",
        agent_dispatch_base_branch_allowlist="cursor/phase1-monorepo-scaffold",
        agent_dispatch_github_token="test-token",
    )


def _transport(*, relation: str, files: list[str]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        if "/branches/" in request.url.path:
            return httpx.Response(200, json={"commit": {"sha": REPO_SHA}})
        return httpx.Response(
            200,
            json={
                "status": relation,
                "files": [{"filename": filename} for filename in files],
            },
        )

    return httpx.MockTransport(handler)


def test_frontend_only_drift_is_component_aligned():
    result = resolve_deployment_alignment(
        _settings(),
        API_SHA,
        transport=_transport(relation="ahead", files=["frontend/src/app/page.tsx"]),
    )

    assert result.repo_head == REPO_SHA
    assert result.status == "component_aligned"
    assert result.reason == "backend_unchanged_since_api_deploy"


def test_backend_drift_is_not_aligned():
    result = resolve_deployment_alignment(
        _settings(),
        API_SHA,
        transport=_transport(relation="ahead", files=["backend/app/main.py"]),
    )

    assert result.status == "drift"
    assert result.reason == "backend_changes_not_deployed"


def test_missing_github_configuration_fails_closed():
    result = resolve_deployment_alignment(Settings(), API_SHA)

    assert result.repo_head is None
    assert result.status == "unknown"
    assert result.reason == "github_alignment_not_configured"
