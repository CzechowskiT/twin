"""Founder Command Center HTTP API — /api/v1/founder-command/*."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.database.models import FounderCommand, FounderDecision
from app.limiter import limiter
from app.schemas.founder_command import (
    ChangeDirectionRequest,
    CreateFounderCommandRequest,
    DecisionResolveRequest,
)
from app.services.founder_command.auth import (
    FounderPrincipal,
    issue_csrf_token,
    require_csrf_header,
    require_founder,
)
from app.services.founder_command.notifications import (
    NOTIFICATION_CHANNEL_ARCHITECTURE,
    list_notifications,
    mark_notification_read,
)
from app.services.founder_command.service import (
    approve_decision,
    cancel_command,
    change_direction,
    command_to_public,
    continue_command,
    create_command,
    pause_command,
    resume_command,
)
from app.services.founder_command.state_resolver import resolve_project_state

router = APIRouter()


@router.get("/csrf")
@limiter.limit("30/minute")
def founder_csrf(
    request: Request,
    principal: Annotated[FounderPrincipal, Depends(require_founder)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    return {"csrf_token": issue_csrf_token(settings, principal)}


@router.get("/state")
@limiter.limit("60/minute")
def founder_project_state(
    request: Request,
    principal: Annotated[FounderPrincipal, Depends(require_founder)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    return resolve_project_state(db, settings)


@router.get("/decisions/pending")
@limiter.limit("60/minute")
def founder_pending_decisions(
    request: Request,
    principal: Annotated[FounderPrincipal, Depends(require_founder)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    rows = (
        db.execute(
            select(FounderDecision)
            .where(FounderDecision.status == "pending")
            .order_by(FounderDecision.created_at.desc())
            .limit(50)
        )
        .scalars()
        .all()
    )
    return {
        "items": [
            {
                "decision_id": d.id,
                "command_id": d.command_id,
                "operation": d.operation,
                "risk": d.risk,
                "title": d.title,
                "expires_at": d.expires_at.isoformat() + "Z" if d.expires_at else None,
            }
            for d in rows
        ]
    }


@router.get("/notifications")
@limiter.limit("60/minute")
def founder_notifications(
    request: Request,
    principal: Annotated[FounderPrincipal, Depends(require_founder)],
    db: Session = Depends(get_db),
    unread_only: bool = False,
) -> dict[str, Any]:
    _ = principal
    return {
        "items": list_notifications(db, unread_only=unread_only),
        "channels": NOTIFICATION_CHANNEL_ARCHITECTURE,
    }


@router.post("/notifications/{notification_id}/read")
@limiter.limit("60/minute")
def founder_notification_read(
    request: Request,
    notification_id: str,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    ok = mark_notification_read(db, notification_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="notification_not_found")
    db.commit()
    return {"ok": True}


@router.post("/commands")
@limiter.limit("20/minute")
def founder_create_command(
    request: Request,
    body: CreateFounderCommandRequest,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> dict[str, Any]:
    if not settings.founder_command_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Founder Command disabled")
    key = body.idempotency_key or idempotency_key
    command = create_command(
        db,
        settings,
        principal,
        direction=body.direction,
        action=body.action,
        autonomy_level=body.autonomy_level,
        max_batches=body.max_batches,
        max_runtime_minutes=body.max_runtime_minutes,
        idempotency_key=key,
        explicit_execution_mode=body.execution_mode,
        explicit_execution_contract=body.execution_contract,
    )
    return command_to_public(db, command, settings)


@router.get("/commands")
@limiter.limit("60/minute")
def founder_list_commands(
    request: Request,
    principal: Annotated[FounderPrincipal, Depends(require_founder)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
    limit: int = 20,
) -> dict[str, Any]:
    _ = principal
    rows = (
        db.execute(
            select(FounderCommand)
            .order_by(FounderCommand.created_at.desc())
            .limit(min(100, max(1, limit)))
        )
        .scalars()
        .all()
    )
    return {"items": [command_to_public(db, c, settings) for c in rows]}


@router.get("/commands/{command_id}")
@limiter.limit("120/minute")
def founder_get_command(
    request: Request,
    command_id: str,
    principal: Annotated[FounderPrincipal, Depends(require_founder)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    return command_to_public(db, command, settings)


@router.get("/commands/{command_id}/timeline")
@limiter.limit("60/minute")
def founder_command_timeline(
    request: Request,
    command_id: str,
    principal: Annotated[FounderPrincipal, Depends(require_founder)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    public = command_to_public(db, command, settings)
    return {"command_id": command_id, "timeline": public["timeline"]}


@router.post("/commands/{command_id}/approve")
@limiter.limit("30/minute")
def founder_approve_command(
    request: Request,
    command_id: str,
    body: DecisionResolveRequest,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Approve all pending decisions on a command (or reject)."""
    rows = (
        db.execute(
            select(FounderDecision).where(
                FounderDecision.command_id == command_id,
                FounderDecision.status == "pending",
            )
        )
        .scalars()
        .all()
    )
    if not rows:
        command = db.get(FounderCommand, command_id)
        if not command:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
        return command_to_public(db, command, settings)
    last: dict[str, Any] = {}
    for row in rows:
        last = approve_decision(
            db,
            settings,
            decision_id=row.id,
            approve=body.approve,
            principal=principal,
            note=body.note,
        )
    command = db.get(FounderCommand, command_id)
    return {"decision": last, "command": command_to_public(db, command, settings) if command else None}


@router.post("/decisions/{decision_id}/resolve")
@limiter.limit("30/minute")
def founder_resolve_decision(
    request: Request,
    decision_id: str,
    body: DecisionResolveRequest,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return approve_decision(
        db,
        settings,
        decision_id=decision_id,
        approve=body.approve,
        principal=principal,
        note=body.note,
    )


@router.post("/commands/{command_id}/pause")
@limiter.limit("30/minute")
def founder_pause(
    request: Request,
    command_id: str,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = pause_command(db, command_id, principal)
    return command_to_public(db, command, settings)


@router.post("/commands/{command_id}/resume")
@limiter.limit("30/minute")
def founder_resume(
    request: Request,
    command_id: str,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = resume_command(db, settings, command_id, principal)
    return command_to_public(db, command, settings)


@router.post("/commands/{command_id}/cancel")
@limiter.limit("30/minute")
def founder_cancel(
    request: Request,
    command_id: str,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = cancel_command(db, command_id, principal)
    return command_to_public(db, command, settings)


@router.post("/commands/{command_id}/continue")
@limiter.limit("30/minute")
def founder_continue(
    request: Request,
    command_id: str,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = continue_command(db, settings, command_id, principal)
    return command_to_public(db, command, settings)


@router.post("/commands/{command_id}/change-direction")
@limiter.limit("20/minute")
def founder_change_direction(
    request: Request,
    command_id: str,
    body: ChangeDirectionRequest,
    principal: Annotated[FounderPrincipal, Depends(require_csrf_header)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = change_direction(
        db, settings, command_id, principal, direction=body.direction
    )
    return command_to_public(db, command, settings)
