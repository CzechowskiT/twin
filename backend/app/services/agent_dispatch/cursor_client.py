"""HTTP client for Cursor Cloud Agents API (official contract 2026-07-16).

Auth: Basic (API key as username) or Bearer — both accepted per docs.
Base URL: https://api.cursor.com
v1: create agent + runs (primary)
v0: launch with webhook + stop (webhook path until v1 webhooks GA)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import Settings
from app.services.agent_dispatch.constants import CURSOR_API_BASE_URL, CURSOR_API_CREDENTIAL_SECRET_NAME

logger = logging.getLogger(__name__)


class CursorApiError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


@dataclass(frozen=True)
class CursorCreateResult:
    api_version: str  # "v1" | "v0"
    agent_id: str
    run_id: str | None
    status: str
    agent_url: str | None
    raw: dict[str, Any]


@dataclass(frozen=True)
class CursorRunSnapshot:
    api_version: str
    agent_id: str
    run_id: str | None
    status: str
    result_text: str | None
    branch_name: str | None
    pr_url: str | None
    duration_ms: int | None
    raw: dict[str, Any]


class CursorCloudAgentsClient:
    """Thin typed wrapper — no secrets logged."""

    def __init__(self, settings: Settings, *, transport: httpx.BaseTransport | None = None):
        self._settings = settings
        self._transport = transport
        self._base = (settings.cursor_api_base_url or CURSOR_API_BASE_URL).rstrip("/")

    def _api_key(self) -> str:
        key = (self._settings.cursor_cloud_agents_api_key or "").strip()
        if not key:
            raise CursorApiError(
                f"{CURSOR_API_CREDENTIAL_SECRET_NAME} not configured",
                status_code=503,
            )
        return key

    def _client(self) -> httpx.Client:
        key = self._api_key()
        # Docs: Basic with API key as username (empty password) OR Bearer.
        return httpx.Client(
            base_url=self._base,
            auth=(key, ""),
            timeout=httpx.Timeout(60.0, connect=15.0),
            transport=self._transport,
            headers={"Accept": "application/json"},
        )

    def api_key_info(self) -> dict[str, Any]:
        """GET /v1/me or /v0/me — read-only canary."""
        with self._client() as client:
            for path in ("/v1/me", "/v0/me"):
                res = client.get(path)
                if res.status_code == 404:
                    continue
                if res.status_code >= 400:
                    raise CursorApiError(
                        "Cursor API key info failed",
                        status_code=res.status_code,
                        body=_safe_body(res.text),
                    )
                return res.json()
        raise CursorApiError("Cursor /me endpoint not found", status_code=404)

    def create_agent(
        self,
        *,
        prompt_text: str,
        repository_url: str,
        starting_ref: str,
        auto_create_pr: bool,
        branch_name: str | None,
        model_id: str | None,
        webhook_url: str | None,
        webhook_secret: str | None,
        name: str | None = None,
    ) -> CursorCreateResult:
        """Create via v0 when webhook configured (v1 webhooks 'coming soon'); else v1."""
        if webhook_url:
            return self._create_v0(
                prompt_text=prompt_text,
                repository_url=repository_url,
                starting_ref=starting_ref,
                auto_create_pr=auto_create_pr,
                branch_name=branch_name,
                model_id=model_id,
                webhook_url=webhook_url,
                webhook_secret=webhook_secret,
                name=name,
            )
        return self._create_v1(
            prompt_text=prompt_text,
            repository_url=repository_url,
            starting_ref=starting_ref,
            auto_create_pr=auto_create_pr,
            model_id=model_id,
            name=name,
        )

    def _create_v1(
        self,
        *,
        prompt_text: str,
        repository_url: str,
        starting_ref: str,
        auto_create_pr: bool,
        model_id: str | None,
        name: str | None,
    ) -> CursorCreateResult:
        body: dict[str, Any] = {
            "prompt": {"text": prompt_text},
            "repos": [{"url": repository_url, "startingRef": starting_ref}],
            "autoCreatePR": auto_create_pr,
            "workOnCurrentBranch": False,
        }
        if model_id:
            body["model"] = {"id": model_id}
        if name:
            body["name"] = name[:100]
        with self._client() as client:
            res = client.post("/v1/agents", json=body)
            if res.status_code >= 400:
                raise CursorApiError(
                    f"Cursor v1 create agent failed ({res.status_code})",
                    status_code=res.status_code,
                    body=_safe_body(res.text),
                )
            data = res.json()
        agent = data.get("agent") or {}
        run = data.get("run") or {}
        return CursorCreateResult(
            api_version="v1",
            agent_id=str(agent.get("id") or ""),
            run_id=str(run.get("id")) if run.get("id") else None,
            status=str(run.get("status") or agent.get("status") or "CREATING"),
            agent_url=agent.get("url"),
            raw=data,
        )

    def _create_v0(
        self,
        *,
        prompt_text: str,
        repository_url: str,
        starting_ref: str,
        auto_create_pr: bool,
        branch_name: str | None,
        model_id: str | None,
        webhook_url: str,
        webhook_secret: str | None,
        name: str | None,
    ) -> CursorCreateResult:
        # v0 rejects unrecognized top-level keys (e.g. `name` → 400).
        # Display name is derived by Cursor from the prompt; pass `name` only on v1.
        body: dict[str, Any] = {
            "prompt": {"text": prompt_text},
            "source": {"repository": repository_url, "ref": starting_ref},
            "target": {"autoCreatePr": auto_create_pr},
            "webhook": {"url": webhook_url},
        }
        _ = name  # accepted by create_agent for v1; intentionally omitted on v0
        if branch_name:
            body["target"]["branchName"] = branch_name
        if model_id:
            body["model"] = model_id
        if webhook_secret and len(webhook_secret) >= 32:
            body["webhook"]["secret"] = webhook_secret
        with self._client() as client:
            res = client.post("/v0/agents", json=body)
            if res.status_code >= 400:
                raise CursorApiError(
                    f"Cursor v0 launch agent failed ({res.status_code})",
                    status_code=res.status_code,
                    body=_safe_body(res.text),
                )
            data = res.json()
        agent_id = str(data.get("id") or "")
        return CursorCreateResult(
            api_version="v0",
            agent_id=agent_id,
            run_id=None,
            status=str(data.get("status") or "CREATING"),
            agent_url=(data.get("target") or {}).get("url"),
            raw=data,
        )

    def get_run_snapshot(self, *, api_version: str, agent_id: str, run_id: str | None) -> CursorRunSnapshot:
        if api_version == "v0" or not run_id:
            return self._get_v0(agent_id)
        return self._get_v1_run(agent_id, run_id)

    def _get_v1_run(self, agent_id: str, run_id: str) -> CursorRunSnapshot:
        with self._client() as client:
            res = client.get(f"/v1/agents/{agent_id}/runs/{run_id}")
            if res.status_code >= 400:
                raise CursorApiError(
                    "Cursor v1 get run failed",
                    status_code=res.status_code,
                    body=_safe_body(res.text),
                )
            data = res.json()
        branch, pr_url = _extract_git(data.get("git"))
        return CursorRunSnapshot(
            api_version="v1",
            agent_id=agent_id,
            run_id=run_id,
            status=str(data.get("status") or ""),
            result_text=data.get("result"),
            branch_name=branch,
            pr_url=pr_url,
            duration_ms=data.get("durationMs"),
            raw=data,
        )

    def _get_v0(self, agent_id: str) -> CursorRunSnapshot:
        with self._client() as client:
            res = client.get(f"/v0/agents/{agent_id}")
            if res.status_code >= 400:
                raise CursorApiError(
                    "Cursor v0 get agent failed",
                    status_code=res.status_code,
                    body=_safe_body(res.text),
                )
            data = res.json()
        target = data.get("target") or {}
        return CursorRunSnapshot(
            api_version="v0",
            agent_id=agent_id,
            run_id=None,
            status=str(data.get("status") or ""),
            result_text=data.get("summary"),
            branch_name=target.get("branchName"),
            pr_url=target.get("prUrl"),
            duration_ms=None,
            raw=data,
        )

    def cancel(self, *, api_version: str, agent_id: str, run_id: str | None) -> None:
        with self._client() as client:
            if api_version == "v1" and run_id:
                res = client.post(f"/v1/agents/{agent_id}/runs/{run_id}/cancel")
                # 409 run_not_cancellable is acceptable for already-terminal runs.
                if res.status_code >= 400 and res.status_code != 409:
                    raise CursorApiError(
                        "Cursor v1 cancel failed",
                        status_code=res.status_code,
                        body=_safe_body(res.text),
                    )
                return
            res = client.post(f"/v0/agents/{agent_id}/stop")
            if res.status_code >= 400 and res.status_code != 409:
                raise CursorApiError(
                    "Cursor v0 stop failed",
                    status_code=res.status_code,
                    body=_safe_body(res.text),
                )


def _extract_git(git: Any) -> tuple[str | None, str | None]:
    if not isinstance(git, dict):
        return None, None
    branches = git.get("branches") or []
    if not branches:
        return None, None
    first = branches[0] if isinstance(branches[0], dict) else {}
    return first.get("branch"), first.get("prUrl")


def _safe_body(text: str, limit: int = 400) -> str:
    """Truncate error bodies; strip obvious secret-looking substrings."""
    cleaned = text or ""
    for needle in ("Bearer ", "crsr_", "sk-", "ghp_"):
        if needle.lower() in cleaned.lower():
            cleaned = "[redacted error body]"
            break
    return cleaned[:limit]
