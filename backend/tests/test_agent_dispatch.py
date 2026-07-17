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
    monkeypatch.delenv("AGENT_DISPATCH_WEBHOOK_PUBLIC_URL", raising=False)
    monkeypatch.setenv("AGENT_DISPATCH_WEBHOOK_PUBLIC_URL", "")
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


def _create_payload(**overrides):
    base = {
        "task_name": "unit-test-batch",
        "prompt": "Implement agent dispatcher tests only",
        "repository": "https://github.com/CzechowskiT/twin",
        "base_branch": "cursor/phase1-monorepo-scaffold",
        "execution_policy": {
            "single_active_run": True,
            "manual_merge_only": True,
            "no_admin_override": True,
            "no_auto_merge": True,
            "final_report_once": True,
        },
        "auto_create_pr": False,
        "dispatch_now": False,
    }
    base.update(overrides)
    return base


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
    body = res.json()
    assert body["mcp_ready"] is True
    assert "agent_runs:create" in body["scopes"] or "agent_runs:admin" in body["scopes"]


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
        json=_create_payload(idempotency_key="idem-1"),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "queued"
    assert body["task_name"] == "unit-test-batch"
    assert body["auto_create_pr"] is False
    assert body["execution_policy"]["no_admin_override"] is True
    assert body["prompt_hash"]
    assert "Implement" in body["prompt_preview"]

    res2 = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(idempotency_key="idem-1"),
    )
    assert res2.status_code == 201
    assert res2.json()["id"] == body["id"]


def test_rejects_weak_execution_policy(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            execution_policy={
                "single_active_run": True,
                "manual_merge_only": True,
                "no_admin_override": False,
                "no_auto_merge": True,
                "final_report_once": True,
            }
        ),
    )
    assert res.status_code == 422


def test_lock_conflict_409(dispatch_client):
    client, _ = dispatch_client
    payload = _create_payload()
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
        json=_create_payload(repository="https://github.com/evil/repo"),
    )
    assert res.status_code == 403


def test_webhook_signature_and_dedupe(dispatch_client):
    client, db = dispatch_client
    create = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="webhook test"),
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
    assert "CURSOR_CLOUD_AGENTS_API_KEY" in body["reason"]
    assert "CzechowskiT/twin" in body["reason"]
    assert body.get("founder_action_required") is True


def test_dispatch_with_mocked_cursor(dispatch_client, monkeypatch):
    client, _ = dispatch_client
    monkeypatch.setenv("CURSOR_CLOUD_AGENTS_API_KEY", "test-cursor-key")
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/v1/agents":
            body = json.loads(request.content.decode())
            assert body.get("autoCreatePR") is False
            assert body.get("workOnCurrentBranch") is False
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
        json=_create_payload(
            prompt="Ship dispatcher",
            dispatch_now=True,
            idempotency_key="mock-dispatch-1",
        ),
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
        json=_create_payload(prompt="cancel me"),
    ).json()
    res = client.post(
        f"/api/internal/agent-dispatch/runs/{created['id']}/cancel",
        headers=_auth(),
    )
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"

    res2 = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="after cancel"),
    )
    assert res2.status_code == 201


def test_force_unlock_forbidden(dispatch_client):
    client, _ = dispatch_client
    client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="lock"),
    )
    res = client.post(
        "/api/internal/agent-dispatch/admin/force-unlock",
        headers=_auth(),
        json={
            "repository_url": "https://github.com/CzechowskiT/twin",
            "base_branch": "cursor/phase1-monorepo-scaffold",
        },
    )
    assert res.status_code == 403
    assert res.json()["detail"]["error"] == "no_admin_override"


def test_invalid_webhook_signature(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/webhooks/cursor",
        content=b'{"event":"statusChange"}',
        headers={"X-Webhook-Signature": "sha256=deadbeef", "Content-Type": "application/json"},
    )
    assert res.status_code == 401


