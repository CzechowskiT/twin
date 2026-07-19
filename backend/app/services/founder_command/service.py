"""Founder Command Center orchestration service."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import (
    FounderCommand,
    FounderCommandTimelineEvent,
    FounderDecision,
)
from app.services.founder_command.approval_policy import (
    evaluate_plan_approvals,
    resolve_decision,
)
from app.services.founder_command.audit import write_founder_audit
from app.services.founder_command.auth import FounderPrincipal
from app.services.founder_command.constants import (
    COMMAND_TERMINAL,
    CommandStage,
    CommandStatus,
    DEFAULT_AUTONOMY_LEVEL,
    DEFAULT_MAX_ACTIVE_RUNS,
    DEFAULT_MAX_CONSECUTIVE_FAILURES,
    DEFAULT_MAX_OPEN_PRS,
    DEFAULT_MAX_RETRIES_PER_STAGE,
    AutonomyLevel,
)
from app.services.founder_command.execution_loop import tick_command
from app.services.founder_command.notifications import list_notifications, notify_founder
from app.services.founder_command.planner import plan_from_command
from app.services.founder_command.state_resolver import resolve_project_state
from app.services.founder_command.summaries import build_final_summary, build_live_summary


def _timeline_dict(row: FounderCommandTimelineEvent) -> dict[str, Any]:
    try:
        detail = json.loads(row.detail_json or "{}")
    except json.JSONDecodeError:
        detail = {}
    return {
        "id": row.id,
        "stage": row.stage,
        "message": row.message,
        "detail": detail,
        "created_at": row.created_at.isoformat() + "Z" if row.created_at else None,
    }


def command_to_public(db: Session, command: FounderCommand, settings: Settings) -> dict[str, Any]:
    state = None
    try:
        state = json.loads(command.project_state_json or "null")
    except json.JSONDecodeError:
        state = None
    if not state:
        state = resolve_project_state(db, settings)
    try:
        plan = json.loads(command.plan_json or "{}")
    except json.JSONDecodeError:
        plan = {}
    try:
        links = json.loads(command.links_json or "{}")
    except json.JSONDecodeError:
        links = {}
    timeline = (
        db.execute(
            select(FounderCommandTimelineEvent)
            .where(FounderCommandTimelineEvent.command_id == command.id)
            .order_by(FounderCommandTimelineEvent.created_at.asc())
            .limit(200)
        )
        .scalars()
        .all()
    )
    pending = (
        db.execute(
            select(FounderDecision)
            .where(
                FounderDecision.command_id == command.id,
                FounderDecision.status == "pending",
            )
            .order_by(FounderDecision.created_at.desc())
        )
        .scalars()
        .all()
    )
    live = build_live_summary(command, state)
    final = None
    if command.status in COMMAND_TERMINAL or command.final_summary:
        final = build_final_summary(command, project_state=state)
    # Never expose product_agent_prompt body in list payloads — hash only in public.
    plan_public = {k: v for k, v in plan.items() if k != "product_agent_prompt"}
    plan_public["product_agent_prompt_present"] = bool(plan.get("product_agent_prompt"))
    return {
        "id": command.id,
        "status": command.status,
        "current_stage": command.current_stage,
        "direction": command.direction,
        "autonomy_level": command.autonomy_level,
        "batch_index": command.batch_index,
        "limits": {
            "max_batches": command.max_batches,
            "max_runtime_minutes": command.max_runtime_minutes,
            "max_consecutive_failures": command.max_consecutive_failures,
            "max_retries_per_stage": command.max_retries_per_stage,
            "max_open_prs": command.max_open_prs,
            "max_active_runs": command.max_active_runs,
        },
        "dispatch_run_id": command.dispatch_run_id,
        "plan": plan_public,
        "project_state": state,
        "live_summary": live,
        "final_summary": final,
        "links": links,
        "timeline": [_timeline_dict(t) for t in timeline],
        "pending_decisions": [
            {
                "decision_id": d.id,
                "operation": d.operation,
                "risk": d.risk,
                "title": d.title,
                "expires_at": d.expires_at.isoformat() + "Z" if d.expires_at else None,
            }
            for d in pending
        ],
        "notifications": list_notifications(db, command_id=command.id, limit=20),
        "error_code": command.error_code,
        "error_message": command.error_message,
        "created_at": command.created_at.isoformat() + "Z" if command.created_at else None,
        "updated_at": command.updated_at.isoformat() + "Z" if command.updated_at else None,
        "started_at": command.started_at.isoformat() + "Z" if command.started_at else None,
        "finished_at": command.finished_at.isoformat() + "Z" if command.finished_at else None,
    }


def create_command(
    db: Session,
    settings: Settings,
    principal: FounderPrincipal,
    *,
    direction: str,
    action: str = "start",
    autonomy_level: int | None = None,
    max_batches: int | None = None,
    max_runtime_minutes: int | None = None,
    idempotency_key: str | None = None,
) -> FounderCommand:
    if idempotency_key:
        existing = db.execute(
            select(FounderCommand).where(FounderCommand.idempotency_key == idempotency_key)
        ).scalar_one_or_none()
        if existing:
            return existing

    level = int(autonomy_level or settings.founder_command_default_autonomy_level or DEFAULT_AUTONOMY_LEVEL)
    if level < 1 or level > 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="autonomy_level must be 1..4")
    if level >= AutonomyLevel.CONTINUOUS.value and (
        not max_batches or not max_runtime_minutes
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Level 4 requires max_batches and max_runtime_minutes",
        )

    state = resolve_project_state(db, settings)
    try:
        plan = plan_from_command(
            command_text=direction,
            project_state=state,
            autonomy_level=level,
            max_batches=max_batches,
            max_runtime_minutes=max_runtime_minutes,
            action=action,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    command = FounderCommand(
        id=str(uuid.uuid4()),
        status=CommandStatus.ANALYZING.value,
        current_stage=CommandStage.RESOLVE_STATE.value,
        direction=direction.strip()[:8000],
        autonomy_level=level,
        batch_index=0,
        max_batches=int(plan["limits"]["max_batches"]),
        max_runtime_minutes=int(plan["limits"]["max_runtime_minutes"]),
        max_consecutive_failures=DEFAULT_MAX_CONSECUTIVE_FAILURES,
        max_retries_per_stage=DEFAULT_MAX_RETRIES_PER_STAGE,
        max_open_prs=DEFAULT_MAX_OPEN_PRS,
        max_active_runs=DEFAULT_MAX_ACTIVE_RUNS,
        plan_json=json.dumps(plan, separators=(",", ":"), sort_keys=True),
        plan_hash=plan.get("product_agent_prompt_hash"),
        project_state_json=json.dumps(state, separators=(",", ":"), sort_keys=True),
        links_json="{}",
        live_summary=plan.get("batch_objective"),
        idempotency_key=idempotency_key,
        created_by_fingerprint=principal.fingerprint,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(command)
    db.flush()

    approval = evaluate_plan_approvals(
        db,
        command_id=command.id,
        plan=plan,
        actor_fingerprint=principal.fingerprint,
    )
    db.add(
        FounderCommandTimelineEvent(
            id=str(uuid.uuid4()),
            command_id=command.id,
            stage=CommandStage.PLAN.value,
            message="Autonomous plan generated (Product Agent prompt auto-built)",
            detail_json=json.dumps(
                {"plan_hash": command.plan_hash, "mode": plan.get("execution_mode")},
                separators=(",", ":"),
            ),
            created_at=datetime.utcnow(),
        )
    )
    if approval["blocked"]:
        command.status = CommandStatus.AWAITING_APPROVAL.value
        command.current_stage = CommandStage.APPROVAL_POLICY.value
        command.live_summary = "Founder approval required before dispatch"
        notify_founder(
            db,
            command_id=command.id,
            kind="decision",
            title="Approval needed",
            body=command.live_summary,
            links={"founder_command": f"/admin/founder-command?id={command.id}"},
        )
    elif action == "analyze":
        command.status = CommandStatus.SUCCEEDED.value
        command.current_stage = CommandStage.FINALIZE.value
        command.finished_at = datetime.utcnow()
        command.live_summary = plan.get("batch_objective") or "Analysis complete"
        command.final_summary = (
            "Analysis ready. Product Agent prompt was auto-generated — start when you want execution."
        )
        command.links_json = json.dumps(
            {
                "founder_command": f"/admin/founder-command?id={command.id}",
                "actions": "https://github.com/CzechowskiT/twin/actions",
                "vercel": "https://twin-sooty.vercel.app",
                "railway_api": "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1",
            },
            separators=(",", ":"),
        )
    else:
        command.status = CommandStatus.QUEUED.value
        command.current_stage = CommandStage.RESOLVE_STATE.value
        # Kick first ticks synchronously for snappy UI; Celery continues.
        for _ in range(4):
            tick_command(db, settings, command.id, actor_fingerprint=principal.fingerprint)
            db.refresh(command)
            if command.status in COMMAND_TERMINAL | {
                CommandStatus.AWAITING_APPROVAL.value,
                CommandStatus.RUNNING.value,
                CommandStatus.NEEDS_FOUNDER.value,
            }:
                if command.current_stage in {
                    CommandStage.AWAIT_AGENT.value,
                    CommandStage.OPERATOR.value,
                    CommandStage.REPORT_HANDOFF.value,
                }:
                    break

    write_founder_audit(
        db,
        command_id=command.id,
        event_type="command_created",
        actor_fingerprint=principal.fingerprint,
        detail={"action": action, "autonomy_level": level, "blocked": approval["blocked"]},
    )
    db.commit()
    db.refresh(command)

    if (
        action != "analyze"
        and not approval["blocked"]
        and command.status not in {
            CommandStatus.AWAITING_APPROVAL.value,
            *COMMAND_TERMINAL,
        }
    ):
        try:
            from app.tasks.founder_command_tasks import tick_founder_command

            tick_founder_command.delay(command.id)
        except Exception:
            pass
    return command


def pause_command(db: Session, command_id: str, principal: FounderPrincipal) -> FounderCommand:
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    if command.status in COMMAND_TERMINAL:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="command_terminal")
    command.status = CommandStatus.PAUSED.value
    command.live_summary = "Paused by founder"
    write_founder_audit(
        db,
        command_id=command.id,
        event_type="paused",
        actor_fingerprint=principal.fingerprint,
        detail={},
    )
    db.commit()
    return command


def resume_command(
    db: Session, settings: Settings, command_id: str, principal: FounderPrincipal
) -> FounderCommand:
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    if command.status != CommandStatus.PAUSED.value:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="not_paused")
    command.status = CommandStatus.QUEUED.value
    command.current_stage = command.current_stage or CommandStage.DISPATCH.value
    write_founder_audit(
        db,
        command_id=command.id,
        event_type="resumed",
        actor_fingerprint=principal.fingerprint,
        detail={},
    )
    db.commit()
    try:
        from app.tasks.founder_command_tasks import tick_founder_command

        tick_founder_command.delay(command.id)
    except Exception:
        tick_command(db, settings, command.id, actor_fingerprint=principal.fingerprint)
    return command


def cancel_command(db: Session, command_id: str, principal: FounderPrincipal) -> FounderCommand:
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    command.status = CommandStatus.CANCELLED.value
    command.finished_at = datetime.utcnow()
    command.live_summary = "Cancelled by founder"
    write_founder_audit(
        db,
        command_id=command.id,
        event_type="cancelled",
        actor_fingerprint=principal.fingerprint,
        detail={},
    )
    db.commit()
    return command


def change_direction(
    db: Session,
    settings: Settings,
    command_id: str,
    principal: FounderPrincipal,
    *,
    direction: str,
) -> FounderCommand:
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    if command.status in COMMAND_TERMINAL:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="command_terminal")
    command.direction = direction.strip()[:8000]
    state = resolve_project_state(db, settings)
    plan = plan_from_command(
        command_text=command.direction,
        project_state=state,
        autonomy_level=command.autonomy_level,
        max_batches=command.max_batches,
        max_runtime_minutes=command.max_runtime_minutes,
        action="start",
    )
    command.plan_json = json.dumps(plan, separators=(",", ":"), sort_keys=True)
    command.plan_hash = plan.get("product_agent_prompt_hash")
    command.status = CommandStatus.QUEUED.value
    command.current_stage = CommandStage.APPROVAL_POLICY.value
    evaluate_plan_approvals(
        db, command_id=command.id, plan=plan, actor_fingerprint=principal.fingerprint
    )
    write_founder_audit(
        db,
        command_id=command.id,
        event_type="direction_changed",
        actor_fingerprint=principal.fingerprint,
        detail={"plan_hash": command.plan_hash},
    )
    db.commit()
    return command


def continue_command(
    db: Session, settings: Settings, command_id: str, principal: FounderPrincipal
) -> FounderCommand:
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    if command.status == CommandStatus.PAUSED.value:
        return resume_command(db, settings, command_id, principal)
    if command.current_stage != CommandStage.CONTINUE_OR_APPROVE.value and command.status not in {
        CommandStatus.NEEDS_FOUNDER.value,
        CommandStatus.SUCCEEDED.value,
    }:
        tick_command(db, settings, command.id, actor_fingerprint=principal.fingerprint)
        return db.get(FounderCommand, command_id)  # type: ignore[return-value]
    # Force another batch within caps
    if command.batch_index + 1 >= (command.max_batches or 1):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="max_batches_reached")
    command.batch_index += 1
    command.dispatch_run_id = None
    command.status = CommandStatus.CONTINUING.value
    command.current_stage = CommandStage.DISPATCH.value
    db.commit()
    tick_command(db, settings, command.id, actor_fingerprint=principal.fingerprint)
    return db.get(FounderCommand, command_id)  # type: ignore[return-value]


def approve_decision(
    db: Session,
    settings: Settings,
    *,
    decision_id: str,
    approve: bool,
    principal: FounderPrincipal,
    note: str | None = None,
) -> dict[str, Any]:
    try:
        row = resolve_decision(
            db,
            decision_id=decision_id,
            approve=approve,
            actor_fingerprint=principal.fingerprint,
            note=note,
        )
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    write_founder_audit(
        db,
        command_id=row.command_id,
        event_type="decision_resolved",
        actor_fingerprint=principal.fingerprint,
        detail={"decision_id": row.id, "status": row.status},
    )
    if approve and row.command_id:
        cmd = db.get(FounderCommand, row.command_id)
        if cmd and cmd.status == CommandStatus.AWAITING_APPROVAL.value:
            # If no more pending, resume
            from app.services.founder_command.approval_policy import command_has_blocking_pending

            if not command_has_blocking_pending(db, cmd.id):
                cmd.status = CommandStatus.QUEUED.value
                cmd.current_stage = CommandStage.DISPATCH.value
                db.commit()
                tick_command(db, settings, cmd.id, actor_fingerprint=principal.fingerprint)
            else:
                db.commit()
        else:
            db.commit()
    else:
        if not approve and row.command_id:
            cmd = db.get(FounderCommand, row.command_id)
            if cmd:
                cmd.status = CommandStatus.CANCELLED.value
                cmd.live_summary = "Rejected by founder"
                cmd.finished_at = datetime.utcnow()
        db.commit()
    return {
        "decision_id": row.id,
        "status": row.status,
        "command_id": row.command_id,
    }
