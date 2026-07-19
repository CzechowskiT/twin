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
from app.services.agent_dispatch.artifacts import (
    ARTIFACT_STATE_MISSING,
    ARTIFACT_STATE_NOT_REQUIRED,
    ARTIFACT_STATE_PRESENT,
    artifact_gate_canary_probe,
    artifact_outcome,
    artifact_requirement_states,
    backfill_execution_contract,
    infer_expected_artifacts,
    missing_reason,
    resolve_execution_contract,
    sha_matches,
)
from app.services.agent_dispatch.cursor_client import CursorApiError, CursorRunSnapshot
from app.services.agent_dispatch.github_enricher import GitHubEnricher, GitHubEnrichment
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


def test_explicit_mutating_contract_is_persisted(dispatch_client):
    client, db = dispatch_client
    payload = _create_payload(
        prompt="Execute the requested production workflow.",
        idempotency_key="explicit-mutating-contract",
        execution_mode="mutating",
        read_only=False,
        mutation_required=True,
        merge_required=True,
        deployment_required=True,
        production_regression_required=True,
        operator_execution_required=True,
    )
    res = client.post("/api/internal/agent-dispatch/runs", headers=_auth(), json=payload)

    assert res.status_code == 201
    body = res.json()
    assert body["execution_mode"] == "mutating"
    assert body["read_only"] is False
    assert body["mutation_required"] is True
    assert body["operator_execution_required"] is True
    assert body["expected_artifacts"]["regression_required"] is True

    from app.database.models import AgentDispatchRun

    db.expire_all()
    stored = db.get(AgentDispatchRun, body["id"])
    assert stored.execution_mode == "mutating"
    assert stored.read_only is False
    assert stored.execution_contract_hash


def test_invalid_read_only_mutation_contract_is_rejected(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            execution_mode="read_only",
            read_only=True,
            commit_required=True,
        ),
    )
    assert res.status_code == 422
    assert "invalid_execution_contract" in res.text


def test_generic_prompt_accepts_explicit_read_only_contract(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Audit authentication behavior.",
            execution_mode="read_only",
            read_only=True,
        ),
    )
    assert res.status_code == 201
    assert res.json()["execution_mode"] == "read_only"
    assert res.json()["read_only"] is True


def test_execution_mode_and_read_only_must_agree(dispatch_client):
    client, _ = dispatch_client
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Audit only.",
            execution_mode="read_only",
            read_only=False,
        ),
    )
    assert res.status_code == 422
    assert "invalid_execution_contract" in res.text


def test_idempotency_does_not_reuse_read_only_run_for_mutation(dispatch_client):
    client, _ = dispatch_client
    key = "execution-contract-idempotency"
    first = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Read-only audit. Do not create a branch, commit, or PR.",
            execution_mode="read_only",
            read_only=True,
            idempotency_key=key,
        ),
    )
    assert first.status_code == 201
    second = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Fix and commit the classifier.",
            execution_mode="mutating",
            read_only=False,
            mutation_required=True,
            idempotency_key=key,
        ),
    )
    assert second.status_code == 409
    assert second.json()["detail"]["error"] == "idempotency_execution_contract_mismatch"


def test_idempotency_rejects_different_prompt_with_same_contract(dispatch_client):
    client, _ = dispatch_client
    key = "idempotency-request-fingerprint"
    first = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Fix classifier A.", idempotency_key=key),
    )
    assert first.status_code == 201
    second = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Fix classifier B.", idempotency_key=key),
    )
    assert second.status_code == 409
    assert second.json()["detail"]["error"] == "idempotency_request_mismatch"


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
    definitions = listed.json()["result"]["tools"]
    tools = {t["name"] for t in definitions}
    assert {
        "dispatch_twin_agent",
        "get_twin_agent_status",
        "get_twin_agent_report",
        "get_twin_agent_handoff",
        "cancel_twin_agent",
        "list_twin_agent_runs",
        "reconcile_twin_agent_run",
    } <= tools
    dispatch_schema = next(t for t in definitions if t["name"] == "dispatch_twin_agent")[
        "inputSchema"
    ]
    assert {
        "execution_mode",
        "read_only",
        "mutation_required",
        "commit_required",
        "pr_required",
        "merge_required",
        "deployment_required",
        "production_regression_required",
        "operator_execution_required",
    } <= set(dispatch_schema["properties"])

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
                    "execution_mode": "mutating",
                    "read_only": False,
                    "mutation_required": True,
                    "operator_execution_required": True,
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
    assert run["execution_mode"] == "mutating"
    assert run["read_only"] is False
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
    assert body["artifact_gate_canary"]["status"] == "PASS"
    assert body["artifact_gate_canary"]["reason_code"] is None
    assert body["artifact_gate_canary"]["missing_artifact"] is None
    assert body["artifact_gate_canary"]["artifact_states"]["deployment"] == "not_required"
    assert body["artifact_gate_canary"]["contract"]["deployment_required"] is False
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
    openapi_body = openapi.json()
    assert openapi_body["paths"]["/api/internal/agent-dispatch/runs"]["post"][
        "operationId"
    ] == "dispatch_twin_agent"
    properties = openapi_body["components"]["schemas"]["DispatchCreate"]["properties"]
    assert properties["execution_mode"]["enum"] == ["read_only", "mutating"]
    assert "operator_execution_required" in properties

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


def _expected(prompt: str) -> dict[str, bool]:
    return infer_expected_artifacts(prompt)


