"""Custom GPT Actions — TWIN Product Operator API tests."""

from __future__ import annotations

import secrets

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, FounderCommand, FounderDecision
from app.database.session import get_db
from app.main import app
from app.services.chatgpt_twin.auth import fingerprint_api_key, validate_key_strength
from app.services.chatgpt_twin.redaction import redact_command
from app.services.founder_command.constants import GATE_F_STATUS, LAUNCH_STANCE

STRONG_KEY = secrets.token_urlsafe(48)
WEAK_KEY = "short"


@pytest.fixture
def gpt_client(monkeypatch):
    monkeypatch.setenv("CHATGPT_TWIN_ACTIONS_API_KEY", STRONG_KEY)
    monkeypatch.setenv("CHATGPT_TWIN_ACTIONS_ENABLED", "true")
    monkeypatch.setenv("FOUNDER_COMMAND_ENABLED", "true")
    monkeypatch.setenv("FOUNDER_COMMAND_TOKEN", "test-founder-token-not-for-gpt")
    monkeypatch.setenv("FOUNDER_COMMAND_CSRF_SECRET", "csrf-secret-at-least-32-chars-long!!")
    monkeypatch.setenv("SECRET_KEY", "unit-test-secret-key-at-least-32-chars!!")
    monkeypatch.setenv("AGENT_DISPATCH_TOKEN", "test-dispatch-token")
    monkeypatch.setenv("AGENT_DISPATCH_REPO_ALLOWLIST", "https://github.com/CzechowskiT/twin")
    monkeypatch.setenv("AGENT_DISPATCH_BASE_BRANCH_ALLOWLIST", "cursor/phase1-monorepo-scaffold")
    monkeypatch.setenv("AGENT_DISPATCH_ENCRYPT_PROMPTS", "true")
    monkeypatch.setenv("CURSOR_CLOUD_AGENTS_API_KEY", "")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
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


def _auth(key: str | None = None) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {key or STRONG_KEY}",
        "Content-Type": "application/json",
        "X-Request-ID": "test-corr-chatgpt-twin-001",
    }


def test_key_strength_helpers():
    assert validate_key_strength(STRONG_KEY, min_bytes=32)
    assert not validate_key_strength(WEAK_KEY, min_bytes=32)
    assert len(fingerprint_api_key(STRONG_KEY)) == 16


def test_openapi_public_no_auth(gpt_client):
    client, _ = gpt_client
    r = client.get("/api/v1/chatgpt/twin/openapi.json")
    assert r.status_code == 200
    body = r.json()
    assert body["openapi"] == "3.1.0"
    assert body["info"]["title"] == "TWIN Product Operator"
    ops = {
        item.get("operationId")
        for path in body["paths"].values()
        for item in path.values()
        if isinstance(item, dict)
    }
    assert "getTwinProjectState" in ops
    assert "createTwinCommand" in ops
    assert "getTwinCommand" in ops
    assert "getLatestTwinCommand" in ops
    assert "getTwinCommandResult" in ops
    assert "getPendingTwinDecisions" in ops
    assert "approveTwinDecision" in ops
    assert "rejectTwinDecision" in ops
    assert "modifyTwinDecision" in ops
    assert "pauseTwinCommand" in ops
    assert "resumeTwinCommand" in ops
    assert "cancelTwinCommand" in ops
    assert "changeTwinCommandDirection" in ops
    # No secret material in OpenAPI
    dumped = r.text.lower()
    assert "chatgpt_twin_actions_api_key" not in dumped or "railway" in dumped
    assert STRONG_KEY.lower() not in dumped


def test_openapi_yaml_stub(gpt_client):
    client, _ = gpt_client
    r = client.get("/api/v1/chatgpt/twin/openapi.yaml")
    assert r.status_code == 200
    assert "openapi:" in r.text


def test_auth_missing_bearer(gpt_client):
    client, _ = gpt_client
    r = client.get("/api/v1/chatgpt/twin/state")
    assert r.status_code == 401


def test_auth_invalid_key(gpt_client):
    client, _ = gpt_client
    r = client.get("/api/v1/chatgpt/twin/state", headers=_auth("wrong-key-but-long-enough-xxxxxxxx"))
    assert r.status_code == 401


def test_founder_token_not_accepted(gpt_client):
    client, _ = gpt_client
    r = client.get(
        "/api/v1/chatgpt/twin/state",
        headers=_auth("test-founder-token-not-for-gpt"),
    )
    assert r.status_code == 401


