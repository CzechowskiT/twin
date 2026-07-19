"""Autonomous execution loop — durable stages via Celery ticks."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import FounderCommand
from app.services.agent_dispatch.auth import AgentDispatchPrincipal
from app.services.agent_dispatch.constants import DISPATCH_RUN_TERMINAL, DispatchRunStatus
from app.services.agent_dispatch.service import create_dispatch_run, reconcile_run
from app.services.founder_command.approval_policy import command_has_blocking_pending
from app.services.founder_command.audit import write_founder_audit
from app.services.founder_command.constants import (
    ACTIVE_COMMAND_STATUSES,
    CommandStage,
    CommandStatus,
    DEFAULT_MAX_ACTIVE_RUNS,
    DEFAULT_MAX_CONSECUTIVE_FAILURES,
    DEFAULT_MAX_OPEN_PRS,
    DEFAULT_MAX_RETRIES_PER_STAGE,
)
from app.services.founder_command.notifications import notify_founder
from app.services.founder_command.state_resolver import resolve_project_state
from app.services.founder_command.summaries import build_final_summary, build_live_summary

logger = logging.getLogger(__name__)


def _plan(command: FounderCommand) -> dict[str, Any]:
    try:
        return json.loads(command.plan_json or "{}")
    except json.JSONDecodeError:
        return {}


def _links(command: FounderCommand) -> dict[str, str]:
    try:
        raw = json.loads(command.links_json or "{}")
        return {str(k): str(v) for k, v in raw.items()} if isinstance(raw, dict) else {}
    except json.JSONDecodeError:
        return {}


def _set_links(command: FounderCommand, updates: dict[str, str]) -> None:
    links = _links(command)
    links.update({k: v for k, v in updates.items() if v})
    command.links_json = json.dumps(links, separators=(",", ":"), sort_keys=True)


def _append_timeline(
    db: Session,
    command: FounderCommand,
    *,
    stage: str,
    message: str,
    detail: dict[str, Any] | None = None,
) -> None:
    from app.database.models import FounderCommandTimelineEvent
    import uuid

    db.add(
        FounderCommandTimelineEvent(
            id=str(uuid.uuid4()),
            command_id=command.id,
            stage=stage,
            message=message[:512],
            detail_json=json.dumps(detail or {}, separators=(",", ":"), sort_keys=True),
            created_at=datetime.utcnow(),
        )
    )


def _limits_ok(command: FounderCommand, state: dict[str, Any]) -> tuple[bool, str | None]:
    if command.max_batches and command.batch_index >= command.max_batches:
        return False, "max_batches"
    if command.started_at and command.max_runtime_minutes:
        elapsed = (datetime.utcnow() - command.started_at).total_seconds() / 60.0
        if elapsed > command.max_runtime_minutes:
            return False, "max_runtime_minutes"
    if command.consecutive_failures >= (
        command.max_consecutive_failures or DEFAULT_MAX_CONSECUTIVE_FAILURES
    ):
        return False, "max_consecutive_failures"
    counters = state.get("counters") or {}
    if int(counters.get("open_prs") or 0) > (
        command.max_open_prs or DEFAULT_MAX_OPEN_PRS
    ):
        return False, "max_open_prs"
    if int(counters.get("active_runs") or 0) > (
        command.max_active_runs or DEFAULT_MAX_ACTIVE_RUNS
    ) and command.current_stage == CommandStage.DISPATCH.value:
        return False, "max_active_runs"
    return True, None


def _dispatch_principal(fingerprint: str) -> AgentDispatchPrincipal:
    from app.services.agent_dispatch.constants import ALL_DISPATCH_SCOPES

    return AgentDispatchPrincipal(
        token_fingerprint=fingerprint or "founder-command",
        scopes=frozenset(ALL_DISPATCH_SCOPES),
    )


def tick_command(
    db: Session,
    settings: Settings,
    command_id: str,
    *,
    actor_fingerprint: str = "system",
) -> FounderCommand:
    """Advance one durable stage. Idempotent per stage + batch_index."""
    command = db.get(FounderCommand, command_id)
    if not command:
        raise LookupError("command_not_found")
    if command.status in {
        CommandStatus.PAUSED.value,
        CommandStatus.CANCELLED.value,
        CommandStatus.SUCCEEDED.value,
        CommandStatus.FAILED.value,
    }:
        return command
    if command.status == CommandStatus.AWAITING_APPROVAL.value:
        if command_has_blocking_pending(db, command.id):
            return command
        command.status = CommandStatus.QUEUED.value
        command.current_stage = CommandStage.DISPATCH.value

    state = resolve_project_state(db, settings)
    ok, reason = _limits_ok(command, state)
    if not ok:
        command.status = CommandStatus.NEEDS_FOUNDER.value
        command.live_summary = f"Stopped by hard limit: {reason}"
        _append_timeline(db, command, stage=command.current_stage or "limit", message=command.live_summary)
        notify_founder(
            db,
            command_id=command.id,
            kind="limit",
            title="Hard limit reached",
            body=command.live_summary,
            links=_links(command),
        )
        db.commit()
        return command

    stage = command.current_stage or CommandStage.RESOLVE_STATE.value
    plan = _plan(command)

    if stage == CommandStage.RESOLVE_STATE.value:
        command.project_state_json = json.dumps(state, separators=(",", ":"), sort_keys=True)
        command.current_stage = CommandStage.PLAN.value
        command.live_summary = "Project state resolved"
        _append_timeline(db, command, stage=stage, message="Resolved canonical ProjectState")
        db.commit()
        return command

    if stage == CommandStage.PLAN.value:
        # Plan already stored at create; move to approval
        command.current_stage = CommandStage.APPROVAL_POLICY.value
        command.live_summary = plan.get("batch_objective") or "Plan ready"
        _append_timeline(db, command, stage=stage, message="Plan confirmed")
        db.commit()
        return command

    if stage == CommandStage.APPROVAL_POLICY.value:
        if command_has_blocking_pending(db, command.id):
            command.status = CommandStatus.AWAITING_APPROVAL.value
            command.live_summary = "Waiting for founder approval"
            db.commit()
            return command
        command.status = CommandStatus.RUNNING.value
        command.current_stage = CommandStage.DISPATCH.value
        command.started_at = command.started_at or datetime.utcnow()
        _append_timeline(db, command, stage=stage, message="Approvals clear — dispatching")
        db.commit()
        return command

    if stage == CommandStage.DISPATCH.value:
        return _stage_dispatch(db, settings, command, plan, actor_fingerprint)

    if stage == CommandStage.AWAIT_AGENT.value:
        return _stage_await_agent(db, settings, command)

    if stage == CommandStage.OPERATOR.value:
        command.current_stage = CommandStage.MERGE_DEPLOY_REGRESSION.value
        command.live_summary = "Operator phase acknowledged (manual merge policy)"
        _append_timeline(db, command, stage=stage, message=command.live_summary)
        db.commit()
        return command

    if stage == CommandStage.MERGE_DEPLOY_REGRESSION.value:
        command.current_stage = CommandStage.REPORT_HANDOFF.value
        command.live_summary = "Merge/deploy remains manual — collecting report"
        _append_timeline(db, command, stage=stage, message=command.live_summary)
        db.commit()
        return command

    if stage == CommandStage.REPORT_HANDOFF.value:
        return _stage_report(db, settings, command, state)

    if stage == CommandStage.CONTINUE_OR_APPROVE.value:
        return _stage_continue(db, settings, command, state, plan)

    if stage == CommandStage.FINALIZE.value:
        command.status = CommandStatus.SUCCEEDED.value
        command.finished_at = datetime.utcnow()
        final = build_final_summary(command, project_state=state)
        command.final_summary = final.get("founder_facing")
        notify_founder(
            db,
            command_id=command.id,
            kind="final",
            title="Founder Command complete",
            body=command.final_summary or "Done",
            links=_links(command),
        )
        _append_timeline(db, command, stage=stage, message="Finalized")
        write_founder_audit(
            db,
            command_id=command.id,
            event_type="command_finalized",
            actor_fingerprint=actor_fingerprint,
            detail={"status": command.status},
        )
        db.commit()
        return command

    command.status = CommandStatus.FAILED.value
    command.error_code = "unknown_stage"
    command.error_message = f"Unknown stage {stage}"
    db.commit()
    return command


def _stage_dispatch(
    db: Session,
    settings: Settings,
    command: FounderCommand,
    plan: dict[str, Any],
    actor_fingerprint: str,
) -> FounderCommand:
    if command.dispatch_run_id:
        command.current_stage = CommandStage.AWAIT_AGENT.value
        db.commit()
        return command

    retries = command.stage_retry_count or 0
    max_retries = command.max_retries_per_stage or DEFAULT_MAX_RETRIES_PER_STAGE
    next_batch = plan.get("next_batch_proposal") or {}
    contract = plan.get("execution_contract") or {}
    prompt = plan.get("product_agent_prompt") or ""
    if not prompt:
        command.status = CommandStatus.FAILED.value
        command.error_code = "missing_prompt"
        command.error_message = "Planner did not produce Product Agent prompt"
        db.commit()
        return command

    idem = f"fc:{command.id}:batch:{command.batch_index}:dispatch"
    try:
        principal = _dispatch_principal(actor_fingerprint)
        run = create_dispatch_run(
            db,
            settings,
            principal,
            task_name=str(next_batch.get("task_name") or f"founder-{command.id[:8]}"),
            prompt=prompt,
            repository_url=str(next_batch.get("repository_url") or settings.agent_dispatch_repo_allowlist.split(",")[0]),
            base_branch=str(next_batch.get("base_branch") or "cursor/phase1-monorepo-scaffold"),
            execution_contract=contract,
            auto_create_pr=bool(next_batch.get("auto_create_pr")),
            idempotency_key=idem,
            metadata={
                "founder_command_id": command.id,
                "batch_index": command.batch_index,
                "source": "founder_command_center",
            },
            dispatch_now=True,
        )
        command.dispatch_run_id = run.id
        command.stage_retry_count = 0
        command.current_stage = CommandStage.AWAIT_AGENT.value
        command.status = CommandStatus.RUNNING.value
        _set_links(
            command,
            {
                "cursor_agent": run.cursor_agent_url or "",
                "dispatch_run": f"/api/internal/agent-dispatch/runs/{run.id}",
                "founder_command": f"/admin/founder-command?id={command.id}",
            },
        )
        command.live_summary = "Dispatched to Product Agent / Cursor"
        _append_timeline(
            db,
            command,
            stage=CommandStage.DISPATCH.value,
            message="Dispatch created",
            detail={"run_id": run.id, "cursor_url": run.cursor_agent_url},
        )
        notify_founder(
            db,
            command_id=command.id,
            kind="dispatch",
            title="Agent dispatched",
            body="Cursor Agent linked in Command Center — no copy-paste needed.",
            links=_links(command),
        )
        write_founder_audit(
            db,
            command_id=command.id,
            event_type="dispatched",
            actor_fingerprint=actor_fingerprint,
            detail={"run_id": run.id},
        )
        db.commit()
        return command
    except Exception as exc:
        logger.exception("founder command dispatch failed")
        command.stage_retry_count = retries + 1
        command.consecutive_failures = (command.consecutive_failures or 0) + 1
        if command.stage_retry_count > max_retries:
            command.status = CommandStatus.FAILED.value
            command.error_code = "dispatch_failed"
            command.error_message = str(exc)[:500]
        db.commit()
        return command


def _stage_await_agent(
    db: Session, settings: Settings, command: FounderCommand
) -> FounderCommand:
    from app.database.models import AgentDispatchRun

    run = db.get(AgentDispatchRun, command.dispatch_run_id) if command.dispatch_run_id else None
    if not run:
        command.status = CommandStatus.FAILED.value
        command.error_code = "missing_run"
        db.commit()
        return command
    try:
        reconcile_run(db, settings, run.id)
        db.refresh(run)
    except Exception:
        logger.exception("reconcile during founder await")

    if run.cursor_agent_url:
        _set_links(command, {"cursor_agent": run.cursor_agent_url})
    if run.result_pr_url:
        _set_links(command, {"pull_request": run.result_pr_url})

    if run.status not in DISPATCH_RUN_TERMINAL and run.status != DispatchRunStatus.NEEDS_ATTENTION.value:
        command.live_summary = f"Agent running ({run.status})"
        live = build_live_summary(command, resolve_project_state(db, settings))
        command.live_summary = live.get("headline") or command.live_summary
        db.commit()
        return command

    if run.status == DispatchRunStatus.SUCCEEDED.value:
        command.consecutive_failures = 0
        command.current_stage = CommandStage.OPERATOR.value
        command.live_summary = "Agent succeeded — operator / handoff"
    else:
        command.consecutive_failures = (command.consecutive_failures or 0) + 1
        command.current_stage = CommandStage.REPORT_HANDOFF.value
        command.live_summary = f"Agent ended: {run.status}"
    _append_timeline(
        db,
        command,
        stage=CommandStage.AWAIT_AGENT.value,
        message=command.live_summary or "agent terminal",
        detail={"run_status": run.status, "pr": run.result_pr_url},
    )
    db.commit()
    return command


def _stage_report(
    db: Session, settings: Settings, command: FounderCommand, state: dict[str, Any]
) -> FounderCommand:
    from app.database.models import AgentDispatchRun

    run = db.get(AgentDispatchRun, command.dispatch_run_id) if command.dispatch_run_id else None
    summary_bits = [
        f"Batch {command.batch_index + 1}/{command.max_batches or '?'}",
        f"Dispatch: {run.status if run else 'n/a'}",
    ]
    if run and run.result_summary:
        summary_bits.append((run.result_summary or "")[:280])
    command.live_summary = " · ".join(summary_bits)
    if run and run.result_pr_url:
        _set_links(command, {"pull_request": run.result_pr_url})
    if run and run.cursor_agent_url:
        _set_links(command, {"cursor_agent": run.cursor_agent_url})
    _set_links(
        command,
        {
            "actions": "https://github.com/CzechowskiT/twin/actions",
            "vercel": "https://twin-sooty.vercel.app",
            "railway_api": "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1",
        },
    )
    command.current_stage = CommandStage.CONTINUE_OR_APPROVE.value
    _append_timeline(db, command, stage=CommandStage.REPORT_HANDOFF.value, message="Report/handoff ready")
    notify_founder(
        db,
        command_id=command.id,
        kind="handoff",
        title="Batch handoff ready",
        body=command.live_summary,
        links=_links(command),
    )
    db.commit()
    return command


def _stage_continue(
    db: Session,
    settings: Settings,
    command: FounderCommand,
    state: dict[str, Any],
    plan: dict[str, Any],
) -> FounderCommand:
    mode = plan.get("execution_mode")
    can_continue = mode in {"continuous", "deploy", "build"} and command.autonomy_level >= 3
    ok, reason = _limits_ok(command, state)
    if can_continue and ok and command.batch_index + 1 < (command.max_batches or 1):
        command.batch_index = command.batch_index + 1
        command.dispatch_run_id = None
        command.stage_retry_count = 0
        command.status = CommandStatus.CONTINUING.value
        command.current_stage = CommandStage.DISPATCH.value
        command.live_summary = f"Auto-continuing batch {command.batch_index + 1}"
        _append_timeline(db, command, stage=CommandStage.CONTINUE_OR_APPROVE.value, message=command.live_summary)
        db.commit()
        return command

    command.current_stage = CommandStage.FINALIZE.value
    if not ok:
        command.live_summary = f"Finalize after limit: {reason}"
    else:
        command.live_summary = "Finalize — no further auto batches"
    db.commit()
    return command


def list_active_command_ids(db: Session) -> list[str]:
    from sqlalchemy import select

    return list(
        db.execute(
            select(FounderCommand.id).where(
                FounderCommand.status.in_(
                    list(
                        ACTIVE_COMMAND_STATUSES
                        - {CommandStatus.PAUSED.value, CommandStatus.AWAITING_APPROVAL.value}
                    )
                )
            )
        )
        .scalars()
        .all()
    )