def _verified(**overrides: bool) -> dict[str, bool]:
    base = {
        "pr_exists": False,
        "merge_verified": False,
        "deployment_verified": False,
        "ci_passed": False,
        "regression_passed": False,
        "commit_exists": False,
        "head_sha_verified": False,
    }
    base.update(overrides)
    return base


@pytest.mark.parametrize(
    ("expected_key", "reason"),
    [
        ("pr_required", "expected_pr_missing"),
        ("merge_required", "expected_merge_missing"),
        ("deployment_required", "expected_deployment_missing"),
        ("commit_required", "expected_commit_missing"),
        ("ci_required", "expected_ci_missing"),
        ("regression_required", "expected_regression_missing"),
    ],
)
def test_missing_artifact_reason_codes(expected_key, reason):
    expected = _expected("")
    expected[expected_key] = True
    assert missing_reason(expected, _verified()) == reason


@pytest.mark.parametrize(
    ("prompt", "expected"),
    [
        ("Open a PR but do not merge it", {"pr_required": True, "merge_required": False}),
        ("Remove read-only mode and commit the fix", {"read_only": False, "commit_required": True}),
        ("Fix the bug and push changes", {"commit_required": True}),
        (
            "never merge PRs\n# Task prompt\nCreate, merge, and deploy the PR",
            {"pr_required": True, "merge_required": True, "deployment_required": True},
        ),
    ],
)
def test_expected_artifact_inference_handles_negation(prompt, expected):
    inferred = infer_expected_artifacts(prompt)
    assert {key: inferred[key] for key in expected} == expected


def test_expected_artifact_inference_covers_full_delivery_chain():
    inferred = infer_expected_artifacts(
        "Create a PR, run CI, manually merge it, deploy production, and run regression."
    )
    assert inferred["pr_required"] is True
    assert inferred["merge_required"] is True
    assert inferred["deployment_required"] is True
    assert inferred["ci_required"] is True
    assert inferred["regression_required"] is True
    assert inferred["production_regression_required"] is True
    assert inferred["commit_required"] is True
    assert inferred["read_only"] is False
    assert inferred["execution_mode"] == "mutating"
    assert inferred["mutation_required"] is True
    assert inferred["operator_execution_required"] is True


def test_read_only_inference_forbids_all_git_and_delivery_artifacts():
    inferred = infer_expected_artifacts(
        "Read-only review. Do not create a branch, commit, or PR."
    )
    assert all(
        not value
        for key, value in inferred.items()
        if key not in {"read_only", "execution_mode"}
    )
    assert inferred["read_only"] is True
    assert inferred["execution_mode"] == "read_only"


@pytest.mark.parametrize(
    "prompt",
    [
        (
            "Verify the PR, perform a manual merge and deployment, then run a "
            "production read-only regression test."
        ),
        (
            "Zweryfikuj PR, wykonaj manual merge i deployment, a następnie "
            "produkcyjny test regresyjny read-only."
        ),
    ],
)
def test_read_only_regression_scope_preserves_full_delivery_artifacts(prompt):
    inferred = infer_expected_artifacts(prompt)
    assert inferred["pr_required"] is True
    assert inferred["merge_required"] is True
    assert inferred["deployment_required"] is True
    assert inferred["ci_required"] is True
    assert inferred["regression_required"] is True
    assert inferred["commit_required"] is True
    assert inferred["read_only"] is False
    assert inferred["execution_mode"] == "mutating"


@pytest.mark.parametrize(
    "prompt",
    [
        "Use a read-only workflow for repository inspection only.",
        "Inspect the repository only, without changes.",
    ],
)
def test_read_only_workflow_remains_read_only(prompt):
    inferred = infer_expected_artifacts(prompt)
    assert all(
        not value
        for key, value in inferred.items()
        if key not in {"read_only", "execution_mode"}
    )
    assert inferred["read_only"] is True
    assert inferred["execution_mode"] == "read_only"


@pytest.mark.parametrize(
    ("verified_key", "reason"),
    [
        ("pr_exists", "expected_pr_missing"),
        ("merge_verified", "expected_merge_missing"),
        ("deployment_verified", "expected_deployment_missing"),
        ("commit_exists", "expected_commit_missing"),
        ("head_sha_verified", "expected_commit_missing"),
        ("ci_passed", "expected_ci_missing"),
        ("regression_passed", "expected_regression_missing"),
    ],
)
def test_full_delivery_never_succeeds_with_unverified_artifact(verified_key, reason):
    expected = _expected(
        "Create a PR, run CI, manually merge it, deploy production, and run regression."
    )
    verified = _verified(
        pr_exists=True,
        merge_verified=True,
        deployment_verified=True,
        commit_exists=True,
        head_sha_verified=True,
        ci_passed=True,
        regression_passed=True,
    )
    verified[verified_key] = False
    assert artifact_outcome(expected, verified) == ("needs_attention", reason)


def test_full_delivery_succeeds_only_when_every_artifact_is_verified():
    expected = _expected(
        "Create a PR, run CI, manually merge it, deploy production, and run regression."
    )
    verified = _verified(
        pr_exists=True,
        merge_verified=True,
        deployment_verified=True,
        commit_exists=True,
        head_sha_verified=True,
        ci_passed=True,
        regression_passed=True,
    )
    assert artifact_outcome(expected, verified) == ("succeeded", None)


def test_read_only_run_passes_without_deployment_evidence():
    expected = resolve_execution_contract(
        "Read-only audit. Do not create a branch, commit, or PR.",
        explicit={"execution_mode": "read_only", "read_only": True},
    )
    assert expected["deployment_required"] is False
    assert artifact_outcome(expected, _verified()) == ("succeeded", None)
    assert artifact_requirement_states(expected, _verified())["deployment"] == (
        ARTIFACT_STATE_NOT_REQUIRED
    )