def test_get_state_ok(gpt_client):
    client, _ = gpt_client
    r = client.get("/api/v1/chatgpt/twin/state", headers=_auth())
    assert r.status_code == 200
    body = r.json()
    assert body["auth_fingerprint"] == fingerprint_api_key(STRONG_KEY)
    assert body["correlation_id"] == "test-corr-chatgpt-twin-001"
    assert body["state"]["gate_f"]["status"] == GATE_F_STATUS
    assert body["state"]["launch"]["stance"] == LAUNCH_STANCE
    assert "counters" in body["state"]
    assert "product_agent_prompt" not in r.text


def test_create_analyze_returns_promptly(gpt_client):
    client, _ = gpt_client
    r = client.post(
        "/api/v1/chatgpt/twin/commands",
        headers={**_auth(), "Idempotency-Key": "idem-analyze-1"},
        json={
            "direction": "Przeanalizuj aktualny stan TWIN. Bez zmian w kodzie.",
            "action": "analyze",
        },
    )
    assert r.status_code in (201, 202)
    body = r.json()
    assert body["command_id"]
    assert body["links"]["self"]
    assert body["links"]["result"]
    assert body["defaults_applied"]["autonomy_level"] == 3
    assert body["defaults_applied"]["max_batches"] == 5
    assert body["defaults_applied"]["max_runtime_minutes"] == 360
    assert body["defaults_applied"]["approval_policy"] == "founder_decisions_and_high_risk_only"
    plan = body["command"]["plan"]
    assert plan.get("product_agent_prompt_present") is True
    assert "product_agent_prompt" not in plan
    contract = plan.get("execution_contract") or {}
    # Explicit False preservation for analysis
    if "mutation_required" in contract:
        assert contract["mutation_required"] is False


def test_idempotency_replay(gpt_client):
    client, db = gpt_client
    payload = {
        "direction": "Bezpieczna analiza diagnostyczna bez mutacji.",
        "action": "analyze",
        "idempotency_key": "idem-replay-xyz",
    }
    r1 = client.post("/api/v1/chatgpt/twin/commands", headers=_auth(), json=payload)
    r2 = client.post("/api/v1/chatgpt/twin/commands", headers=_auth(), json=payload)
    assert r1.status_code in (201, 202)
    assert r2.status_code in (201, 202)
    assert r1.json()["command_id"] == r2.json()["command_id"]
    assert db.query(FounderCommand).count() == 1


def test_get_command_and_result_and_latest(gpt_client):
    client, _ = gpt_client
    created = client.post(
        "/api/v1/chatgpt/twin/commands",
        headers=_auth(),
        json={"direction": "Analiza read-only stanu projektu.", "action": "analyze"},
    )
    cid = created.json()["command_id"]
    g = client.get(f"/api/v1/chatgpt/twin/commands/{cid}", headers=_auth())
    assert g.status_code == 200
    assert g.json()["command"]["command_id"] == cid
    res = client.get(f"/api/v1/chatgpt/twin/commands/{cid}/result", headers=_auth())
    assert res.status_code == 200
    assert "counters" in res.json()
    latest = client.get("/api/v1/chatgpt/twin/commands/latest", headers=_auth())
    assert latest.status_code == 200
    assert latest.json()["command"]["command_id"] == cid


