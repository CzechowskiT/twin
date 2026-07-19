"""Custom GPT Actions API — /api/v1/chatgpt/twin/* (thin Founder Command surface)."""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.database.models import FounderCommand, FounderDecision
from app.limiter import limiter
from app.schemas.chatgpt_twin import (
    CancelTwinCommandRequest,
    ChangeTwinDirectionRequest,
    CreateTwinCommandRequest,
    DecisionNoteRequest,
    ModifyTwinDecisionRequest,
)
from app.services.agent_dispatch.oauth_as import public_api_base
from app.services.chatgpt_twin.auth import ChatGptTwinPrincipal, require_chatgpt_twin
from app.services.chatgpt_twin.openapi import openapi_to_minimal_yaml, twin_product_operator_openapi
from app.services.chatgpt_twin.redaction import (
    command_links,
    redact_command,
    redact_command_result,
    redact_project_state,
)
from app.services.founder_command import service as fc
from app.services.founder_command.audit import write_founder_audit
from app.services.founder_command.constants import DEFAULT_BASE_BRANCH, DEFAULT_REPO_URL
from app.services.founder_command.state_resolver import resolve_project_state

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

ALLOWED_APPROVAL_POLICIES = frozenset(
    {
        "founder_decisions_and_high_risk_only",
        "always_ask",
        "auto_safe_only",
    }
)


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _enforce_allowlist(settings: Settings) -> None:
    repo = (settings.agent_dispatch_repo_allowlist or "").strip()
    branch = (settings.agent_dispatch_base_branch_allowlist or "").strip()
    if DEFAULT_REPO_URL.rstrip("/") not in repo.replace("git@github.com:", "https://github.com/"):
        # Allow if allowlist empty (dev) or explicitly includes twin.
        if repo and "CzechowskiT/twin" not in repo:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="repo_not_allowlisted",
            )
    if branch and DEFAULT_BASE_BRANCH not in {b.strip() for b in branch.split(",")}:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="base_branch_not_allowlisted",
        )


def _public_cmd(
    db: Session,
    command: FounderCommand,
    settings: Settings,
    *,
    include_timeline: bool = False,
) -> dict[str, Any]:
    return redact_command(
        fc.command_to_public(db, command, settings),
        include_timeline=include_timeline,
    )