def test_mutating_diagnostic_without_commit_or_deploy_passes():
    prompt = (
        "ONLY workflow_dispatch operator-service.yml operation=diagnose — "
        "no code/commit/PR/merge/deploy/coding agent/config/lock release."
    )
    expected = resolve_execution_contract(
        prompt,
        explicit={
            "execution_mode": "mutating",
            "read_only": False,
            "mutation_required": True,
            "operator_execution_required": True,
            "commit_required": False,
            "pr_required": False,
            "merge_required": False,
            "deployment_required": False,
            "production_regression_required": False,
        },
    )
    assert expected["execution_mode"] == "mutating"
    assert expected["read_only"] is False
    assert expected["mutation_required"] is True
    assert expected["operator_execution_required"] is True
    assert expected["commit_required"] is False
    assert expected["deployment_required"] is False
    assert artifact_outcome(expected, _verified()) == ("succeeded", None)
    states = artifact_requirement_states(expected, _verified())
    assert states["deployment"] == ARTIFACT_STATE_NOT_REQUIRED
    assert states["commit"] == ARTIFACT_STATE_NOT_REQUIRED


def test_explicit_false_overrides_prompt_deploy_inference():
    expected = resolve_execution_contract(
        "Please deploy production after the diagnose workflow_dispatch.",
        explicit={
            "execution_mode": "mutating",
            "read_only": False,
            "mutation_required": True,
            "operator_execution_required": True,
            "commit_required": False,
            "deployment_required": False,
            "pr_required": False,
            "merge_required": False,
        },
    )
    assert expected["deployment_required"] is False
    assert expected["commit_required"] is False


def test_deployment_required_without_evidence_is_blocked():
    expected = resolve_execution_contract(
        "Deploy production",
        explicit={"deployment_required": True, "mutation_required": True, "execution_mode": "mutating"},
    )
    assert expected["deployment_required"] is True
    assert artifact_outcome(expected, _verified(commit_exists=True, head_sha_verified=True)) == (
        "needs_attention",
        "expected_deployment_missing",
    )
    assert (
        artifact_requirement_states(
            expected, _verified(commit_exists=True, head_sha_verified=True)
        )["deployment"]
        == ARTIFACT_STATE_MISSING
    )


def test_deployment_required_with_matching_sha_passes():
    expected = {
        "deployment_required": True,
        "commit_required": True,
        "mutation_required": True,
        "execution_mode": "mutating",
    }
    verified = _verified(
        deployment_verified=True,
        commit_exists=True,
        head_sha_verified=True,
    )
    assert artifact_outcome(expected, verified) == ("succeeded", None)
    assert artifact_requirement_states(expected, verified)["deployment"] == ARTIFACT_STATE_PRESENT


def test_sha_matches_normalizes_short_and_full():
    full = "8cc466b382e827e84cff3e158c379cef46052cd7"
    assert sha_matches(full, full[:12]) is True
    assert sha_matches(full[:10], full) is True
    assert sha_matches(full, "deadbeef" + full[8:]) is False
    assert sha_matches(full[:6], full) is False


def test_unlinked_deployment_evidence_is_inconsistent():
    expected = {"deployment_required": True, "commit_required": True, "mutation_required": True}
    verified = _verified(deployment_verified=True, commit_exists=True, head_sha_verified=True)
    states = artifact_requirement_states(expected, verified, linked={"deployment": False})
    assert states["deployment"] == "inconsistent"


def test_backfill_incomplete_contract_is_auditable():
    contract, meta = backfill_execution_contract(
        {"mutation_required": True, "execution_mode": "mutating"},
        source="unit_test",
        reason="normalize_incomplete_expected_artifacts",
    )
    assert contract["deployment_required"] is False
    assert meta["source"] == "unit_test"
    assert meta["version"]
    with pytest.raises(ValueError, match="invalid_execution_contract"):
        backfill_execution_contract(
            {"read_only": True, "deployment_required": True},
            source="unit_test",
            reason="contradiction",
        )


def test_artifact_gate_canary_probe_passes_without_deployment():
    probe = artifact_gate_canary_probe()
    assert probe["status"] == "PASS"
    assert probe["reason_code"] is None
    assert probe["contract"]["deployment_required"] is False
    assert probe["artifact_states"]["deployment"] == ARTIFACT_STATE_NOT_REQUIRED


def test_commit_false_with_deployment_true_is_invalid():
    with pytest.raises(ValueError, match="invalid_execution_contract"):
        resolve_execution_contract(
            "deploy",
            explicit={
                "execution_mode": "mutating",
                "deployment_required": True,
                "commit_required": False,
            },
        )


def test_mutating_diagnostic_dispatch_persists_contract(dispatch_client):
    client, db = dispatch_client
    prompt = (
        "ONLY workflow_dispatch operator-service.yml operation=diagnose — "
        "no code/commit/PR/merge/deploy."
    )
    res = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt=prompt,
            idempotency_key="mutating-diagnostic-no-deploy",
            execution_mode="mutating",
            read_only=False,
            mutation_required=True,
            operator_execution_required=True,
            commit_required=False,
            pr_required=False,
            merge_required=False,
            deployment_required=False,
            production_regression_required=False,
        ),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["execution_mode"] == "mutating"
    assert body["read_only"] is False
    from app.database.models import AgentDispatchRun

    run = db.get(AgentDispatchRun, body["id"])
    expected = json.loads(run.expected_artifacts_json)
    assert expected["deployment_required"] is False
    assert expected["commit_required"] is False
    assert expected["mutation_required"] is True
    assert artifact_outcome(expected, json.loads(run.verified_artifacts_json)) == (
        "succeeded",
        None,
    )


