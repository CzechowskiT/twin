"""Unit + integration tests for TWIN Agent Dispatcher (Cursor mocked)."""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base
from app.database.session import get_db
from app.main import app
from app.services.agent_dispatch.constants import CURSOR_CONTRACT_DOC_DATE, CURSOR_CONTRACT_VERSION
from app.services.agent_dispatch.prompt_envelope import build_prompt_envelope, redact_secrets
from app.services.agent_dispatch.webhooks import verify_cursor_webhook_signature


@pytest.fixture
def dispatch_client(monkeypatch):
    monkeypatch.setenv("AGENT_DISPATCH_TOKEN", "test-dispatch-token")
    monkeypatch.setenv("AGENT_DISPATCH_REPO_ALLOWLIST", "https://github.com/CzechowskiT/twin")
    monkeypatch.setenv("AGENT_DISPATCH_BASE_BRANCH_ALLOWLIST", "cursor/phase1-monorepo-scaffold")
    monkeypatch.setenv("AGENT_DISPATCH_ENCRYPT_PROMPTS", "true")
    monkeypatch.setenv("AGENT_DISPATCH_WEBHOOK_SECRET", "x" * 32)
    monkeypatch.setenv("CURSOR_CLOUD_AGENTS_API_KEY", "")
    monkeypatch.setenv("SECRET_KEY", "unit-test-secret-key-at-least-32-chars!!")
    get_settings.cache_clear()

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def _auth():
    return {"Authorization": "Bearer test-dispatch-token"}


def test_health_unauthenticated(dispatch_client):
    client, _ = dispatch_client
    res = client.get("/api/internal/agent-dispatch/health")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["cursor_contract_doc_date"] == CURSOR_CONTRACT_DOC_DATE
    assert body["cursor_contract_version"] == CURSOR_CONTRACT_VERSION
    assert body["cursor_credential_secret_name"] == "CURSOR_CLOUD_AGENTS_API_KEY"
    assert "test-dispatch-token" not in res.text


def test_auth_required(dispatch_client):
    client, _ = dispatch_client
    res = client.get("/api/internal/agent-dispatch/contract")
    assert res.status_code == 401


def test_contract_ok(dispatch_client):
    client, _ = dispatch_client
    res = client.get("/api/internal/agent-dispatch/contract", headers=_auth())
    assert res.status_code == 200
    assert res.json()["mcp_ready"] is True


def test_prompt_envelope_hash_and_redaction():
    env = build_prompt_envelope("Do the thing\napi_key=sk-secretvalue1234567890")
    assert env.prompt_hash
    assert "sk-secret" not in env.redacted_preview
    assert "[REDACTED]" in redact_secrets("token: abcdef")


def test_create_run_queued_without_cursor_key(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "Implement agent dispatcher tests only",
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": False,
            "idempotency_key": "idem-1",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "queued"
    assert body["prompt_hash"]
    assert "Implement" in body["prompt_preview"]

    # Idempotent replay
    res2 = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "Implement agent dispatcher tests only",
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": False,
            "idempotency_key": "idem-1",
        },
    )
    assert res2.status_code == 201
    assert res2.json()["id"] == body["id"]


def test_lock_conflict_409(dispatch_client):
    client, _ = dispatch_client
    payload = {
        "prompt": "first",
        "repository_url": "https://github.com/CzechowskiT/twin",
        "base_branch": "cursor/phase1-monorepo-scaffold",
        "dispatch_now": False,
    }
    assert client.post("/api/internal/agent-dispatch/runs", headers=_auth(), json=payload).status_code == 201
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={**payload, "prompt": "second", "idempotency_key": "other"},
    )
    assert res.status_code == 409
    assert res.json()["detail"]["error"] == "active_run_lock"


def test_repo_allowlist(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "x",
            "repository_url": "https://github.com/evil/repo",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": False,
        },
    )
    assert res.status_code == 403