def test_mcp_requires_auth(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/mcp",
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert res.status_code == 401
    www = res.headers.get("www-authenticate", "")
    assert "resource_metadata=" in www
    assert "oauth-protected-resource" in www


def test_mcp_tools_list_and_dispatch_handoff(dispatch_client):
    client, _ = dispatch_client
    listed = client.post(
        "/api/internal/agent-dispatch/mcp",
        headers=_auth(),
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert listed.status_code == 200
    tools = {t["name"] for t in listed.json()["result"]["tools"]}
    assert {
        "dispatch_twin_agent",
        "get_twin_agent_status",
        "get_twin_agent_report",
        "get_twin_agent_handoff",
        "cancel_twin_agent",
        "list_twin_agent_runs",
        "reconcile_twin_agent_run",
    } <= tools

    created = client.post(
        "/api/internal/agent-dispatch/mcp",
        headers=_auth(),
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "dispatch_twin_agent",
                "arguments": {
                    "task_name": "mcp-unit",
                    "prompt": "Align docs/guard wording for agent dispatcher MCP only.",
                    "dispatch_now": False,
                    "idempotency_key": "mcp-unit-1",
                },
            },
        },
    )
    assert created.status_code == 200
    text = created.json()["result"]["content"][0]["text"]
    run = json.loads(text)
    assert run["status"] == "queued"
    run_id = run["id"]

    handoff = client.post(
        "/api/internal/agent-dispatch/mcp",
        headers=_auth(),
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "get_twin_agent_handoff", "arguments": {"run_id": run_id}},
        },
    )
    assert handoff.status_code == 200
    package = json.loads(handoff.json()["result"]["content"][0]["text"])
    assert package["handoff_version"].startswith("twin-agent-dispatch-handoff/")
    assert package["run_id"] == run_id

    http_handoff = client.get(
        f"/api/internal/agent-dispatch/runs/{run_id}/handoff",
        headers=_auth(),
    )
    assert http_handoff.status_code == 200
    assert http_handoff.json()["run_id"] == run_id


def test_mcp_rejects_weak_policy(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/mcp",
        headers=_auth(),
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "dispatch_twin_agent",
                "arguments": {
                    "task_name": "bad-policy",
                    "prompt": "nope",
                    "dispatch_now": False,
                    "execution_policy": {
                        "single_active_run": True,
                        "manual_merge_only": True,
                        "no_admin_override": False,
                        "no_auto_merge": True,
                        "final_report_once": True,
                    },
                },
            },
        },
    )
    assert res.status_code == 200
    assert res.json()["result"]["isError"] is True


def test_health_exposes_mcp_without_secrets(dispatch_client):
    client, _ = dispatch_client
    res = client.get("/api/internal/agent-dispatch/health")
    assert res.status_code == 200
    body = res.json()
    assert body["mcp_hosted"] is True
    assert body["mcp_healthy"] is True
    assert "dispatch_twin_agent" in body["mcp_tools"]
    assert "test-dispatch-token" not in res.text
    assert body["encryption_via"] == "SECRET_KEY+token_crypto"


def test_cursor_v0_create_omits_name_key(monkeypatch):
    """Cursor v0 /agents rejects unrecognized top-level `name` (HTTP 400)."""
    monkeypatch.setenv("CURSOR_CLOUD_AGENTS_API_KEY", "test-cursor-key")
    get_settings.cache_clear()

    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/v0/agents":
            captured["body"] = json.loads(request.content.decode())
            return httpx.Response(
                201,
                json={
                    "id": "bc-v0-test",
                    "status": "CREATING",
                    "target": {"url": "https://cursor.com/agents/bc-v0-test"},
                },
            )
        return httpx.Response(404, json={"error": "not found"})

    from app.services.agent_dispatch.cursor_client import CursorCloudAgentsClient

    client = CursorCloudAgentsClient(get_settings(), transport=httpx.MockTransport(handler))
    created = client.create_agent(
        prompt_text="omit name on v0",
        repository_url="https://github.com/CzechowskiT/twin",
        starting_ref="cursor/phase1-monorepo-scaffold",
        auto_create_pr=False,
        branch_name=None,
        model_id=None,
        webhook_url="https://example.com/hooks/cursor",
        webhook_secret="y" * 32,
        name="twin-dispatch-should-not-appear",
    )
    assert created.api_version == "v0"
    assert created.agent_id == "bc-v0-test"
    assert "name" not in captured["body"]
    assert captured["body"]["source"]["repository"] == "https://github.com/CzechowskiT/twin"
    assert captured["body"]["webhook"]["url"] == "https://example.com/hooks/cursor"
    get_settings.cache_clear()


def test_cursor_v1_create_uses_agent_latest_run_id(monkeypatch):
    monkeypatch.setenv("CURSOR_CLOUD_AGENTS_API_KEY", "test-cursor-key")
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/v1/agents"
        return httpx.Response(
            200,
            json={
                "agent": {
                    "id": "bc-v1-test",
                    "status": "ACTIVE",
                    "latestRunId": "run-latest",
                }
            },
        )

    from app.services.agent_dispatch.cursor_client import CursorCloudAgentsClient

    client = CursorCloudAgentsClient(get_settings(), transport=httpx.MockTransport(handler))
    created = client.create_agent(
        prompt_text="recover v1 run id",
        repository_url="https://github.com/CzechowskiT/twin",
        starting_ref="cursor/phase1-monorepo-scaffold",
        auto_create_pr=False,
        branch_name=None,
        model_id=None,
        webhook_url=None,
        webhook_secret=None,
        name="v1-name-is-valid",
    )
    assert created.api_version == "v1"
    assert created.run_id == "run-latest"
    assert created.status == "CREATING"
    get_settings.cache_clear()