def test_mutating_requirement_wins_over_incidental_read_only_scope():
    inferred = infer_expected_artifacts(
        "Fix and commit the classifier. Perform a read-only investigation first."
    )
    assert inferred["execution_mode"] == "mutating"
    assert inferred["read_only"] is False
    assert inferred["mutation_required"] is True
    assert inferred["operator_execution_required"] is True
    assert inferred["commit_required"] is True


def test_read_only_smoke_null_artifacts_remains_read_only():
    inferred = infer_expected_artifacts(
        "Run a read-only smoke; branch/commit/PR null and no mutations."
    )
    assert inferred["execution_mode"] == "read_only"
    assert inferred["read_only"] is True
    assert inferred["mutation_required"] is False


def test_mutating_request_recovers_misclassified_run_and_orphaned_lock(dispatch_client):
    client, db = dispatch_client
    legacy = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Read-only audit. Do not create a branch, commit, or PR.",
            execution_mode="read_only",
            read_only=True,
            idempotency_key="legacy-read-only-lock",
        ),
    )
    assert legacy.status_code == 201

    from sqlalchemy import select

    from app.database.models import (
        AgentDispatchAuditEvent,
        AgentDispatchLock,
        AgentDispatchRun,
    )
    from app.services.agent_dispatch.prompt_envelope import build_prompt_envelope
    from app.services.token_crypto import encrypt_secret

    old_run = db.get(AgentDispatchRun, legacy.json()["id"])
    legacy_expected = json.loads(old_run.expected_artifacts_json)
    misclassified = build_prompt_envelope(
        "Fix files and commit them. Perform read-only investigation first.",
        expected_artifacts=legacy_expected,
    )
    old_run.prompt_ciphertext = encrypt_secret(misclassified.rendered_text)
    old_run.prompt_hash = misclassified.prompt_hash
    db.commit()

    replacement = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Fix files and commit them.",
            execution_mode="mutating",
            read_only=False,
            mutation_required=True,
            commit_required=True,
            operator_execution_required=True,
            idempotency_key="replacement-mutating-run",
        ),
    )
    assert replacement.status_code == 201

    db.expire_all()
    old_run = db.get(AgentDispatchRun, legacy.json()["id"])
    assert old_run.status == "failed"
    assert old_run.error_code == "invalid_execution_contract"
    lock = db.execute(select(AgentDispatchLock)).scalar_one()
    assert lock.run_id == replacement.json()["id"]
    events = db.execute(
        select(AgentDispatchAuditEvent.event_type).where(
            AgentDispatchAuditEvent.run_id == old_run.id
        )
    ).scalars()
    assert {
        "invalid_execution_contract_terminalized",
        "orphaned_lock_released",
    }.issubset(set(events))


def test_misclassified_lock_with_active_cursor_is_not_released(dispatch_client):
    client, db = dispatch_client
    legacy = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Read-only audit.",
            execution_mode="read_only",
            read_only=True,
            idempotency_key="active-cursor-read-only-lock",
        ),
    )
    assert legacy.status_code == 201

    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch.prompt_envelope import build_prompt_envelope
    from app.services.token_crypto import encrypt_secret

    old_run = db.get(AgentDispatchRun, legacy.json()["id"])
    expected = json.loads(old_run.expected_artifacts_json)
    misclassified = build_prompt_envelope(
        "Fix and commit files. Perform a read-only investigation first.",
        expected_artifacts=expected,
    )
    old_run.prompt_ciphertext = encrypt_secret(misclassified.rendered_text)
    old_run.prompt_hash = misclassified.prompt_hash
    old_run.cursor_agent_id = "bc-active"
    old_run.status = "running"
    db.commit()

    replacement = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Fix and commit files.",
            execution_mode="mutating",
            read_only=False,
            mutation_required=True,
            idempotency_key="blocked-replacement-run",
        ),
    )
    assert replacement.status_code == 409
    assert replacement.json()["detail"]["error"] == "active_run_lock"
    db.expire_all()
    assert db.get(AgentDispatchRun, old_run.id).status == "running"


def _enrichment(
    verified: dict[str, bool],
    *,
    reason: str | None,
    pr_url: str | None = "https://github.com/CzechowskiT/twin/pull/42",
    verification_error: bool = False,
) -> GitHubEnrichment:
    return GitHubEnrichment(
        owner="CzechowskiT",
        repo="twin",
        branch_name="feat/artifacts",
        pr_number=42 if pr_url else None,
        pr_url=pr_url,
        head_sha="a" * 40 if verified["commit_exists"] else None,
        merge_sha="b" * 40 if verified["merge_verified"] else None,
        deployment_sha="b" * 40 if verified["deployment_verified"] else None,
        deployment_ids=(7, 8) if verified["deployment_verified"] else (),
        ci_status="success" if verified["ci_passed"] else "pending",
        regression_status="success" if verified["regression_passed"] else "missing",
        verified_artifacts=verified,
        ok=reason is None and not verification_error,
        attention_reason=reason,
        verification_error=verification_error,
        raw={},
    )


