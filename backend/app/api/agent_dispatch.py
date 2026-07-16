"""Internal Agent Dispatcher HTTP API — /api/internal/agent-dispatch/*."""

from __future__ import annotations

import hashlib
import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import AgentDispatchRun, AgentDispatchLock
from app.database.session import get_db
from app.limiter import limiter
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
from app.services.agent_dispatch.mcp_protocol import (
    MCP_PROTOCOL_VERSION,
    MCP_SERVER_NAME,
    MCP_SERVER_VERSION,
    handle_jsonrpc,
    mcp_server_info,
    tool_definitions,
)
from app.services.agent_dispatch.service import (
    cancel_run,
    create_dispatch_run,
    get_run_handoff,
    ingest_webhook,
    list_dispatch_runs,
    reconcile_run,
    run_report_dict,
    run_to_public_dict,
)

router = APIRouter()


def _as_response(run: AgentDispatchRun) -> dict[str, Any]:
    return run_to_public_dict(run)


def _secret_fp(value: str) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]


@router.get("/health")
def dispatcher_health(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Unauthenticated readiness — fingerprints only, no secrets."""
    auth_configured = bool(
        (settings.agent_dispatch_token or "").strip()
        or (settings.agent_dispatch_tokens or "").strip()
    )
    webhook_configured = bool((settings.agent_dispatch_webhook_secret or "").strip())
    cursor_configured = bool((settings.cursor_cloud_agents_api_key or "").strip())
    # Encryption uses app SECRET_KEY via token_crypto (canonical; no separate AD key).
    encryption_configured = bool((settings.secret_key or "").strip()) and bool(
        settings.agent_dispatch_encrypt_prompts
    )
    active_locks = 0
    try:
        active_locks = int(
            db.execute(select(func.count()).select_from(AgentDispatchLock)).scalar() or 0
        )
    except Exception:
        active_locks = -1
    mcp_healthy = auth_configured  # hosted MCP requires Bearer; no anon
    return {
        "ok": True,
        "service": "twin-agent-dispatcher",
        "cursor_contract_version": CURSOR_CONTRACT_VERSION,
        "cursor_contract_doc_date": CURSOR_CONTRACT_DOC_DATE,
        "auth_configured": auth_configured,
        "auth_token_fingerprint": _secret_fp(settings.agent_dispatch_token)
        or _secret_fp((settings.agent_dispatch_tokens or "").split(",")[0].split(":")[0]),
        "cursor_credential_configured": cursor_configured,
        "cursor_credential_secret_name": CURSOR_API_CREDENTIAL_SECRET_NAME,
        "webhook_configured": webhook_configured,
        "webhook_secret_fingerprint": _secret_fp(settings.agent_dispatch_webhook_secret),
        "encryption_configured": encryption_configured,
        "encryption_via": "SECRET_KEY+token_crypto",
        "mcp_hosted": True,
        "mcp_healthy": mcp_healthy,
        "mcp_protocol_version": MCP_PROTOCOL_VERSION,
        "mcp_server": {"name": MCP_SERVER_NAME, "version": MCP_SERVER_VERSION},
        "mcp_tools": [t["name"] for t in tool_definitions()],
        "active_lock_count": active_locks,
        "repo_allowlist_configured": bool((settings.agent_dispatch_repo_allowlist or "").strip()),
        "base_branch_allowlist_configured": bool(
            (settings.agent_dispatch_base_branch_allowlist or "").strip()
        ),
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
        "mcp_hosted": True,
        "mcp_endpoint": "/api/internal/agent-dispatch/mcp",
        "mcp_protocol_version": MCP_PROTOCOL_VERSION,
        "mcp_server": mcp_server_info(),
        "mcp_tools": [t["name"] for t in tool_definitions()],
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


@router.get("/runs")
def list_runs(
    db: Session = Depends(get_db),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
    limit: int = 20,
    status: str | None = None,
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    rows = list_dispatch_runs(db, limit=limit, status=status)
    return {"runs": [_as_response(r) for r in rows], "count": len(rows)}


@router.get("/runs/{run_id}/report")
def run_report(
    run_id: str,
    db: Session = Depends(get_db),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    return run_report_dict(db, run_id)


@router.get("/runs/{run_id}/handoff")
def run_handoff(
    run_id: str,
    db: Session = Depends(get_db),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    return get_run_handoff(db, run_id)


@router.get("/mcp/manifest")
def mcp_manifest(
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    """Authenticated tool catalog + version metadata (no anon)."""
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    return {
        "server": mcp_server_info(),
        "tools": tool_definitions(),
        "auth": "Authorization: Bearer <AGENT_DISPATCH_TOKEN>",
        "transport": "streamable-http-jsonrpc",
        "endpoint": "/api/internal/agent-dispatch/mcp",
    }


@router.post("/mcp")
@limiter.limit("60/minute")
async def mcp_jsonrpc(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Hosted MCP JSON-RPC (HTTPS). Bearer required; secrets never in query."""
    if request.url.query:
        # Reject credential-bearing query strings if present.
        q = (request.url.query or "").lower()
        if "token" in q or "secret" in q or "key" in q or "authorization" in q:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="secrets must not be in query")
    principal = get_agent_dispatch_principal(authorization)
    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid JSON") from exc
    if not isinstance(body, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="JSON-RPC body must be object")
    return handle_jsonrpc(body, db=db, settings=settings, principal=principal)


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
                "Create one Cursor Cloud Agents service-account credential "
                "authorized for CzechowskiT/twin and store it in the existing "
                "Railway production secret store as CURSOR_CLOUD_AGENTS_API_KEY."
            ),
            "secret_name": CURSOR_API_CREDENTIAL_SECRET_NAME,
            "founder_action_required": True,
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