@router.get("/openapi.json", include_in_schema=False)
@limiter.limit("30/minute")
def twin_openapi_json(request: Request, settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    """Public OpenAPI for GPT Actions import (no secrets in examples)."""
    return twin_product_operator_openapi(settings, str(request.base_url).rstrip("/"))


@router.get("/openapi.yaml", include_in_schema=False)
@limiter.limit("30/minute")
def twin_openapi_yaml(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> PlainTextResponse:
    doc = twin_product_operator_openapi(settings, str(request.base_url).rstrip("/"))
    return PlainTextResponse(openapi_to_minimal_yaml(doc), media_type="application/yaml")


@router.get("/setup", include_in_schema=False)
@limiter.limit("30/minute")
def twin_setup_hint(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> dict[str, Any]:
    base = public_api_base(settings, str(request.base_url).rstrip("/"))
    return {
        "product": "TWIN Product Operator",
        "auth": "Authorization: Bearer <CHATGPT_TWIN_ACTIONS_API_KEY>",
        "openapi": f"{base}/api/v1/chatgpt/twin/openapi.json",
        "privacy_policy": settings.chatgpt_twin_privacy_policy_url,
        "docs": {
            "instructions": "docs/chatgpt/twin-product-operator-instructions.md",
            "setup": "docs/chatgpt/setup-twin-product-operator.md",
        },
        "keep_private": True,
        "not_mcp": True,
    }


@router.get("/state", operation_id="getTwinProjectState")
@limiter.limit("60/minute")
def get_twin_project_state(
    request: Request,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _enforce_allowlist(settings)
    state = redact_project_state(resolve_project_state(db, settings))
    write_founder_audit(
        db,
        command_id=None,
        event_type="chatgpt_twin_state_read",
        actor_fingerprint=principal.fingerprint,
        detail={"correlation_id": _correlation(request)},
    )
    db.commit()
    return {
        "state": state,
        "correlation_id": _correlation(request),
        "auth_fingerprint": principal.fingerprint,
    }


@router.post("/commands", operation_id="createTwinCommand", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("20/minute")
def create_twin_command(
    request: Request,
    body: CreateTwinCommandRequest,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    response: Response,
    db: Session = Depends(get_db),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> dict[str, Any]:
    if not settings.founder_command_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Founder Command disabled")
    _enforce_allowlist(settings)
    if body.approval_policy not in ALLOWED_APPROVAL_POLICIES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_approval_policy")

    key = body.idempotency_key or idempotency_key
    autonomy = body.autonomy_level
    if autonomy is None:
        autonomy = int(settings.chatgpt_twin_default_autonomy_level or 3)
    max_batches = body.max_batches
    if max_batches is None:
        max_batches = int(settings.chatgpt_twin_default_max_batches or 5)
    max_runtime = body.max_runtime_minutes
    if max_runtime is None:
        max_runtime = int(settings.chatgpt_twin_default_max_runtime_minutes or 360)

    # always_ask → keep autonomy but FCC approval policy already gates high-risk;
    # bump analysis-only when caller asks analyze.
    action = body.action
    if body.approval_policy == "always_ask" and action == "start":
        # Force approval path by treating as deploy-capable with founder gate (autonomy ≥3).
        autonomy = max(autonomy, 3)

    command = fc.create_command(
        db,
        settings,
        principal.as_founder(),
        direction=body.direction,
        action=action,
        autonomy_level=autonomy,
        max_batches=max_batches,
        max_runtime_minutes=max_runtime,
        idempotency_key=key,
        sync_ticks=0,
    )
    base = public_api_base(settings, str(request.base_url).rstrip("/"))
    links = command_links(command.id, base)
    redacted = _public_cmd(db, command, settings)
    decision_id = None
    if redacted.get("pending_decisions"):
        decision_id = redacted["pending_decisions"][0].get("decision_id")

    payload = {
        "command_id": command.id,
        "status": command.status,
        "current_stage": command.current_stage,
        "accepted": True,
        "async": True,
        "approval_required": bool(redacted.get("approval_required")),
        "decision_id": decision_id,
        "links": links,
        "command": redacted,
        "defaults_applied": {
            "autonomy_level": autonomy,
            "max_batches": max_batches,
            "max_runtime_minutes": max_runtime,
            "approval_policy": body.approval_policy,
        },
        "correlation_id": _correlation(request),
        "auth_fingerprint": principal.fingerprint,
        "message": (
            "Command accepted. Poll links.self or links.result; "
            "Product Agent / Dispatcher / Operator continue inside TWIN after GPT disconnects."
        ),
    }
    # 201 when analysis finished inline; 202 when durable loop continues.
    code = (
        status.HTTP_201_CREATED
        if command.status in {"succeeded", "awaiting_approval", "cancelled", "failed"}
        else status.HTTP_202_ACCEPTED
    )
    response.status_code = code
    return payload


@router.get("/commands/latest", operation_id="getLatestTwinCommand")
@limiter.limit("60/minute")
def get_latest_twin_command(
    request: Request,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    row = (
        db.execute(select(FounderCommand).order_by(FounderCommand.created_at.desc()).limit(1))
        .scalars()
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no_commands")
    base = public_api_base(settings, str(request.base_url).rstrip("/"))
    return {
        "command": _public_cmd(db, row, settings, include_timeline=True),
        "links": command_links(row.id, base),
        "correlation_id": _correlation(request),
    }


@router.get("/commands/{command_id}", operation_id="getTwinCommand")
@limiter.limit("120/minute")
def get_twin_command(
    request: Request,
    command_id: str,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    base = public_api_base(settings, str(request.base_url).rstrip("/"))
    return {
        "command": _public_cmd(db, command, settings, include_timeline=True),
        "links": command_links(command.id, base),
        "correlation_id": _correlation(request),
    }


@router.get("/commands/{command_id}/result", operation_id="getTwinCommandResult")
@limiter.limit("120/minute")
def get_twin_command_result(
    request: Request,
    command_id: str,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _ = principal
    command = db.get(FounderCommand, command_id)
    if not command:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="command_not_found")
    public = fc.command_to_public(db, command, settings)
    result = redact_command_result(public)
    result["correlation_id"] = _correlation(request)
    result["links"] = command_links(command.id, public_api_base(settings, str(request.base_url).rstrip("/")))
    return result


@router.get("/decisions/pending", operation_id="getPendingTwinDecisions")
@limiter.limit("60/minute")
def get_pending_twin_decisions(
    request: Request,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
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
        ],
        "correlation_id": _correlation(request),
    }


@router.post("/decisions/{decision_id}/approve", operation_id="approveTwinDecision")
@limiter.limit("30/minute")
def approve_twin_decision(
    request: Request,
    decision_id: str,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
    body: DecisionNoteRequest | None = None,
) -> dict[str, Any]:
    note = body.note if body else None
    result = fc.approve_decision(
        db,
        settings,
        decision_id=decision_id,
        approve=True,
        principal=principal.as_founder(),
        note=note,
    )
    result["correlation_id"] = _correlation(request)
    return result


@router.post("/decisions/{decision_id}/reject", operation_id="rejectTwinDecision")
@limiter.limit("30/minute")
def reject_twin_decision(
    request: Request,
    decision_id: str,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
    body: DecisionNoteRequest | None = None,
) -> dict[str, Any]:
    note = body.note if body else None
    result = fc.approve_decision(
        db,
        settings,
        decision_id=decision_id,
        approve=False,
        principal=principal.as_founder(),
        note=note,
    )
    result["correlation_id"] = _correlation(request)
    return result


@router.post("/decisions/{decision_id}/modify", operation_id="modifyTwinDecision")
@limiter.limit("20/minute")
def modify_twin_decision(
    request: Request,
    decision_id: str,
    body: ModifyTwinDecisionRequest,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    decision = db.get(FounderDecision, decision_id)
    if not decision:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="decision_not_found")
    if not decision.command_id:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="decision_missing_command")
    fc.change_direction(
        db,
        settings,
        decision.command_id,
        principal.as_founder(),
        direction=body.modification,
    )
    # Re-fetch decision — change_direction may have created new pending decisions.
    # Approve the original if still pending; otherwise report modified.
    decision = db.get(FounderDecision, decision_id)
    if decision and decision.status == "pending":
        result = fc.approve_decision(
            db,
            settings,
            decision_id=decision_id,
            approve=True,
            principal=principal.as_founder(),
            note=body.note or f"Modified: {body.modification[:200]}",
        )
    else:
        result = {
            "decision_id": decision_id,
            "status": decision.status if decision else "superseded",
            "command_id": decision.command_id if decision else None,
        }
    result["modification_applied"] = True
    result["correlation_id"] = _correlation(request)
    return result


@router.post("/commands/{command_id}/pause", operation_id="pauseTwinCommand")
@limiter.limit("30/minute")
def pause_twin_command(
    request: Request,
    command_id: str,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = fc.pause_command(db, command_id, principal.as_founder())
    return {
        "command": _public_cmd(db, command, settings),
        "correlation_id": _correlation(request),
    }


@router.post("/commands/{command_id}/resume", operation_id="resumeTwinCommand")
@limiter.limit("30/minute")
def resume_twin_command(
    request: Request,
    command_id: str,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = fc.resume_command(db, settings, command_id, principal.as_founder())
    return {
        "command": _public_cmd(db, command, settings),
        "correlation_id": _correlation(request),
    }


@router.post("/commands/{command_id}/cancel", operation_id="cancelTwinCommand")
@limiter.limit("20/minute")
def cancel_twin_command(
    request: Request,
    command_id: str,
    body: CancelTwinCommandRequest,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if body.confirmation is not True:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="confirmation_must_be_true",
        )
    command = fc.cancel_command(
        db, command_id, principal.as_founder(), reason=body.reason
    )
    return {
        "command": _public_cmd(db, command, settings),
        "correlation_id": _correlation(request),
    }


@router.post("/commands/{command_id}/direction", operation_id="changeTwinCommandDirection")
@limiter.limit("20/minute")
def change_twin_command_direction(
    request: Request,
    command_id: str,
    body: ChangeTwinDirectionRequest,
    principal: Annotated[ChatGptTwinPrincipal, Depends(require_chatgpt_twin)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    command = fc.change_direction(
        db, settings, command_id, principal.as_founder(), direction=body.direction
    )
    redacted = _public_cmd(db, command, settings)
    return {
        "command": redacted,
        "approval_required": bool(redacted.get("approval_required")),
        "decision_id": (redacted.get("pending_decisions") or [{}])[0].get("decision_id")
        if redacted.get("pending_decisions")
        else None,
        "correlation_id": _correlation(request),
    }