def _github_handler(
    *,
    merged: bool = False,
    ci: str = "success",
    deployment: bool = False,
    partial_deployment: bool = False,
    regression: bool = False,
    pr_exists: bool = True,
    base_branch: str = "cursor/phase1-monorepo-scaffold",
):
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/pulls/42"):
            if not pr_exists:
                return httpx.Response(404, json={"message": "Not Found"})
            return httpx.Response(
                200,
                json={
                    "number": 42,
                    "head": {"sha": "head-sha", "ref": "feat/artifacts"},
                    "base": {"ref": base_branch},
                    "merged_at": "2026-07-18T12:00:00Z" if merged else None,
                    "merge_commit_sha": "merge-sha" if merged else None,
                    "merged_by": (
                        {"login": "human-reviewer", "type": "User"} if merged else None
                    ),
                    "auto_merge": None,
                },
            )
        if path.endswith("/commits/head-sha"):
            return httpx.Response(200, json={"sha": "head-sha"})
        if path.endswith("/status"):
            return httpx.Response(200, json={"state": ci})
        if path.endswith("/check-runs"):
            runs = [{"name": "unit", "status": "completed", "conclusion": ci}]
            if regression:
                runs.append(
                    {
                        "name": "production-regression",
                        "status": "completed",
                        "conclusion": "success",
                    }
                )
            return httpx.Response(200, json={"check_runs": runs})
        if path.endswith("/deployments"):
            deployments = []
            if deployment or partial_deployment:
                deployments.append({"id": 7, "environment": "Production"})
            if deployment:
                deployments.append(
                    {"id": 8, "environment": "responsible-success / production"}
                )
            return httpx.Response(200, json=deployments)
        if path.endswith("/deployments/7/statuses") or path.endswith(
            "/deployments/8/statuses"
        ):
            return httpx.Response(200, json=[{"state": "success"}])
        return httpx.Response(404, json={"path": path})

    return handler


def _github_enricher(dispatch_client, monkeypatch, **handler_options) -> GitHubEnricher:
    monkeypatch.setenv("AGENT_DISPATCH_GITHUB_TOKEN", "test-github-token")
    get_settings.cache_clear()
    return GitHubEnricher(
        get_settings(),
        transport=httpx.MockTransport(_github_handler(**handler_options)),
    )


def test_read_only_report_and_handoff_hide_git_artifacts(dispatch_client):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Read-only audit. Do not create a branch, commit, or PR.",
            idempotency_key="read-only-artifacts",
        ),
    ).json()
    from app.database.models import AgentDispatchRun

    run = db.get(AgentDispatchRun, created["id"])
    run.result_branch = "cursor/technical-worker-branch"
    run.result_pr_url = "https://github.com/CzechowskiT/twin/pull/42"
    run.result_head_sha = "a" * 40
    run.github_enrichment_json = json.dumps({"pr_number": 42})
    db.commit()

    report = client.get(
        f"/api/internal/agent-dispatch/runs/{run.id}/report", headers=_auth()
    ).json()["report"]
    handoff = client.get(
        f"/api/internal/agent-dispatch/runs/{run.id}/handoff", headers=_auth()
    ).json()
    assert report["branch"] is report["head_sha"] is report["pr"] is None
    assert handoff["result"]["branch"] is None
    assert handoff["result"]["head_sha"] is None
    assert handoff["result"]["pr"] is None
    assert handoff["result"]["merge_sha"] is None
    assert handoff["result"]["deployment_sha"] is None
    assert handoff["result"]["deployment_ids"] == []
    assert handoff["result"]["regression_status"] is None
    assert handoff["public_run"]["github_enrichment"] is None
    assert handoff["public_run"]["result_merge_sha"] is None
    assert handoff["public_run"]["result_deployment_sha"] is None
    assert report["expected_artifacts"]["read_only"] is True


def test_read_only_run_can_succeed_without_git_artifacts(dispatch_client):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt="Read-only audit. Do not create a branch, commit, or PR.",
            idempotency_key="read-only-success",
        ),
    ).json()
    from app.services.agent_dispatch.service import finalize_with_github

    run = finalize_with_github(db, get_settings(), created["id"])
    assert run.status == "succeeded"
    assert run.result_branch is None
    assert run.result_head_sha is None
    assert run.result_pr_url is None


def test_legacy_run_without_expected_contract_never_succeeds(dispatch_client):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Read-only audit", idempotency_key="legacy-contract"),
    ).json()
    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch.service import finalize_with_github

    run = db.get(AgentDispatchRun, created["id"])
    run.expected_artifacts_json = None
    db.commit()
    result = finalize_with_github(db, get_settings(), run.id)
    assert result.status == "needs_attention"
    assert result.error_code == "reconcile_failed"


def test_partial_expected_contract_never_succeeds(dispatch_client):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Read-only audit", idempotency_key="partial-contract"),
    ).json()
    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch.service import finalize_with_github

    run = db.get(AgentDispatchRun, created["id"])
    run.expected_artifacts_json = json.dumps(
        {"pr_required": False, "ci_required": False}
    )
    db.commit()
    result = finalize_with_github(db, get_settings(), run.id)
    assert result.status == "needs_attention"
    assert result.error_code == "reconcile_failed"


def test_pr_artifact_is_verified(dispatch_client, monkeypatch):
    enrichment = _github_enricher(dispatch_client, monkeypatch).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR"),
        expected_base_branch="cursor/phase1-monorepo-scaffold",
    )
    assert enrichment.ok is True
    assert enrichment.verified_artifacts["pr_exists"] is True
    assert enrichment.verified_artifacts["commit_exists"] is True


def test_pr_on_wrong_base_is_not_verified(dispatch_client, monkeypatch):
    enrichment = _github_enricher(
        dispatch_client,
        monkeypatch,
        base_branch="unrelated-base",
    ).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR"),
        expected_base_branch="cursor/phase1-monorepo-scaffold",
    )
    assert enrichment.verified_artifacts["pr_exists"] is False
    assert enrichment.attention_reason == "expected_pr_missing"