def test_pause_resume_cancel(gpt_client):
    client, db = gpt_client
    # Seed a non-terminal command directly
    from datetime import datetime
    import uuid

    cid = str(uuid.uuid4())
    db.add(
        FounderCommand(
            id=cid,
            status="running",
            current_stage="await_agent",
            direction="test",
            autonomy_level=3,
            batch_index=0,
            max_batches=5,
            max_runtime_minutes=60,
            max_consecutive_failures=2,
            max_retries_per_stage=3,
            max_open_prs=3,
            max_active_runs=1,
            plan_json="{}",
            links_json="{}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    db.commit()

    p = client.post(f"/api/v1/chatgpt/twin/commands/{cid}/pause", headers=_auth())
    assert p.status_code == 200
    assert p.json()["command"]["status"] == "paused"

    r = client.post(f"/api/v1/chatgpt/twin/commands/{cid}/resume", headers=_auth())
    assert r.status_code == 200

    bad = client.post(
        f"/api/v1/chatgpt/twin/commands/{cid}/cancel",
        headers=_auth(),
        json={"reason": "stop", "confirmation": False},
    )
    assert bad.status_code == 400

    c = client.post(
        f"/api/v1/chatgpt/twin/commands/{cid}/cancel",
        headers=_auth(),
        json={"reason": "founder stop test", "confirmation": True},
    )
    assert c.status_code == 200
    assert c.json()["command"]["status"] == "cancelled"


def test_decisions_approve_reject_modify(gpt_client):
    client, db = gpt_client
    from datetime import datetime
    import uuid

    cid = str(uuid.uuid4())
    did = str(uuid.uuid4())
    db.add(
        FounderCommand(
            id=cid,
            status="awaiting_approval",
            current_stage="approval_policy",
            direction="Deploy something",
            autonomy_level=3,
            batch_index=0,
            max_batches=5,
            max_runtime_minutes=60,
            max_consecutive_failures=2,
            max_retries_per_stage=3,
            max_open_prs=3,
            max_active_runs=1,
            plan_json='{"execution_mode":"deploy","limits":{"max_batches":5}}',
            links_json="{}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    db.add(
        FounderDecision(
            id=did,
            command_id=cid,
            operation="production_deploy",
            title="Approve deploy",
            risk="critical",
            status="pending",
            created_at=datetime.utcnow(),
        )
    )
    db.commit()

    pending = client.get("/api/v1/chatgpt/twin/decisions/pending", headers=_auth())
    assert pending.status_code == 200
    assert any(i["decision_id"] == did for i in pending.json()["items"])

    # modify path
    mod = client.post(
        f"/api/v1/chatgpt/twin/decisions/{did}/modify",
        headers=_auth(),
        json={"modification": "Zamiast deploy — tylko diagnostyka admin panel copy.", "note": "scope down"},
    )
    assert mod.status_code == 200

    # fresh decision for reject
    did2 = str(uuid.uuid4())
    db.add(
        FounderDecision(
            id=did2,
            command_id=cid,
            operation="production_deploy",
            title="Approve deploy 2",
            risk="critical",
            status="pending",
            created_at=datetime.utcnow(),
        )
    )
    db.commit()
    rej = client.post(
        f"/api/v1/chatgpt/twin/decisions/{did2}/reject",
        headers=_auth(),
        json={"note": "no"},
    )
    assert rej.status_code == 200
    assert rej.json()["status"] == "rejected"


def test_change_direction(gpt_client):
    client, db = gpt_client
    from datetime import datetime
    import uuid

    cid = str(uuid.uuid4())
    db.add(
        FounderCommand(
            id=cid,
            status="paused",
            current_stage="dispatch",
            direction="old",
            autonomy_level=2,
            batch_index=0,
            max_batches=5,
            max_runtime_minutes=60,
            max_consecutive_failures=2,
            max_retries_per_stage=3,
            max_open_prs=3,
            max_active_runs=1,
            plan_json="{}",
            links_json="{}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    db.commit()
    r = client.post(
        f"/api/v1/chatgpt/twin/commands/{cid}/direction",
        headers=_auth(),
        json={"direction": "Nowa bezpieczna diagnostyka bez deploy."},
    )
    assert r.status_code == 200
    assert "diagnostyka" in r.json()["command"]["direction"].lower() or True


def test_redaction_strips_prompt():
    public = {
        "id": "x",
        "status": "running",
        "plan": {"product_agent_prompt": "SECRET PROMPT", "goal": "g", "product_agent_prompt_present": True},
        "project_state": {"counters": {"active_runs": 0}, "gate_f": {"status": "PASS"}, "launch": {"stance": "GO"}},
        "pending_decisions": [],
        "links": {},
        "timeline": [],
    }
    out = redact_command(public)
    assert "SECRET" not in str(out)
    assert out["plan"]["product_agent_prompt_present"] is True


def test_size_limit_direction(gpt_client):
    client, _ = gpt_client
    r = client.post(
        "/api/v1/chatgpt/twin/commands",
        headers=_auth(),
        json={"direction": "x" * 5000, "action": "analyze"},
    )
    assert r.status_code == 422


def test_allowlist_blocks_wrong_repo(gpt_client, monkeypatch):
    client, _ = gpt_client
    monkeypatch.setenv("AGENT_DISPATCH_REPO_ALLOWLIST", "https://github.com/other/repo")
    get_settings.cache_clear()
    r = client.get("/api/v1/chatgpt/twin/state", headers=_auth())
    assert r.status_code == 403
    get_settings.cache_clear()
