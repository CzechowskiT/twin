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
from app.schemas.agent_dispatch import (
    CreateDispatchRequest,
    ForceUnlockRequest,
    OperatorCreatePullRequestRequest,
    OperatorRunRequest,
)
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.services.agent_dispatch.auth import (
    AgentDispatchPrincipal,
    get_agent_dispatch_principal,
    require_scope,
    resolve_principal,
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
from app.services.agent_dispatch.operator_observability import operator_metrics_snapshot
from app.services.agent_dispatch.operator_service import OperatorService
from app.services.agent_dispatch import oauth_as
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
        "chatgpt_mcp_auth": "oauth2.1+pkce",
        "chatgpt_actions_openapi": "/api/internal/agent-dispatch/chatgpt/openapi.json",
        "oauth_authorization_server": "/api/internal/agent-dispatch/oauth",
        "active_lock_count": active_locks,
        "operator": {
            "enabled": bool(settings.agent_dispatch_operator_enabled),
            "metrics": operator_metrics_snapshot(),
        },
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


@router.post("/runs/{run_id}/operator/create-pull-request")
def operator_create_pull_request(
    run_id: str,
    body: OperatorCreatePullRequestRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    """Explicit Operator PR creation; never enables auto-merge."""
    require_scope(principal, AGENT_DISPATCH_SCOPE_ADMIN)
    return OperatorService(
        db,
        settings,
        actor_fingerprint=principal.token_fingerprint,
    ).create_pull_request(
        run_id,
        title=body.title,
        body=body.body,
        correlation_id=body.correlation_id,
    )


@router.post("/runs/{run_id}/operator/run", status_code=status.HTTP_202_ACCEPTED)
def run_operator(
    run_id: str,
    body: OperatorRunRequest,
    db: Session = Depends(get_db),
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    """Explicit manual Operator execution; GitHub branch protection remains authoritative."""
    require_scope(principal, AGENT_DISPATCH_SCOPE_ADMIN)
    service = OperatorService(
        db,
        get_settings(),
        actor_fingerprint=principal.token_fingerprint,
    )
    run = service.request(run_id, correlation_id=body.correlation_id)
    from app.tasks.agent_dispatch_tasks import run_agent_dispatch_operator

    run_agent_dispatch_operator.delay(
        run_id,
        run.operator_correlation_id,
        principal.token_fingerprint,
    )
    return _as_response(run)


@router.get("/mcp/manifest")
def mcp_manifest(
    principal: AgentDispatchPrincipal = Depends(get_agent_dispatch_principal),
) -> dict[str, Any]:
    """Authenticated tool catalog + version metadata (no anon)."""
    require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
    return {
        "server": mcp_server_info(),
        "tools": tool_definitions(),
        "auth": {
            "cli_and_actions": "Authorization: Bearer <AGENT_DISPATCH_TOKEN>",
            "chatgpt_mcp_connector": "OAuth 2.1 authorization code + PKCE (see /oauth)",
        },
        "transport": "streamable-http-jsonrpc",
        "endpoint": "/api/internal/agent-dispatch/mcp",
    }


@router.get("/chatgpt/openapi.json")
def chatgpt_actions_openapi(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Public OpenAPI for Custom GPT Actions (Bearer). No secrets in schema."""
    return oauth_as.chatgpt_actions_openapi(settings, str(request.base_url).rstrip("/"))


@router.get("/chatgpt/setup")
def chatgpt_setup_hint() -> dict[str, Any]:
    """Machine-readable registration hints (no secrets)."""
    return {
        "preferred": "chatgpt_developer_mode_mcp_oauth",
        "mcp_server_url": (
            "https://twin-production-bcd9.up.railway.app/api/internal/agent-dispatch/mcp"
        ),
        "auth": "OAuth (ChatGPT does not support static API keys for MCP connectors)",
        "oauth_authorize": "/api/internal/agent-dispatch/oauth/authorize",
        "actions_fallback": {
            "openapi": "/api/internal/agent-dispatch/chatgpt/openapi.json",
            "auth": "API Key Bearer = AGENT_DISPATCH_TOKEN",
        },
        "docs": "docs/TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md",
        "one_time_ui_blocker": (
            "Founder must create a Developer Mode app/connector in ChatGPT UI "
            "(Settings → Plugins / chatgpt.com/plugins) pointing at the MCP URL; "
            "OAuth consent pastes AGENT_DISPATCH_TOKEN once."
        ),
    }


@router.get("/oauth/.well-known/oauth-authorization-server")
@router.get("/.well-known/oauth-authorization-server")
def oauth_as_metadata_under_issuer(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return oauth_as.authorization_server_metadata(settings, str(request.base_url).rstrip("/"))


@router.post("/oauth/register")
@limiter.limit("30/minute")
async def oauth_register(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid JSON") from exc
    if not isinstance(body, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="body must be object")
    return oauth_as.register_client(settings, body)


@router.get("/oauth/authorize", response_class=HTMLResponse)
def oauth_authorize_get(
    request: Request,
    settings: Settings = Depends(get_settings),
    client_id: str = "",
    redirect_uri: str = "",
    response_type: str = "code",
    state: str | None = None,
    code_challenge: str = "",
    code_challenge_method: str = "S256",
    scope: str | None = None,
    resource: str | None = None,
) -> HTMLResponse:
    if response_type != "code":
        return HTMLResponse(oauth_as.authorize_page_html(error="response_type must be code"), 400)
    if code_challenge_method != "S256" or not code_challenge:
        return HTMLResponse(oauth_as.authorize_page_html(error="PKCE S256 required"), 400)
    try:
        oauth_as.validate_client_redirect(settings, client_id, redirect_uri)
    except HTTPException as exc:
        return HTMLResponse(oauth_as.authorize_page_html(error=str(exc.detail)), 400)
    # Stash query params in hidden fields via form action (GET→POST carries query).
    _ = (state, scope, resource)
    return HTMLResponse(oauth_as.authorize_page_html())


@router.post("/oauth/authorize", response_model=None)
@limiter.limit("30/minute")
async def oauth_authorize_post(
    request: Request,
    settings: Settings = Depends(get_settings),
):
    form = await request.form()
    token = str(form.get("token") or "")
    q = request.query_params
    client_id = q.get("client_id") or ""
    redirect_uri = q.get("redirect_uri") or ""
    state = q.get("state")
    code_challenge = q.get("code_challenge") or ""
    code_challenge_method = q.get("code_challenge_method") or "S256"
    scope = q.get("scope") or oauth_as.DEFAULT_SCOPES
    resource = q.get("resource") or oauth_as.mcp_resource_url(
        settings, str(request.base_url).rstrip("/")
    )
    if code_challenge_method != "S256" or not code_challenge:
        return HTMLResponse(oauth_as.authorize_page_html(error="PKCE S256 required"), 400)
    try:
        oauth_as.validate_client_redirect(settings, client_id, redirect_uri)
    except HTTPException as exc:
        return HTMLResponse(oauth_as.authorize_page_html(error=str(exc.detail)), 400)
    principal = oauth_as.match_dispatcher_token(settings, token)
    if not principal:
        return HTMLResponse(oauth_as.authorize_page_html(error="Invalid token"), 401)
    request_base = str(request.base_url).rstrip("/")
    code = oauth_as.mint_authorization_code(
        settings,
        principal=principal,
        client_id=client_id,
        redirect_uri=redirect_uri,
        code_challenge=code_challenge,
        resource=resource,
        scope=scope,
        request_base=request_base,
    )
    return RedirectResponse(
        oauth_as.build_authorize_redirect(redirect_uri=redirect_uri, code=code, state=state),
        status_code=302,
    )


@router.post("/oauth/token")
@limiter.limit("60/minute")
async def oauth_token(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        try:
            data = await request.json()
        except Exception as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid JSON") from exc
    else:
        form = await request.form()
        data = {k: form.get(k) for k in form.keys()}
    if not isinstance(data, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid body")
    grant = str(data.get("grant_type") or "")
    client_id = str(data.get("client_id") or "")
    resource = data.get("resource")
    resource_s = str(resource) if resource else None
    request_base = str(request.base_url).rstrip("/")
    try:
        if grant == "authorization_code":
            result = oauth_as.exchange_authorization_code(
                settings,
                code=str(data.get("code") or ""),
                redirect_uri=str(data.get("redirect_uri") or ""),
                client_id=client_id,
                code_verifier=str(data.get("code_verifier") or ""),
                resource=resource_s,
                request_base=request_base,
            )
        elif grant == "refresh_token":
            result = oauth_as.exchange_refresh_token(
                settings,
                refresh_token=str(data.get("refresh_token") or ""),
                client_id=client_id,
                resource=resource_s,
                request_base=request_base,
            )
        else:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="unsupported_grant_type")
    except HTTPException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": str(exc.detail)},
        )
    return JSONResponse(result)


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
    principal = resolve_principal(settings, authorization, request=request)
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