def test_merge_artifact_is_verified(dispatch_client, monkeypatch):
    enrichment = _github_enricher(dispatch_client, monkeypatch, merged=True).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create and merge the PR"),
    )
    assert enrichment.ok is True
    assert enrichment.verified_artifacts["merge_verified"] is True


def test_bot_merge_is_not_verified(dispatch_client, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/pulls/42"):
            return httpx.Response(
                200,
                json={
                    "head": {"sha": "head-sha", "ref": "feat/artifacts"},
                    "base": {"ref": "cursor/phase1-monorepo-scaffold"},
                    "merged_at": "2026-07-18T12:00:00Z",
                    "merge_commit_sha": "merge-sha",
                    "merged_by": {"login": "merge-bot[bot]", "type": "Bot"},
                },
            )
        if path.endswith("/commits/head-sha"):
            return httpx.Response(200, json={"sha": "head-sha"})
        if path.endswith("/status"):
            return httpx.Response(200, json={"state": "success", "total_count": 0})
        if path.endswith("/check-runs"):
            return httpx.Response(200, json={"check_runs": []})
        return httpx.Response(404)

    monkeypatch.setenv("AGENT_DISPATCH_GITHUB_TOKEN", "test-github-token")
    get_settings.cache_clear()
    enrichment = GitHubEnricher(
        get_settings(), transport=httpx.MockTransport(handler)
    ).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create and merge the PR"),
        expected_base_branch="cursor/phase1-monorepo-scaffold",
    )
    assert enrichment.verified_artifacts["merge_verified"] is False
    assert enrichment.attention_reason == "expected_merge_missing"


def test_deployment_artifact_is_verified(dispatch_client, monkeypatch):
    enrichment = _github_enricher(
        dispatch_client, monkeypatch, merged=True, deployment=True
    ).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Merge the PR and deploy to production"),
    )
    assert enrichment.ok is True
    assert enrichment.verified_artifacts["deployment_verified"] is True


def test_deployment_requires_all_configured_production_environments(
    dispatch_client, monkeypatch
):
    enrichment = _github_enricher(
        dispatch_client,
        monkeypatch,
        merged=True,
        partial_deployment=True,
    ).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Merge and deploy to production"),
    )
    assert enrichment.verified_artifacts["deployment_verified"] is False
    assert enrichment.attention_reason == "expected_deployment_missing"


def test_railway_and_vercel_production_environments_are_verified(
    dispatch_client, monkeypatch
):
    monkeypatch.setenv(
        "AGENT_DISPATCH_PRODUCTION_ENVIRONMENTS",
        "railway / production,vercel / production",
    )
    monkeypatch.setenv("AGENT_DISPATCH_GITHUB_TOKEN", "test-github-token")
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/pulls/42"):
            return httpx.Response(
                200,
                json={
                    "number": 42,
                    "html_url": "https://github.com/CzechowskiT/twin/pull/42",
                    "state": "closed",
                    "merged": True,
                    "merge_commit_sha": "b" * 40,
                    "base": {"ref": "cursor/phase1-monorepo-scaffold"},
                    "head": {"sha": "a" * 40, "ref": "feat/artifacts"},
                },
            )
        if path.endswith("/commits/" + "b" * 40):
            return httpx.Response(200, json={"sha": "b" * 40})
        if path.endswith("/deployments"):
            return httpx.Response(
                200,
                json=[
                    {"id": 11, "environment": "railway / production"},
                    {"id": 12, "environment": "vercel / production"},
                ],
            )
        if "/deployments/" in path and path.endswith("/statuses"):
            return httpx.Response(200, json=[{"state": "success"}])
        if path.endswith("/status"):
            return httpx.Response(200, json={"state": "success", "statuses": []})
        if path.endswith("/check-runs"):
            return httpx.Response(200, json={"check_runs": []})
        return httpx.Response(404, json={"message": "not found"})

    enrichment = GitHubEnricher(
        get_settings(), transport=httpx.MockTransport(handler)
    ).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Merge and deploy to production"),
        expected_base_branch="cursor/phase1-monorepo-scaffold",
    )
    assert enrichment.verified_artifacts["deployment_verified"] is True
    assert enrichment.deployment_sha in {"a" * 40, "b" * 40}
    assert set(enrichment.deployment_ids) == {11, 12}


def test_deployment_sha_mismatch_blocks_via_sha_matches():
    full = "8cc466b382e827e84cff3e158c379cef46052cd7"
    other = "deadbeef382e827e84cff3e158c379cef46052cd7"
    assert sha_matches(full, other) is False
    assert artifact_outcome(
        {"deployment_required": True, "commit_required": True, "mutation_required": True},
        _verified(deployment_verified=False, commit_exists=True, head_sha_verified=True),
    ) == ("needs_attention", "expected_deployment_missing")


def test_missing_pr_never_succeeds(dispatch_client, monkeypatch):
    enrichment = _github_enricher(dispatch_client, monkeypatch, pr_exists=False).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR"),
    )
    assert enrichment.ok is False
    assert enrichment.attention_reason == "expected_pr_missing"