def test_webhook_signature_and_dedupe(dispatch_client):
    client, db = dispatch_client
    # Seed a run linked to agent id
    create = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "webhook test",
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": False,
        },
    )
    run_id = create.json()["id"]
    from app.database.models import AgentDispatchRun

    run = db.get(AgentDispatchRun, run_id)
    run.cursor_agent_id = "bc_abc123"
    run.cursor_api_version = "v0"
    run.status = "running"
    db.commit()

    payload = {
        "event": "statusChange",
        "timestamp": "2024-01-15T10:30:00Z",
        "id": "bc_abc123",
        "status": "FINISHED",
        "source": {"repository": "https://github.com/CzechowskiT/twin", "ref": "cursor/phase1-monorepo-scaffold"},
        "target": {
            "url": "https://cursor.com/agents?id=bc_abc123",
            "branchName": "feat/twin-agent-dispatcher",
            "prUrl": "https://github.com/CzechowskiT/twin/pull/999",
        },
        "summary": "Done",
    }
    raw = json.dumps(payload).encode()
    secret = "x" * 32
    sig = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    assert verify_cursor_webhook_signature(secret=secret, raw_body=raw, signature=sig)

    headers = {
        "X-Webhook-Signature": sig,
        "X-Webhook-ID": "delivery-1",
        "X-Webhook-Event": "statusChange",
        "Content-Type": "application/json",
    }
    res = client.post("/api/internal/agent-dispatch/webhooks/cursor", content=raw, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "processed"

    res2 = client.post("/api/internal/agent-dispatch/webhooks/cursor", content=raw, headers=headers)
    assert res2.json()["status"] == "duplicate"

    status_res = client.get(f"/api/internal/agent-dispatch/runs/{run_id}", headers=_auth())
    assert status_res.json()["status"] in ("succeeded", "needs_attention")
    assert status_res.json()["result_branch"] == "feat/twin-agent-dispatcher"


def test_canary_blocked_without_credential(dispatch_client):
    client, _ = dispatch_client
    res = client.get("/api/internal/agent-dispatch/canary", headers=_auth())
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "BLOCKED"
    assert body["reason"] == (
        "add Cursor Cloud Agents service-account API credential to production "
        "secret store under documented name"
    )


def test_dispatch_with_mocked_cursor(dispatch_client, monkeypatch):
    client, _ = dispatch_client
    monkeypatch.setenv("CURSOR_CLOUD_AGENTS_API_KEY", "test-cursor-key")
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/v1/agents":
            return httpx.Response(
                200,
                json={
                    "agent": {
                        "id": "bc-00000000-0000-0000-0000-000000000001",
                        "url": "https://cursor.com/agents/bc-1",
                        "latestRunId": "run-1",
                    },
                    "run": {
                        "id": "run-1",
                        "agentId": "bc-00000000-0000-0000-0000-000000000001",
                        "status": "CREATING",
                    },
                },
            )
        if request.method == "GET" and "/runs/run-1" in request.url.path:
            return httpx.Response(
                200,
                json={
                    "id": "run-1",
                    "agentId": "bc-00000000-0000-0000-0000-000000000001",
                    "status": "FINISHED",
                    "result": "All good",
                    "git": {
                        "branches": [
                            {
                                "repoUrl": "github.com/CzechowskiT/twin",
                                "branch": "feat/twin-agent-dispatcher",
                                "prUrl": "https://github.com/CzechowskiT/twin/pull/100",
                            }
                        ]
                    },
                },
            )
        if request.method == "POST" and str(request.url.path).endswith("/cancel"):
            return httpx.Response(200, json={"id": "run-1"})
        return httpx.Response(404, json={"error": "not found"})

    from app.services.agent_dispatch import service as svc
    from app.services.agent_dispatch.cursor_client import CursorCloudAgentsClient

    class Wrapped(CursorCloudAgentsClient):
        def __init__(self, settings, *, transport=None):
            super().__init__(settings, transport=httpx.MockTransport(handler))

    monkeypatch.setattr(svc, "CursorCloudAgentsClient", Wrapped)

    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "Ship dispatcher",
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": True,
            "idempotency_key": "mock-dispatch-1",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "running"
    assert body["cursor_agent_id"] == "bc-00000000-0000-0000-0000-000000000001"

    recon = client.post(
        f"/api/internal/agent-dispatch/runs/{body['id']}/reconcile",
        headers=_auth(),
    )
    assert recon.status_code == 200
    assert recon.json()["status"] in ("succeeded", "needs_attention")
    assert recon.json()["result_summary"] == "All good"


def test_cancel_run(dispatch_client):
    client, _ = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "cancel me",
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": False,
        },
    ).json()
    res = client.post(
        f"/api/internal/agent-dispatch/runs/{created['id']}/cancel",
        headers=_auth(),
    )
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"

    # Lock released — new create ok
    res2 = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "after cancel",
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": False,
        },
    )
    assert res2.status_code == 201


def test_force_unlock_admin(dispatch_client):
    client, _ = dispatch_client
    client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json={
            "prompt": "lock",
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
            "dispatch_now": False,
        },
    )
    res = client.post(
        "/api/internal/agent-dispatch/admin/force-unlock",
        headers=_auth(),
        json={
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
        },
    )
    assert res.status_code == 200
    assert res.json()["unlocked"] is True


def test_invalid_webhook_signature(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/webhooks/cursor",
        content=b'{"event":"statusChange"}',
        headers={"X-Webhook-Signature": "sha256=deadbeef", "Content-Type": "application/json"},
    )
    assert res.status_code == 401