def test_cursor_v1_missing_run_id_never_uses_v0(monkeypatch):
    monkeypatch.setenv("CURSOR_CLOUD_AGENTS_API_KEY", "test-cursor-key")
    get_settings.cache_clear()
    paths: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append((request.method, request.url.path))
        if request.method == "GET" and request.url.path == "/v1/agents/bc-v1-test":
            return httpx.Response(200, json={"id": "bc-v1-test", "latestRunId": "run-latest"})
        if request.method == "GET" and request.url.path.endswith("/runs/run-latest"):
            return httpx.Response(200, json={"id": "run-latest", "status": "RUNNING"})
        if request.method == "POST" and request.url.path.endswith("/runs/run-latest/cancel"):
            return httpx.Response(200, json={"id": "run-latest"})
        return httpx.Response(404, json={"error": "not found"})

    from app.services.agent_dispatch.cursor_client import CursorCloudAgentsClient

    client = CursorCloudAgentsClient(get_settings(), transport=httpx.MockTransport(handler))
    snapshot = client.get_run_snapshot(api_version="v1", agent_id="bc-v1-test", run_id=None)
    client.cancel(api_version="v1", agent_id="bc-v1-test", run_id=None)

    assert snapshot.run_id == "run-latest"
    assert snapshot.status == "RUNNING"
    assert all(not path.startswith("/v0/") for _, path in paths)
    assert paths.count(("GET", "/v1/agents/bc-v1-test")) == 2
    get_settings.cache_clear()


def _pkce_pair() -> tuple[str, str]:
    import base64
    import hashlib
    import secrets

    verifier = secrets.token_urlsafe(48)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge


def test_chatgpt_oauth_metadata_and_token_exchange(dispatch_client):
    client, _ = dispatch_client
    prm = client.get("/.well-known/oauth-protected-resource/api/internal/agent-dispatch/mcp")
    assert prm.status_code == 200
    assert prm.json()["resource"].endswith("/api/internal/agent-dispatch/mcp")
    assert prm.json()["authorization_servers"]

    as_meta = client.get(
        "/.well-known/oauth-authorization-server/api/internal/agent-dispatch/oauth"
    )
    assert as_meta.status_code == 200
    body = as_meta.json()
    assert body["code_challenge_methods_supported"] == ["S256"]
    assert "authorization_code" in body["grant_types_supported"]
    assert body.get("client_id_metadata_document_supported") is True

    openapi = client.get("/api/internal/agent-dispatch/chatgpt/openapi.json")
    assert openapi.status_code == 200
    assert openapi.json()["paths"]["/api/internal/agent-dispatch/runs"]["post"][
        "operationId"
    ] == "dispatch_twin_agent"

    verifier, challenge = _pkce_pair()
    redirect = "https://chatgpt.com/connector/oauth/test-callback"
    client_id = "chatgpt-test-client"
    auth_get = client.get(
        "/api/internal/agent-dispatch/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "resource": "http://testserver/api/internal/agent-dispatch/mcp",
        },
    )
    assert auth_get.status_code == 200
    assert "AGENT_DISPATCH_TOKEN" in auth_get.text

    auth_post = client.post(
        "/api/internal/agent-dispatch/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": "st1",
            "resource": "http://testserver/api/internal/agent-dispatch/mcp",
        },
        data={"token": "test-dispatch-token"},
        follow_redirects=False,
    )
    assert auth_post.status_code == 302
    loc = auth_post.headers["location"]
    assert loc.startswith(redirect)
    assert "code=" in loc
    from urllib.parse import parse_qs, urlparse

    code = parse_qs(urlparse(loc).query)["code"][0]

    token_res = client.post(
        "/api/internal/agent-dispatch/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect,
            "client_id": client_id,
            "code_verifier": verifier,
            "resource": "http://testserver/api/internal/agent-dispatch/mcp",
        },
    )
    assert token_res.status_code == 200
    access = token_res.json()["access_token"]
    assert token_res.json()["token_type"] == "Bearer"

    listed = client.post(
        "/api/internal/agent-dispatch/mcp",
        headers={"Authorization": f"Bearer {access}"},
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert listed.status_code == 200
    names = {t["name"] for t in listed.json()["result"]["tools"]}
    assert "dispatch_twin_agent" in names


def test_oauth_rejects_wrong_token(dispatch_client):
    client, _ = dispatch_client
    _, challenge = _pkce_pair()
    res = client.post(
        "/api/internal/agent-dispatch/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "c1",
            "redirect_uri": "https://chatgpt.com/connector/oauth/x",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
        data={"token": "wrong-token"},
        follow_redirects=False,
    )
    assert res.status_code == 401