def test_missing_pr_after_reconcile_returns_needs_attention(dispatch_client, monkeypatch):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Create a PR", idempotency_key="missing-pr-final"),
    ).json()
    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch import service as svc

    run = db.get(AgentDispatchRun, created["id"])
    run.cursor_agent_id = "bc-missing-pr"
    run.cursor_run_id = "run-missing-pr"
    run.cursor_api_version = "v1"
    run.status = "running"
    db.commit()

    class FinishedCursor:
        def __init__(self, settings):
            pass

        def get_run_snapshot(self, **kwargs):
            return CursorRunSnapshot(
                "v1",
                "bc-missing-pr",
                "run-missing-pr",
                "FINISHED",
                "agent claimed success",
                "feat/artifacts",
                None,
                None,
                {},
            )

    class MissingGitHub:
        def __init__(self, settings):
            pass

        def enrich(self, **kwargs):
            return _enrichment(
                _verified(),
                reason="expected_pr_missing",
                pr_url=None,
            )

    monkeypatch.setattr(svc, "CursorCloudAgentsClient", FinishedCursor)
    monkeypatch.setattr(svc, "GitHubEnricher", MissingGitHub)
    response = client.post(
        f"/api/internal/agent-dispatch/runs/{run.id}/reconcile", headers=_auth()
    ).json()
    assert response["status"] == "needs_attention"
    assert response["error_code"] == "expected_pr_missing"
    assert response["verified_artifacts"]["pr_exists"] is False


def test_missing_ci_never_succeeds(dispatch_client, monkeypatch):
    enrichment = _github_enricher(dispatch_client, monkeypatch, ci="pending").enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR and wait for CI"),
    )
    assert enrichment.ok is False
    assert enrichment.attention_reason == "expected_ci_missing"


def test_skipped_ci_never_succeeds(dispatch_client, monkeypatch):
    enrichment = _github_enricher(dispatch_client, monkeypatch, ci="skipped").enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR and run CI"),
    )
    assert enrichment.verified_artifacts["ci_passed"] is False
    assert enrichment.attention_reason == "expected_ci_missing"


def test_ci_verification_reads_all_check_run_pages(dispatch_client, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/pulls/42"):
            return httpx.Response(
                200,
                json={
                    "head": {"sha": "head-sha", "ref": "feat/artifacts"},
                    "base": {"ref": "cursor/phase1-monorepo-scaffold"},
                    "merged_at": None,
                },
            )
        if path.endswith("/commits/head-sha"):
            return httpx.Response(200, json={"sha": "head-sha"})
        if path.endswith("/status"):
            return httpx.Response(
                200, json={"state": "success", "total_count": 1}
            )
        if path.endswith("/check-runs"):
            page = int(request.url.params.get("page", "1"))
            runs = (
                [
                    {
                        "name": f"check-{index}",
                        "status": "completed",
                        "conclusion": "success",
                    }
                    for index in range(100)
                ]
                if page == 1
                else [
                    {
                        "name": "late-failure",
                        "status": "completed",
                        "conclusion": "failure",
                    }
                ]
            )
            return httpx.Response(200, json={"check_runs": runs})
        return httpx.Response(404)

    monkeypatch.setenv("AGENT_DISPATCH_GITHUB_TOKEN", "test-github-token")
    get_settings.cache_clear()
    enrichment = GitHubEnricher(
        get_settings(), transport=httpx.MockTransport(handler)
    ).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR and run CI"),
        expected_base_branch="cursor/phase1-monorepo-scaffold",
    )
    assert enrichment.verified_artifacts["ci_passed"] is False
    assert enrichment.attention_reason == "expected_ci_missing"
    assert enrichment.raw["ci_check_run_pages"] == 2


def test_github_api_error_is_reconcile_failed(dispatch_client, monkeypatch):
    monkeypatch.setenv("AGENT_DISPATCH_GITHUB_TOKEN", "test-github-token")
    get_settings.cache_clear()
    enricher = GitHubEnricher(
        get_settings(),
        transport=httpx.MockTransport(
            lambda request: httpx.Response(503, json={"message": "unavailable"})
        ),
    )
    enrichment = enricher.enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR"),
    )
    assert enrichment.verification_error is True
    assert enrichment.attention_reason == "reconcile_failed"


def test_missing_deployment_never_succeeds(dispatch_client, monkeypatch):
    enrichment = _github_enricher(dispatch_client, monkeypatch, merged=True).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Merge and deploy to production"),
    )
    assert enrichment.ok is False
    assert enrichment.attention_reason == "expected_deployment_missing"


def test_regression_artifact_is_verified(dispatch_client, monkeypatch):
    enrichment = _github_enricher(
        dispatch_client, monkeypatch, ci="success", regression=True
    ).enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR, run CI and a regression test"),
    )
    assert enrichment.ok is True
    assert enrichment.verified_artifacts["regression_passed"] is True


def test_missing_production_regression_never_succeeds(dispatch_client, monkeypatch):
    enrichment = _github_enricher(dispatch_client, monkeypatch, ci="success").enrich(
        repository_url="https://github.com/CzechowskiT/twin",
        branch_name="feat/artifacts",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_artifacts=_expected("Create a PR, run CI and a regression test"),
    )
    assert enrichment.verified_artifacts["regression_passed"] is False
    assert enrichment.attention_reason == "expected_regression_missing"


