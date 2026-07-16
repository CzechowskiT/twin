"""Internal Agent Dispatcher HTTP API — /api/internal/agent-dispatch/*."""

from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import AgentDispatchRun
from app.database.session import get_db
from app.schemas.agent_dispatch import CreateDispatchRequest, ForceUnlockRequest
from app.services.agent_dispatch.auth import (
    AgentDispatchPrincipal,
    get_agent_dispatch_principal,
    require_scope,
)
from app.services.agent_dispatch.constants import (
    AGENT_DISPATCH_SCOPE_ADMIN,
    AGENT_DISPATCH_SCOPE_CANCEL,
    AGENT_DISPATCH_SCOPE_CREATE,
    AGENT_DISPATCH_SCOPE_READ,
    CURSOR_CONTRACT_DOC_DATE,
    CURSOR_CONTRACT_VERSION,
    CURSOR_API_CREDENTIAL_SECRET_NAME,
)
from app.services.agent_dispatch.cursor_client import CursorApiError, CursorCloudAgentsClient
from app.services.agent_dispatch.service import (
    cancel_run,
    create_dispatch_run,
    ingest_webhook,
    reconcile_run,
    run_to_public_dict,
)

router = APIRouter()


def _as_response(run: AgentDispatchRun) -> dict[str, Any]:
    return run_to_public_dict(run)


@router.get("/health")
def dispatcher_health(settings: Annotated[Settings, Depends(get_settings)]) -> dict[str, Any]:
    """Unauthenticated readiness — no secrets."""
    return {
        "ok": True,
        "service": "twin-agent-dispatcher",
        "cursor_contract_version": CURSOR_CONTRACT_VERSION,
        "cursor_contract_doc_date": CURSOR_CONTRACT_DOC_DATE,
        "auth_configured": bool(
            (settings.agent_dispatch_token or "").strip()
            or (settings.agent_dispatch_tokens or "").strip()
        ),
        "cursor_credential_configured": bool((settings.cursor_cloud_agents_api_key or "").strip()),
        "cursor_credential_secret_name": CURSOR_API_CREDENTIAL_SECRET_NAME,
        "webhook_configured": bool((settings.agent_dispatch_webhook_secret or "").strip()),
    }


@router.get("/contract")
def dispatcher_contract(
    principal: Annotated[AgentDispatchPrincipal, Depends(get_agent_dispatch_principal)],
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    return {
        "cursor_contract_version": CURSOR_CONTRACT_VERSION,
        "cursor_contract_doc_date": CURSOR_CONTRACT_DOC_DATE,
        "docs": [
            "https://cursor.com/docs/cloud-agent/api/endpoints",
            "https://cursor.com/docs/cloud-agent/api/v0",
            "https://cursor.com/docs/cloud-agent/api/webhooks",
            "https://cursor.com/docs/api",
        ],
        "base_url": "https://api.cursor.com",
        "auth": "Basic (API key as username) or Bearer",
        "v1_webhooks": "coming soon — dispatcher uses v0 webhook launch when webhook URL set",
        "mcp_ready": True,
        "scopes": sorted(principal.scopes),
    }


@router.post("/runs", status_code=status.HTTP_201_CREATED)
def create_run(
    body: CreateDispatchRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_CREATE)
    run = create_dispatch_run(
        db,
        settings,
        principal,
        task_name=body.task_name,
        prompt=body.prompt,
        repository_url=body.repository_url or body.repository or "",
        base_branch=body.base_branch,
        execution_policy=body.execution_policy.model_dump(),
        auto_create_pr=body.auto_create_pr,
        branch_name=body.branch_name,
        model_id=body.model_id,
        idempotency_key=body.idempotency_key,
        metadata=body.metadata,
        dispatch_now=body.dispatch_now,
    )
    return _as_response(run)


@router.get("/runs/{run_id}")
def get_run(
    run_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
    refresh: bool = False,
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    if refresh:
        run = reconcile_run(db, settings, run_id)
    return _as_response(run)


@router.post("/runs/{run_id}/cancel")
def cancel_dispatch_run(
    run_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_CANCEL)
    run = cancel_run(db, settings, principal, run_id)
    return _as_response(run)


@router.post("/runs/{run_id}/reconcile")
def reconcile_dispatch_run(
    run_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    run = reconcile_run(db, settings, run_id)
    return _as_response(run)


@router.get("/runs/{run_id}/report")
def run_report(
    run_id: str,
    db: Session = Depends(get_db),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    data = _as_response(run)
    data["report"] = {
        "status": run.status,
        "branch": run.result_branch,
        "pr_url": run.result_pr_url,
        "head_sha": run.result_head_sha,
        "ci_status": run.result_ci_status,
        "summary": run.result_summary,
        "error_code": run.error_code,
        "error_message": run.error_message,
    }
    return data


@router.post("/admin/force-unlock")
def force_unlock_endpoint(
    body: ForceUnlockRequest,
    db: Session = Depends(get_db),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    """Hard-banned: execution_policy.no_admin_override — use cancel + lease expiry."""
    require_scope(principal, AGENT_DISPATCH_SCOPE_ADMIN)
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        detail={
            "error": "no_admin_override",
            "message": (
                "Force-unlock is disabled. Cancel the active run or wait for "
                "lease expiry + Cursor reconciliation."
            ),
            "repository_url": body.repository_url,
            "base_branch": body.base_branch,
        },
    )


@router.get("/canary")
def live_canary(
    settings: Settings = Depends(get_settings),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    """Read-only Cursor /me canary — no agent create."""
    require_scope(principal, AGENT_DISPATCH_SCOPE_ADMIN)
    if not (settings.cursor_cloud_agents_api_key or "").strip():
        return {
            "status": "BLOCKED",
            "reason": (
                f"add Cursor Cloud Agents service-account API credential to production "
                f"secret store under documented name"
            ),
            "secret_name": CURSOR_API_CREDENTIAL_SECRET_NAME,
        }
    try:
        info = CursorCloudAgentsClient(settings).api_key_info()
    except CursorApiError as exc:
        return {
            "status": "FAILED",
            "error": str(exc)[:200],
            "http_status": exc.status_code,
        }
    # Redact emails partially
    safe = {}
    for k, v in (info or {}).items():
        if "email" in k.lower() and isinstance(v, str) and "@" in v:
            local, _, domain = v.partition("@")
            safe[k] = f"{local[:2]}***@{domain}"
        elif "key" in k.lower():
            safe[k] = "[redacted]"
        else:
            safe[k] = v
    return {"status": "OK", "api_key_info": safe}


@router.post("/webhooks/cursor")
async def cursor_webhook(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_webhook_signature: Annotated[str | None, Header(alias="X-Webhook-Signature")] = None,
    x_webhook_id: Annotated[str | None, Header(alias="X-Webhook-ID")] = None,
    x_webhook_event: Annotated[str | None, Header(alias="X-Webhook-Event")] = None,
) -> dict[str, str]:
    raw = await request.body()
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid JSON") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="payload must be object")
    return ingest_webhook(
        db,
        settings,
        raw_body=raw,
        signature=x_webhook_signature,
        webhook_id=x_webhook_id,
        event_name=x_webhook_event,
        payload=payload,
    )
