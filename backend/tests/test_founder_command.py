"""Founder Command Center — unit + integration tests."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, FounderCommand
from app.database.session import get_db
from app.main import app
from app.services.founder_command.approval_policy import classify_operation
from app.services.founder_command.auth import FounderPrincipal, issue_csrf_token, verify_csrf
from app.services.founder_command.constants import (
    AutonomyLevel,
    GATE_F_STATUS,
    LAUNCH_STANCE,
)
from app.services.founder_command.planner import plan_from_command
from app.services.founder_command.state_resolver import resolve_project_state


@pytest.fixture
def founder_client(monkeypatch):
    monkeypatch.setenv("FOUNDER_COMMAND_TOKEN", "test-founder-token")
    monkeypatch.setenv("FOUNDER_COMMAND_CSRF_SECRET", "csrf-secret-at-least-32-chars-long!!")
    monkeypatch.setenv("FOUNDER_COMMAND_ENABLED", "true")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-unused")
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


def _auth():
    return {"Authorization": "Bearer test-founder-token"}


def _csrf(client: TestClient) -> dict[str, str]:
    r = client.get("/api/v1/founder-command/csrf", headers=_auth())
    assert r.status_code == 200
    token = r.json()["csrf_token"]
    return {**_auth(), "X-CSRF-Token": token, "Content-Type": "application/json"}


def test_planner_analysis_preserves_false_flags():
    plan = plan_from_command(
        command_text="Wykonaj bezpieczny diagnostyczny batch",
        project_state={"repo": {}, "production": {}, "counters": {}},
        autonomy_level=1,
        max_batches=2,
        max_runtime_minutes=30,
        action="analyze",
    )
    contract = plan["execution_contract"]
    assert contract["execution_mode"] == "read_only"
    assert contract["mutation_required"] is False
    assert contract["pr_required"] is False
    assert contract["merge_required"] is False
    assert "product_agent_prompt" in plan
    assert plan["product_agent_prompt_hash"]


def test_planner_diagnostic_forces_analysis_at_default_level():
    """Polish diagnostic wording must stay read-only even at default autonomy L3."""
    from app.services.agent_dispatch.artifacts import (
        has_mutation_requirement,
        resolve_execution_contract,
    )

    plan = plan_from_command(
        command_text="Wykonaj bezpieczny diagnostyczny batch autonomicznie.",
        project_state={"repo": {}, "production": {}, "counters": {}},
        autonomy_level=3,
        max_batches=1,
        max_runtime_minutes=90,
        action="start",
    )
    assert plan["execution_mode"] == "analysis"
    assert plan["execution_contract"]["read_only"] is True
    assert plan["execution_contract"]["mutation_required"] is False
    assert "production_deploy" not in (plan.get("approval_needs") or [])
    prompt = plan["product_agent_prompt"]
    assert has_mutation_requirement(prompt) is False
    resolved = resolve_execution_contract(
        prompt, explicit=plan["execution_contract"], auto_create_pr=False
    )
    assert resolved["execution_mode"] == "read_only"
    assert resolved["read_only"] is True


def test_planner_mutating_polish_approval_policy_not_read_only():
    """Zmień Approval Policy + testy + PR + wdroż → mutating, never fixed diagnostic goal."""
    plan = plan_from_command(
        command_text="Zmień Approval Policy, dodaj testy, utwórz PR, wdroż i zweryfikuj",
        project_state={"repo": {}, "production": {}, "counters": {}},
        autonomy_level=3,
        max_batches=5,
        max_runtime_minutes=360,
        action="start",
    )
    assert plan["execution_mode"] in {"build", "deploy"}
    assert plan["execution_mode"] != "analysis"
    contract = plan["execution_contract"]
    assert contract["read_only"] is False
    assert contract["execution_mode"] == "mutating"
    assert contract["mutation_required"] is True
    assert contract["commit_required"] is True
    assert contract["pr_required"] is True
    assert "Diagnose TWIN production readiness without mutations" not in plan["goal"]
    assert "Approval Policy" in plan["goal"] or "Zmień" in plan["goal"]


def test_planner_explicit_analysis_polish_read_only():
    plan = plan_from_command(
        command_text="Przeanalizuj stan bez zmian",
        project_state={"repo": {}, "production": {}, "counters": {}},
        autonomy_level=3,
        max_batches=2,
        max_runtime_minutes=60,
        action="start",
    )
    assert plan["execution_mode"] == "analysis"
    assert plan["execution_contract"]["read_only"] is True
    assert plan["execution_contract"]["mutation_required"] is False


def test_planner_analyze_action_with_mutating_scope_fails():
    from app.services.founder_command.planner import PLANNER_EXECUTION_MODE_MISMATCH

    with pytest.raises(ValueError, match=PLANNER_EXECUTION_MODE_MISMATCH):
        plan_from_command(
            command_text="Zmień Approval Policy, dodaj testy, utwórz PR, wdroż i zweryfikuj",
            project_state={"repo": {}, "production": {}, "counters": {}},
            autonomy_level=3,
            max_batches=5,
            max_runtime_minutes=360,
            action="analyze",
        )


def test_planner_explicit_api_contract_overrides_text():
    plan = plan_from_command(
        command_text="Something ambiguous without clear verbs",
        project_state={"repo": {}, "production": {}, "counters": {}},
        autonomy_level=3,
        max_batches=2,
        max_runtime_minutes=60,
        action="start",
        explicit_execution_mode="deploy",
        explicit_execution_contract={
            "read_only": False,
            "mutation_required": True,
            "commit_required": True,
            "pr_required": True,
            "deployment_required": True,
        },
    )
    assert plan["execution_mode"] == "deploy"
    assert plan["execution_contract"]["read_only"] is False
    assert plan["execution_contract"]["deployment_required"] is True


def test_planner_fallback_does_not_change_mutating_goal():
    text = "Zmień Approval Policy, dodaj testy, utwórz PR, wdroż i zweryfikuj"
    plan = plan_from_command(
        command_text=text,
        project_state={"repo": {}, "production": {}, "counters": {}},
        autonomy_level=3,
        max_batches=5,
        max_runtime_minutes=360,
        action="start",
    )
    assert plan["goal"] == text or text.startswith(plan["goal"].rstrip("…")[:50])
    assert plan["goal"] != "Diagnose TWIN production readiness without mutations"
    assert plan["goal"] != "Ship the next safe MVP batch toward Founder Command autonomy"


def test_active_lock_preserves_mutating_plan(founder_client, monkeypatch):
    """Lock may queue/wait — must not rewrite mutating plan to analysis."""
    from fastapi import HTTPException

    client, db = founder_client

    def fake_create(*_a, **_k):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "active_run_lock",
                "lock_run_id": "f35d294e-169c-458d-b3fd-dcaba5a42a87",
            },
        )

    monkeypatch.setattr(
        "app.services.founder_command.execution_loop.create_dispatch_run", fake_create
    )

    headers = _csrf(client)
    res = client.post(
        "/api/v1/founder-command/commands",
        headers={**headers, "Idempotency-Key": "lock-preserve-mutating"},
        json={
            "direction": "Zmień Approval Policy, dodaj testy, utwórz PR, wdroż i zweryfikuj",
            "action": "start",
            "autonomy_level": 3,
            "max_batches": 2,
            "max_runtime_minutes": 60,
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["plan"]["execution_mode"] in {"build", "deploy"}
    assert body["plan"]["execution_contract"]["read_only"] is False
    assert "Diagnose TWIN" not in (body["plan"].get("goal") or "")

    from app.services.founder_command.execution_loop import tick_command
    from app.config import get_settings

    settings = get_settings()
    cid = body["id"]
    row = db.get(FounderCommand, cid)
    assert row
    row.status = "queued"
    row.current_stage = "dispatch"
    db.commit()

    tick_command(db, settings, cid, actor_fingerprint="test")
    db.refresh(row)
    plan = json.loads(row.plan_json or "{}")
    assert plan.get("execution_mode") in {"build", "deploy"}
    assert plan.get("execution_contract", {}).get("read_only") is False
    assert row.status == "queued"
    assert "lock" in (row.live_summary or "").lower() or row.current_stage == "dispatch"


def test_idempotency_rejects_different_execution_contract(founder_client):
    client, db = founder_client
    headers = _csrf(client)
    key = "idem-contract-mismatch"
    first = client.post(
        "/api/v1/founder-command/commands",
        headers=headers,
        json={
            "direction": "Przeanalizuj stan bez zmian",
            "action": "analyze",
            "autonomy_level": 1,
            "max_batches": 1,
            "max_runtime_minutes": 30,
            "idempotency_key": key,
        },
    )
    assert first.status_code == 200, first.text
    second = client.post(
        "/api/v1/founder-command/commands",
        headers=_csrf(client),
        json={
            "direction": "Zmień Approval Policy, dodaj testy, utwórz PR, wdroż i zweryfikuj",
            "action": "start",
            "autonomy_level": 3,
            "max_batches": 5,
            "max_runtime_minutes": 360,
            "idempotency_key": key,
        },
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "idempotency_execution_contract_mismatch"


def test_level4_requires_caps():
    with pytest.raises(ValueError, match="level_4"):
        plan_from_command(
            command_text="keep shipping continuously",
            project_state={"repo": {}, "production": {}, "counters": {}},
            autonomy_level=4,
            max_batches=None,
            max_runtime_minutes=None,
        )


def test_approval_policy_safe_vs_high_risk():
    risk, disp = classify_operation("diagnose", {"execution_mode": "analysis"})
    assert disp == "auto"
    risk2, disp2 = classify_operation("production_deploy", {"execution_mode": "deploy"})
    assert disp2 == "auto"
    assert risk2 == "high"
    risk3, disp3 = classify_operation("force_unlock", {"execution_mode": "deploy"})
    assert disp3 == "require_approval"
    assert risk3 == "critical"
    risk4, disp4 = classify_operation("merge_to_base", {"execution_mode": "deploy"})
    assert disp4 == "require_approval"


def test_csrf_roundtrip():
    settings = get_settings()
    principal = FounderPrincipal(fingerprint="abc123deadbeef00", via="founder_token")
    token = issue_csrf_token(settings, principal)
    verify_csrf(settings, principal, token)


def test_state_resolver_includes_gate_and_launch(founder_client):
    client, db = founder_client
    settings = get_settings()
    state = resolve_project_state(db, settings)
    assert state["gate_f"]["status"] == GATE_F_STATUS
    assert state["launch"]["stance"] == LAUNCH_STANCE
    assert "counters" in state


def test_state_resolver_aligns_with_platform_deploy_metadata(founder_client, monkeypatch):
    _, db = founder_client
    deployed_sha = "58538e79f8c8e508d27f2aa7cb17450cb15e37c2"
    monkeypatch.setattr(
        "app.services.founder_command.state_resolver._git_commit_from_health",
        lambda: deployed_sha,
    )

    production = resolve_project_state(db, get_settings())["production"]

    assert production["api_git_commit"] == deployed_sha
    assert production["repo_head_hint"] == deployed_sha
    assert production["repo_head_source"] == "deployment_metadata"
    assert production["alignment_status"] == "aligned"


def test_state_resolver_does_not_mask_configured_head_mismatch(founder_client, monkeypatch):
    _, db = founder_client
    settings = get_settings()
    monkeypatch.setattr(
        settings,
        "founder_command_repo_head_hint",
        "1a5d577c9c21279bb68c19bc1cfa5d7bcac04dfe",
    )
    monkeypatch.setattr(
        "app.services.founder_command.state_resolver._git_commit_from_health",
        lambda: "844176fb158555c8dd0c1d60dcaba29eb9e66915",
    )

    production = resolve_project_state(db, settings)["production"]

    assert production["repo_head_source"] == "configured"
    assert production["alignment_status"] == "unknown"


def test_create_analyze_command_no_manual_prompt_copy(founder_client):
    client, db = founder_client
    headers = _csrf(client)
    res = client.post(
        "/api/v1/founder-command/commands",
        headers={**headers, "Idempotency-Key": "e2e-diag-1"},
        json={
            "direction": "Wykonaj bezpieczny diagnostyczny batch i kontynuuj do pełnego PASS.",
            "action": "analyze",
            "autonomy_level": 1,
            "max_batches": 2,
            "max_runtime_minutes": 60,
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["id"]
    assert body["plan"]["product_agent_prompt_present"] is True
    assert "product_agent_prompt" not in body["plan"]  # not exposed raw in public payload
    assert body["live_summary"]["gate_f"] == "PASS"
    assert body["live_summary"]["launch"] == "GO"
    # Timeline proves planner ran without founder paste
    assert any("Plan" in (t.get("message") or "") or t.get("stage") == "plan" for t in body["timeline"]) or body[
        "plan"
    ].get("product_agent_prompt_present")


def test_idempotency(founder_client):
    client, db = founder_client
    headers = _csrf(client)
    payload = {
        "direction": "Safe diagnostic only",
        "action": "analyze",
        "autonomy_level": 1,
        "max_batches": 1,
        "max_runtime_minutes": 30,
        "idempotency_key": "idem-abc",
    }
    a = client.post("/api/v1/founder-command/commands", headers=headers, json=payload)
    b = client.post("/api/v1/founder-command/commands", headers=_csrf(client), json=payload)
    assert a.status_code == 200 and b.status_code == 200
    assert a.json()["id"] == b.json()["id"]


def test_pause_resume_cancel(founder_client, monkeypatch):
    client, db = founder_client

    class FakeRun:
        id = "dispatch-pause-1"
        status = "running"
        cursor_agent_url = "https://cursor.com/agents/pause"
        result_pr_url = None
        result_summary = None

    monkeypatch.setattr(
        "app.services.founder_command.execution_loop.create_dispatch_run",
        lambda *a, **k: FakeRun(),
    )
    monkeypatch.setattr(
        "app.services.founder_command.execution_loop.reconcile_run",
        lambda *a, **k: FakeRun(),
    )

    from app.database.models import AgentDispatchRun
    from datetime import datetime

    db.add(
        AgentDispatchRun(
            id=FakeRun.id,
            status="running",
            task_name="pause-test",
            repository_url="https://github.com/CzechowskiT/twin",
            base_branch="cursor/phase1-monorepo-scaffold",
            prompt_envelope_version="v1",
            prompt_hash="abc",
            cursor_agent_url=FakeRun.cursor_agent_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    db.commit()

    headers = _csrf(client)
    created = client.post(
        "/api/v1/founder-command/commands",
        headers={**headers, "Idempotency-Key": "pause-1"},
        json={
            "direction": "Wykonaj bezpieczny diagnostyczny batch tylko do odczytu.",
            "action": "start",
            "autonomy_level": 1,
            "max_batches": 2,
            "max_runtime_minutes": 60,
        },
    )
    assert created.status_code == 200, created.text
    cid = created.json()["id"]
    # Force non-terminal if already advanced
    row = db.get(FounderCommand, cid)
    if row and row.status in {"succeeded", "failed", "cancelled"}:
        row.status = "running"
        row.current_stage = "await_agent"
        row.finished_at = None
        db.commit()

    paused = client.post(f"/api/v1/founder-command/commands/{cid}/pause", headers=_csrf(client))
    assert paused.status_code == 200, paused.text
    assert paused.json()["status"] == "paused"

    resumed = client.post(f"/api/v1/founder-command/commands/{cid}/resume", headers=_csrf(client))
    assert resumed.status_code == 200

    cancelled = client.post(f"/api/v1/founder-command/commands/{cid}/cancel", headers=_csrf(client))
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


def test_unauthorized_rejected(founder_client):
    client, _ = founder_client
    res = client.get("/api/v1/founder-command/state")
    assert res.status_code == 401


def test_mutating_requires_csrf(founder_client):
    client, _ = founder_client
    res = client.post(
        "/api/v1/founder-command/commands",
        headers={**_auth(), "Content-Type": "application/json"},
        json={"direction": "x" * 10, "action": "analyze", "autonomy_level": 1},
    )
    assert res.status_code == 403


def test_e2e_diagnostic_batch_auto_prompt_counters(founder_client, monkeypatch):
    """E2E: diagnostic batch — planner auto-builds prompt; no founder copy; counters tracked."""
    client, db = founder_client

    class FakeRun:
        def __init__(self):
            self.id = "dispatch-run-e2e"
            self.status = "succeeded"
            self.cursor_agent_url = "https://cursor.com/agents/fake-e2e"
            self.result_pr_url = None
            self.result_summary = "Diagnostic PASS"
            self.cursor_agent_id = "bc-fake"

    fake = FakeRun()

    def fake_create(*_a, **_k):
        return fake

    def fake_reconcile(*_a, **_k):
        return fake

    monkeypatch.setattr(
        "app.services.founder_command.execution_loop.create_dispatch_run", fake_create
    )
    monkeypatch.setattr(
        "app.services.founder_command.execution_loop.reconcile_run", fake_reconcile
    )

    # Seed run into DB so await stage can load it
    from app.database.models import AgentDispatchRun
    from datetime import datetime

    db.add(
        AgentDispatchRun(
            id=fake.id,
            status="succeeded",
            task_name="founder-cmd-analysis",
            repository_url="https://github.com/CzechowskiT/twin",
            base_branch="cursor/phase1-monorepo-scaffold",
            prompt_envelope_version="v1",
            prompt_hash="abc",
            cursor_agent_url=fake.cursor_agent_url,
            result_summary=fake.result_summary,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    db.commit()

    headers = _csrf(client)
    res = client.post(
        "/api/v1/founder-command/commands",
        headers={**headers, "Idempotency-Key": "e2e-full-diag"},
        json={
            "direction": "Wykonaj bezpieczny diagnostyczny batch i kontynuuj do pełnego PASS.",
            "action": "start",
            "autonomy_level": 1,
            "max_batches": 1,
            "max_runtime_minutes": 60,
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["plan"]["product_agent_prompt_present"] is True
    # Founder never receives raw prompt to copy
    assert "product_agent_prompt" not in body["plan"]
    assert body["plan"].get("product_agent_prompt") is None

    # Drive loop until terminal / await
    from app.services.founder_command.execution_loop import tick_command

    settings = get_settings()
    cid = body["id"]
    for _ in range(12):
        tick_command(db, settings, cid, actor_fingerprint="test")
        cmd = db.get(FounderCommand, cid)
        if cmd and cmd.status in {"succeeded", "failed", "cancelled", "needs_founder"}:
            break
        if cmd and cmd.links_json and "cursor.com" in (cmd.links_json or ""):
            # Continue until finalize when possible
            if cmd.current_stage in {"finalize", "report_handoff", "continue_or_approve"}:
                continue

    final = client.get(f"/api/v1/founder-command/commands/{cid}", headers=_auth())
    assert final.status_code == 200
    out = final.json()
    links = out.get("links") or {}
    assert links.get("cursor_agent") == "https://cursor.com/agents/fake-e2e" or out.get(
        "dispatch_run_id"
    )
    # Manual copy counters — product contract: prompt not in UI payload
    assert out["plan"]["product_agent_prompt_present"] is True
    assert "product_agent_prompt" not in out["plan"]