def test_full_success_report_contains_verified_delivery_evidence(
    dispatch_client, monkeypatch
):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(
            prompt=(
                "Create a PR, run CI, manually merge it, deploy production, "
                "and run regression."
            ),
            idempotency_key="full-artifact-success",
        ),
    ).json()
    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch import service as svc

    run = db.get(AgentDispatchRun, created["id"])
    run.result_branch = "feat/artifacts"
    run.result_pr_url = "https://github.com/CzechowskiT/twin/pull/42"
    db.commit()
    complete = _verified(
        pr_exists=True,
        merge_verified=True,
        deployment_verified=True,
        ci_passed=True,
        regression_passed=True,
        commit_exists=True,
        head_sha_verified=True,
    )

    class CompleteGitHub:
        def __init__(self, settings):
            pass

        def enrich(self, **kwargs):
            return _enrichment(complete, reason=None)

    monkeypatch.setattr(svc, "GitHubEnricher", CompleteGitHub)
    result = svc.finalize_with_github(db, get_settings(), run.id)
    report = svc.run_report_dict(db, run.id)["report"]
    handoff = svc.get_run_handoff(db, run.id)
    assert result.status == report["final_status"] == "succeeded"
    assert report["merge_sha"] == "b" * 40
    assert report["deployment_sha"] == "b" * 40
    assert report["deployment_ids"] == [7, 8]
    assert report["regression_status"] == "success"
    assert all(report["verified_artifacts"].values())
    assert handoff["final_status"] == "succeeded"
    assert handoff["result"]["deployment_id"] == 7


def test_reconcile_error_returns_reason_code(dispatch_client, monkeypatch):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Create a PR", idempotency_key="reconcile-error"),
    ).json()
    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch import service as svc

    run = db.get(AgentDispatchRun, created["id"])
    run.cursor_agent_id = "bc-reconcile-error"
    run.cursor_api_version = "v1"
    run.status = "awaiting_result"
    db.commit()

    class BrokenCursor:
        def __init__(self, settings):
            pass

        def get_run_snapshot(self, **kwargs):
            raise CursorApiError("poll failed", status_code=503)

    monkeypatch.setattr(svc, "CursorCloudAgentsClient", BrokenCursor)
    result = svc.finalize_with_github(db, get_settings(), run.id)
    assert result.status == "needs_attention"
    assert result.error_code == "reconcile_failed"


def test_webhook_delay_reconciles_cursor_before_success(dispatch_client, monkeypatch):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Create a PR", idempotency_key="webhook-delay"),
    ).json()
    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch import service as svc

    run = db.get(AgentDispatchRun, created["id"])
    run.cursor_agent_id = "bc-webhook-delay"
    run.cursor_api_version = "v0"
    run.status = "running"
    db.commit()

    class DelayedCursor:
        def __init__(self, settings):
            pass

        def get_run_snapshot(self, **kwargs):
            return CursorRunSnapshot(
                "v0",
                "bc-webhook-delay",
                None,
                "FINISHED",
                "done",
                "feat/artifacts",
                "https://github.com/CzechowskiT/twin/pull/42",
                None,
                {},
            )

    class DelayedGitHub:
        def __init__(self, settings):
            pass

        def enrich(self, **kwargs):
            if kwargs["pr_url"]:
                return _enrichment(
                    _verified(pr_exists=True, commit_exists=True, head_sha_verified=True),
                    reason=None,
                )
            return _enrichment(_verified(), reason="expected_pr_missing", pr_url=None)

    monkeypatch.setattr(svc, "CursorCloudAgentsClient", DelayedCursor)
    monkeypatch.setattr(svc, "GitHubEnricher", DelayedGitHub)
    payload = {"id": "bc-webhook-delay", "status": "FINISHED", "target": {}}
    raw = json.dumps(payload).encode()
    signature = "sha256=" + hmac.new(b"x" * 32, raw, hashlib.sha256).hexdigest()
    response = client.post(
        "/api/internal/agent-dispatch/webhooks/cursor",
        content=raw,
        headers={"X-Webhook-Signature": signature, "X-Webhook-ID": "delayed"},
    )
    assert response.status_code == 200
    assert db.get(AgentDispatchRun, run.id).status == "succeeded"


def test_polling_delay_rechecks_github_before_success(dispatch_client, monkeypatch):
    client, db = dispatch_client
    created = client.post(
        "/api/internal/agent-dispatch/runs",
        headers=_auth(),
        json=_create_payload(prompt="Create a PR and run CI", idempotency_key="poll-delay"),
    ).json()
    from app.database.models import AgentDispatchRun
    from app.services.agent_dispatch import service as svc

    run = db.get(AgentDispatchRun, created["id"])
    run.cursor_agent_id = "bc-poll-delay"
    run.cursor_run_id = "run-poll-delay"
    run.cursor_api_version = "v1"
    run.status = "running"
    db.commit()
    calls = {"cursor": 0, "github": 0}

    class PollCursor:
        def __init__(self, settings):
            pass

        def get_run_snapshot(self, **kwargs):
            calls["cursor"] += 1
            return CursorRunSnapshot(
                "v1",
                "bc-poll-delay",
                "run-poll-delay",
                "FINISHED",
                "done",
                "feat/artifacts",
                "https://github.com/CzechowskiT/twin/pull/42",
                None,
                {},
            )

    class PollGitHub:
        def __init__(self, settings):
            pass

        def enrich(self, **kwargs):
            calls["github"] += 1
            passed = calls["github"] > 1
            return _enrichment(
                _verified(
                    pr_exists=True,
                    commit_exists=True,
                    head_sha_verified=True,
                    ci_passed=passed,
                ),
                reason=None if passed else "expected_ci_missing",
            )

    monkeypatch.setattr(svc, "CursorCloudAgentsClient", PollCursor)
    monkeypatch.setattr(svc, "GitHubEnricher", PollGitHub)
    response = client.post(
        f"/api/internal/agent-dispatch/runs/{run.id}/reconcile", headers=_auth()
    )
    assert response.json()["status"] == "succeeded"
    assert response.json()["verified_artifacts"]["ci_passed"] is True
    assert calls == {"cursor": 2, "github": 2}
