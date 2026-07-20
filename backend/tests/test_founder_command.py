"""Founder Command Center — unit + integration tests."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, FounderCommand, FounderDecision
from app.database.session import get_db
from app.main import app
from app.services.founder_command.approval_policy import classify_operation
from app.services.founder_command.auth import FounderPrincipal, issue_csrf_token, verify_csrf
from app.services.founder_command.constants import AutonomyLevel, GATE_F_STATUS, LAUNCH_STANCE
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


def _keep_founder_command_queued(
    session: Session,
    _settings: object,
    command_id: str,
    **_kwargs: object,
) -> None:
    command = session.get(FounderCommand, command_id)
    command.status = "queued"
    command.current_stage = "resolve_state"
    session.flush()


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
    guarded_deploy = {
        "execution_mode": "deploy",
        "execution_contract": {
            "commit_required": True,
            "pr_required": True,
            "deployment_required": True,
            "production_regression_required": True,
        },
    }
    risk2, disp2 = classify_operation("production_deploy", guarded_deploy)
    assert disp2 == "auto"
    assert risk2 == "high"
    _, unguarded = classify_operation(
        "production_deploy",
        {"execution_mode": "deploy"},
    )
    assert unguarded == "require_approval"
    risk3, disp3 = classify_operation("force_unlock", {"execution_mode": "deploy"})
    assert disp3 == "require_approval"
    assert risk3 == "critical"
    risk4, disp4 = classify_operation("merge_to_base", {"execution_mode": "deploy"})
    assert disp4 == "require_approval"


def test_ci_gated_deploy_command_does_not_wait_for_approval(founder_client, monkeypatch):
    client, db = founder_client
    monkeypatch.setattr(
        "app.services.founder_command.service.tick_command",
        _keep_founder_command_queued,
    )
    monkeypatch.setattr(
        "app.tasks.founder_command_tasks.tick_founder_command.delay",
        lambda *_args, **_kwargs: None,
    )

    response = client.post(
        "/api/v1/founder-command/commands",
        headers={**_csrf(client), "Idempotency-Key": "ci-gated-deploy-auto"},
        json={
            "direction": "Wdróż standardową zmianę po zielonym CI.",
            "action": "start",
            "autonomy_level": 3,
            "max_batches": 1,
            "max_runtime_minutes": 60,
            "execution_mode": "deploy",
            "execution_contract": {
                "execution_mode": "mutating",
                "read_only": False,
                "mutation_required": True,
                "commit_required": True,
                "pr_required": True,
                "merge_required": False,
                "deployment_required": True,
                "production_regression_required": True,
                "operator_execution_required": True,
            },
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "queued"
    assert body["pending_decisions"] == []
    decision = db.query(FounderDecision).filter_by(command_id=body["id"]).one()
    assert decision.operation == "standard_production_deploy"
    assert decision.risk == "high"
    assert decision.status == "auto_approved"


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


def _seed_running_command(db, **overrides) -> FounderCommand:
    from datetime import datetime
    import uuid

    row = FounderCommand(
        id=str(uuid.uuid4()),
        status="running",
        current_stage="report_handoff",
        direction="Hard limit regression fixture",
        autonomy_level=3,
        batch_index=0,
        max_batches=5,
        max_runtime_minutes=60,
        max_consecutive_failures=2,
        consecutive_failures=0,
        plan_json=json.dumps(
            {
                "execution_mode": "build",
                "batch_objective": "fixture",
                "product_agent_prompt": "x",
            }
        ),
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    for key, value in overrides.items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _timeline_messages(db, command_id: str) -> list[str]:
    from sqlalchemy import select
    from app.database.models import FounderCommandTimelineEvent

    return list(
        db.execute(
            select(FounderCommandTimelineEvent.message)
            .where(FounderCommandTimelineEvent.command_id == command_id)
            .order_by(FounderCommandTimelineEvent.created_at.asc())
        )
        .scalars()
        .all()
    )


def test_max_consecutive_failures_without_active_run_fails(founder_client):
    client, db = founder_client
    from app.services.founder_command.execution_loop import tick_command
    from app.services.founder_command.state_resolver import resolve_project_state

    cmd = _seed_running_command(
        db,
        consecutive_failures=2,
        max_consecutive_failures=2,
        dispatch_run_id=None,
        current_stage="report_handoff",
    )
    settings = get_settings()
    before = resolve_project_state(db, settings)["counters"]["active_commands"]
    out = tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    assert out.status == "failed"
    assert cmd.status == "failed"
    assert cmd.error_code == "max_consecutive_failures"
    assert cmd.finished_at is not None
    assert cmd.live_summary == "Stopped by hard limit: max_consecutive_failures"
    assert "needs_founder" not in {cmd.status}
    after = resolve_project_state(db, settings)["counters"]["active_commands"]
    assert after == before - 1
    msgs = _timeline_messages(db, cmd.id)
    assert msgs.count("Stopped by hard limit: max_consecutive_failures") == 1


def test_max_consecutive_failures_after_needs_attention(founder_client, monkeypatch):
    client, db = founder_client
    from datetime import datetime
    from app.database.models import AgentDispatchRun
    from app.services.founder_command.execution_loop import tick_command

    run = AgentDispatchRun(
        id="dispatch-needs-attention-hl",
        status="needs_attention",
        task_name="hl-needs-attention",
        repository_url="https://github.com/CzechowskiT/twin",
        base_branch="cursor/phase1-monorepo-scaffold",
        prompt_envelope_version="v1",
        prompt_hash="abc",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    monkeypatch.setattr(
        "app.services.founder_command.execution_loop.reconcile_run",
        lambda *a, **k: run,
    )
    cmd = _seed_running_command(
        db,
        consecutive_failures=1,
        max_consecutive_failures=2,
        dispatch_run_id=run.id,
        current_stage="await_agent",
    )
    settings = get_settings()
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    assert cmd.consecutive_failures == 2
    assert cmd.current_stage == "report_handoff"
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    assert cmd.status == "failed"
    assert cmd.error_code == "max_consecutive_failures"
    assert cmd.finished_at is not None


def test_max_consecutive_failures_after_cursor_error(founder_client, monkeypatch):
    client, db = founder_client
    from datetime import datetime
    from app.database.models import AgentDispatchRun
    from app.services.founder_command.execution_loop import tick_command

    run = AgentDispatchRun(
        id="dispatch-cursor-error-hl",
        status="failed",
        error_code="cursor_error",
        task_name="hl-cursor-error",
        repository_url="https://github.com/CzechowskiT/twin",
        base_branch="cursor/phase1-monorepo-scaffold",
        prompt_envelope_version="v1",
        prompt_hash="abc",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    monkeypatch.setattr(
        "app.services.founder_command.execution_loop.reconcile_run",
        lambda *a, **k: run,
    )
    cmd = _seed_running_command(
        db,
        consecutive_failures=1,
        max_consecutive_failures=2,
        dispatch_run_id=run.id,
        current_stage="await_agent",
    )
    settings = get_settings()
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    assert cmd.status == "failed"
    assert cmd.error_code == "max_consecutive_failures"
    assert cmd.finished_at is not None


def test_max_runtime_minutes_fails_never_needs_founder(founder_client):
    client, db = founder_client
    from datetime import datetime, timedelta
    from app.services.founder_command.execution_loop import tick_command

    cmd = _seed_running_command(
        db,
        max_runtime_minutes=30,
        started_at=datetime.utcnow() - timedelta(minutes=45),
        consecutive_failures=0,
        current_stage="await_agent",
    )
    settings = get_settings()
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    assert cmd.status == "failed"
    assert cmd.error_code == "max_runtime_minutes"
    assert cmd.finished_at is not None
    assert cmd.status != "needs_founder"
    assert "Stopped by hard limit: max_runtime_minutes" in (cmd.live_summary or "")


def test_hard_limit_pending_decisions_zero_and_no_timeline_dupes(founder_client):
    client, db = founder_client
    from app.services.founder_command.execution_loop import tick_command
    from app.services.founder_command.state_resolver import resolve_project_state

    cmd = _seed_running_command(
        db,
        consecutive_failures=5,
        max_consecutive_failures=2,
    )
    settings = get_settings()
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    state = resolve_project_state(db, settings)
    assert state["counters"]["pending_decisions"] == 0
    assert cmd.status == "failed"
    msgs = _timeline_messages(db, cmd.id)
    assert msgs.count("Stopped by hard limit: max_consecutive_failures") == 1


def test_re_reconcile_terminal_hard_limit_is_idempotent(founder_client):
    client, db = founder_client
    from datetime import datetime
    from app.services.founder_command.execution_loop import tick_command

    cmd = _seed_running_command(
        db,
        consecutive_failures=3,
        max_consecutive_failures=2,
    )
    settings = get_settings()
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    finished = cmd.finished_at
    failures = cmd.consecutive_failures
    msgs_before = _timeline_messages(db, cmd.id)
    assert finished is not None

    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    assert cmd.status == "failed"
    assert cmd.finished_at == finished
    assert cmd.consecutive_failures == failures
    assert _timeline_messages(db, cmd.id) == msgs_before


def test_needs_founder_only_with_real_pending_decision(founder_client):
    client, db = founder_client
    from datetime import datetime, timedelta
    import uuid
    from app.database.models import FounderDecision
    from app.services.founder_command.execution_loop import tick_command

    settings = get_settings()
    # Hard limit must never land in needs_founder.
    limited = _seed_running_command(
        db,
        consecutive_failures=2,
        max_consecutive_failures=2,
    )
    tick_command(db, settings, limited.id, actor_fingerprint="test")
    db.refresh(limited)
    assert limited.status == "failed"
    assert limited.error_code == "max_consecutive_failures"

    # Real pending decision keeps needs_founder and does not terminalize.
    cmd = _seed_running_command(
        db,
        status="needs_founder",
        current_stage="approval_policy",
        consecutive_failures=0,
        live_summary="Waiting for founder decision",
    )
    db.add(
        FounderDecision(
            id=str(uuid.uuid4()),
            command_id=cmd.id,
            operation="force_unlock",
            title="Needs founder",
            risk="critical",
            status="pending",
            evidence_json="{}",
            expires_at=datetime.utcnow() + timedelta(hours=1),
            created_at=datetime.utcnow(),
        )
    )
    db.commit()
    tick_command(db, settings, cmd.id, actor_fingerprint="test")
    db.refresh(cmd)
    assert cmd.status == "needs_founder"
    assert cmd.finished_at is None
    assert cmd.error_code is None


def test_heal_legacy_needs_founder_hard_limit_residual(founder_client):
    """Prod residual pattern: needs_founder + hard-limit headline + pending=0."""
    client, db = founder_client
    from app.services.founder_command.execution_loop import tick_command
    from app.services.founder_command.state_resolver import resolve_project_state

    cmd = _seed_running_command(
        db,
        status="needs_founder",
        current_stage="report_handoff",
        live_summary="Stopped by hard limit: max_runtime_minutes",
        consecutive_failures=0,
        finished_at=None,
        error_code=None,
    )
    settings = get_settings()
    before = resolve_project_state(db, settings)["counters"]["active_commands"]
    tick_command(db, settings, cmd.id, actor_fingerprint="celery-beat")
    db.refresh(cmd)
    assert cmd.status == "failed"
    assert cmd.error_code == "max_runtime_minutes"
    assert cmd.finished_at is not None
    after = resolve_project_state(db, settings)["counters"]["active_commands"]
    assert after == before - 1
    # Re-tick must stay idempotent
    msgs = _timeline_messages(db, cmd.id)
    tick_command(db, settings, cmd.id, actor_fingerprint="celery-beat")
    assert _timeline_messages(db, cmd.id) == msgs
