"""Minimal OAuth 2.1 authorization server for ChatGPT MCP connectors.

ChatGPT Developer Mode supports OAuth / No Auth / Mixed Auth for remote MCP —
not static API keys. This AS issues short-lived access tokens after the founder
proves possession of AGENT_DISPATCH_TOKEN (auth code + PKCE S256).

Stateless codes/tokens (signed JWT via SECRET_KEY). No secrets in query strings
of the MCP resource URL. CIMD + DCR + predefined public clients supported.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.config import Settings
from app.services.agent_dispatch.auth import (
    AgentDispatchPrincipal,
    fingerprint_token,
    parse_token_scope_entries,
)
from app.services.agent_dispatch.constants import ALL_DISPATCH_SCOPES

OAUTH_JWT_ALG = "HS256"
OAUTH_CODE_TYP = "ad_oauth_code"
OAUTH_ACCESS_TYP = "ad_oauth_access"
OAUTH_CLIENT_TYP = "ad_oauth_client"
ACCESS_TOKEN_TTL_SECONDS = 3600
AUTH_CODE_TTL_SECONDS = 300
DEFAULT_SCOPES = " ".join(sorted(ALL_DISPATCH_SCOPES))

CHATGPT_REDIRECT_PREFIXES = (
    "https://chatgpt.com/connector/oauth/",
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "https://chat.openai.com/connector/oauth/",
    "https://chat.openai.com/connector_platform_oauth_redirect",
)


def public_api_base(settings: Settings, request_base: str | None = None) -> str:
    """Canonical HTTPS API origin for OAuth issuer/resource metadata."""
    configured = (settings.api_url or "").strip().rstrip("/")
    if configured.startswith("https://") or (
        configured.startswith("http://") and "localhost" in configured
    ):
        return configured
    if request_base:
        return request_base.rstrip("/")
    return "https://twin-production-bcd9.up.railway.app"


def mcp_resource_url(settings: Settings, request_base: str | None = None) -> str:
    return f"{public_api_base(settings, request_base)}/api/internal/agent-dispatch/mcp"


def oauth_issuer_url(settings: Settings, request_base: str | None = None) -> str:
    return f"{public_api_base(settings, request_base)}/api/internal/agent-dispatch/oauth"


def protected_resource_metadata_url(settings: Settings, request_base: str | None = None) -> str:
    base = public_api_base(settings, request_base)
    return f"{base}/.well-known/oauth-protected-resource/api/internal/agent-dispatch/mcp"


def www_authenticate_header(settings: Settings, request_base: str | None = None) -> str:
    meta = protected_resource_metadata_url(settings, request_base)
    return (
        f'Bearer realm="twin-agent-dispatcher", '
        f'resource_metadata="{meta}", '
        f'scope="{DEFAULT_SCOPES}"'
    )


def protected_resource_metadata(settings: Settings, request_base: str | None = None) -> dict[str, Any]:
    resource = mcp_resource_url(settings, request_base)
    issuer = oauth_issuer_url(settings, request_base)
    return {
        "resource": resource,
        "authorization_servers": [issuer],
        "scopes_supported": sorted(ALL_DISPATCH_SCOPES),
        "bearer_methods_supported": ["header"],
        "resource_documentation": (
            f"{public_api_base(settings, request_base)}"
            "/api/internal/agent-dispatch/chatgpt/setup"
        ),
    }


def authorization_server_metadata(settings: Settings, request_base: str | None = None) -> dict[str, Any]:
    issuer = oauth_issuer_url(settings, request_base)
    return {
        "issuer": issuer,
        "authorization_endpoint": f"{issuer}/authorize",
        "token_endpoint": f"{issuer}/token",
        "registration_endpoint": f"{issuer}/register",
        "scopes_supported": sorted(ALL_DISPATCH_SCOPES),
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none", "client_secret_post"],
        "client_id_metadata_document_supported": True,
        "revocation_endpoint_auth_methods_supported": ["none"],
    }


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def verify_pkce_s256(code_verifier: str, code_challenge: str) -> bool:
    digest = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    return hmac.compare_digest(_b64url(digest), code_challenge)


def _encode(settings: Settings, claims: dict[str, Any]) -> str:
    return jwt.encode(claims, settings.secret_key, algorithm=OAUTH_JWT_ALG)


def _decode(settings: Settings, token: str) -> dict[str, Any] | None:
    raw = (token or "").strip()
    if not raw or raw.count(".") != 2:
        return None
    try:
        return jwt.decode(
            raw,
            settings.secret_key,
            algorithms=[OAUTH_JWT_ALG],
            options={"require_exp": True, "verify_aud": False},
        )
    except JWTError:
        return None


def match_dispatcher_token(settings: Settings, presented: str) -> AgentDispatchPrincipal | None:
    """Constant-time match against AGENT_DISPATCH_TOKEN(S)."""
    presented = (presented or "").strip()
    if not presented:
        return None
    for token, scopes in parse_token_scope_entries(settings):
        if hmac.compare_digest(token, presented):
            return AgentDispatchPrincipal(
                token_fingerprint=fingerprint_token(token), scopes=scopes
            )
    return None


def is_allowed_redirect(uri: str) -> bool:
    u = (uri or "").strip()
    if not u.startswith("https://"):
        # Local MCP Inspector / dev only
        if u.startswith("http://localhost") or u.startswith("http://127.0.0.1"):
            return True
        return False
    if any(u.startswith(p) or u == p.rstrip("/") for p in CHATGPT_REDIRECT_PREFIXES):
        return True
    # CIMD / custom clients: host allowlist for openai/chatgpt only unless DCR JWT.
    host = (urlparse(u).hostname or "").lower()
    return host in {"chatgpt.com", "chat.openai.com", "localhost", "127.0.0.1"}


def mint_authorization_code(
    settings: Settings,
    *,
    principal: AgentDispatchPrincipal,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    resource: str,
    scope: str,
    request_base: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "typ": OAUTH_CODE_TYP,
        "iss": oauth_issuer_url(settings, request_base),
        "sub": f"dispatch:{principal.token_fingerprint}",
        "fp": principal.token_fingerprint,
        "scopes": sorted(principal.scopes),
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "resource": resource,
        "scope": scope or DEFAULT_SCOPES,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=AUTH_CODE_TTL_SECONDS)).timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    return _encode(settings, claims)


def mint_access_token(
    settings: Settings,
    *,
    fingerprint: str,
    scopes: list[str] | frozenset[str],
    resource: str,
    client_id: str,
    request_base: str | None = None,
) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    exp = int((now + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS)).timestamp())
    scope_list = sorted(set(scopes) & ALL_DISPATCH_SCOPES) or sorted(ALL_DISPATCH_SCOPES)
    claims = {
        "typ": OAUTH_ACCESS_TYP,
        "iss": oauth_issuer_url(settings, request_base),
        "aud": resource,
        "sub": f"dispatch:{fingerprint}",
        "fp": fingerprint,
        "scopes": scope_list,
        "scope": " ".join(scope_list),
        "client_id": client_id,
        "iat": int(now.timestamp()),
        "exp": exp,
        "jti": secrets.token_urlsafe(12),
    }
    return _encode(settings, claims), ACCESS_TOKEN_TTL_SECONDS


def mint_refresh_token(
    settings: Settings,
    *,
    fingerprint: str,
    scopes: list[str],
    resource: str,
    client_id: str,
    request_base: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "typ": "ad_oauth_refresh",
        "iss": oauth_issuer_url(settings, request_base),
        "aud": resource,
        "sub": f"dispatch:{fingerprint}",
        "fp": fingerprint,
        "scopes": scopes,
        "client_id": client_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=30)).timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    return _encode(settings, claims)


def _issuer_candidates(settings: Settings, request_base: str | None = None) -> set[str]:
    out = {
        oauth_issuer_url(settings),
        oauth_issuer_url(settings, "https://twin-production-bcd9.up.railway.app"),
        oauth_issuer_url(settings, "http://localhost:8000"),
        oauth_issuer_url(settings, "http://testserver"),
    }
    if request_base:
        out.add(oauth_issuer_url(settings, request_base))
    return out


def resolve_oauth_access_principal(
    settings: Settings,
    presented: str,
    *,
    expected_resource: str | None = None,
    request_base: str | None = None,
) -> AgentDispatchPrincipal | None:
    """Validate AS-issued access token → principal (scopes from token)."""
    payload = _decode(settings, presented)
    if not payload or payload.get("typ") != OAUTH_ACCESS_TYP:
        return None
    if payload.get("iss") not in _issuer_candidates(settings, request_base):
        return None
    aud = payload.get("aud")
    if expected_resource and aud and aud != expected_resource:
        if not str(aud).endswith("/api/internal/agent-dispatch/mcp"):
            return None
    fp = payload.get("fp")
    scopes_raw = payload.get("scopes") or []
    if not isinstance(fp, str) or not fp:
        return None
    scopes = frozenset(s for s in scopes_raw if s in ALL_DISPATCH_SCOPES)
    if not scopes:
        scopes = ALL_DISPATCH_SCOPES
    return AgentDispatchPrincipal(token_fingerprint=fp, scopes=scopes)


def exchange_authorization_code(
    settings: Settings,
    *,
    code: str,
    redirect_uri: str,
    client_id: str,
    code_verifier: str,
    resource: str | None,
    request_base: str | None = None,
) -> dict[str, Any]:
    payload = _decode(settings, code)
    if not payload or payload.get("typ") != OAUTH_CODE_TYP:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_grant")
    if payload.get("client_id") != client_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_client")
    if payload.get("redirect_uri") != redirect_uri:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_grant")
    challenge = str(payload.get("code_challenge") or "")
    if not verify_pkce_s256(code_verifier, challenge):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_grant")
    token_resource = resource or str(
        payload.get("resource") or mcp_resource_url(settings, request_base)
    )
    if payload.get("resource") and resource and payload["resource"] != resource:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_target")
    fp = str(payload.get("fp") or "")
    scopes = list(payload.get("scopes") or sorted(ALL_DISPATCH_SCOPES))
    access, expires_in = mint_access_token(
        settings,
        fingerprint=fp,
        scopes=scopes,
        resource=token_resource,
        client_id=client_id,
        request_base=request_base,
    )
    refresh = mint_refresh_token(
        settings,
        fingerprint=fp,
        scopes=scopes,
        resource=token_resource,
        client_id=client_id,
        request_base=request_base,
    )
    return {
        "access_token": access,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "refresh_token": refresh,
        "scope": " ".join(scopes),
    }


def exchange_refresh_token(
    settings: Settings,
    *,
    refresh_token: str,
    client_id: str,
    resource: str | None,
    request_base: str | None = None,
) -> dict[str, Any]:
    payload = _decode(settings, refresh_token)
    if not payload or payload.get("typ") != "ad_oauth_refresh":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_grant")
    if payload.get("client_id") != client_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_client")
    fp = str(payload.get("fp") or "")
    scopes = list(payload.get("scopes") or sorted(ALL_DISPATCH_SCOPES))
    token_resource = resource or str(
        payload.get("aud") or mcp_resource_url(settings, request_base)
    )
    access, expires_in = mint_access_token(
        settings,
        fingerprint=fp,
        scopes=scopes,
        resource=token_resource,
        client_id=client_id,
        request_base=request_base,
    )
    return {
        "access_token": access,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "scope": " ".join(scopes),
    }


def register_client(settings: Settings, body: dict[str, Any]) -> dict[str, Any]:
    """RFC 7591 DCR — stateless client_id JWT carrying redirect_uris."""
    redirects = body.get("redirect_uris") or []
    if not isinstance(redirects, list) or not redirects:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="redirect_uris required")
    for uri in redirects:
        if not isinstance(uri, str) or not is_allowed_redirect(uri):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="redirect_uri not allowed")
    now = datetime.now(timezone.utc)
    client_id = _encode(
        settings,
        {
            "typ": OAUTH_CLIENT_TYP,
            "iss": oauth_issuer_url(settings),
            "redirect_uris": redirects,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(days=365)).timestamp()),
            "jti": secrets.token_urlsafe(12),
        },
    )
    return {
        "client_id": client_id,
        "client_id_issued_at": int(now.timestamp()),
        "redirect_uris": redirects,
        "token_endpoint_auth_method": "none",
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
        "client_name": body.get("client_name") or "chatgpt-mcp",
    }


def validate_client_redirect(settings: Settings, client_id: str, redirect_uri: str) -> None:
    if not is_allowed_redirect(redirect_uri):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="redirect_uri not allowed")
    # DCR client_id JWT
    payload = _decode(settings, client_id)
    if payload and payload.get("typ") == OAUTH_CLIENT_TYP:
        allowed = payload.get("redirect_uris") or []
        if redirect_uri not in allowed:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="redirect_uri mismatch")
        return
    # CIMD: client_id is an HTTPS metadata URL
    if client_id.startswith("https://"):
        _validate_cimd_redirect(client_id, redirect_uri)
        return
    # Predefined / opaque client ids: ChatGPT redirects already allowlisted above
    return


def _validate_cimd_redirect(client_id_url: str, redirect_uri: str) -> None:
    """Fetch CIMD metadata only for allowlisted public hosts — no SSRF.

    Fail closed on blocked hosts / private IPs. Redirect following disabled.
    When metadata cannot be fetched safely, rely on ChatGPT redirect allowlist
    already enforced by ``is_allowed_redirect``.
    """
    from app.services.url_safety import assert_public_https_url, hostname_is_cimd_allowlisted

    parsed = urlparse(client_id_url)
    host = (parsed.hostname or "").lower()
    if not hostname_is_cimd_allowlisted(host):
        # Do not server-fetch arbitrary client_id URLs (unauthenticated SSRF).
        return
    try:
        assert_public_https_url(client_id_url)
    except ValueError:
        return
    try:
        with httpx.Client(timeout=5.0, follow_redirects=False) as client:
            res = client.get(client_id_url)
            if res.status_code != 200:
                return
            data = res.json()
    except Exception:
        return
    uris = data.get("redirect_uris") or []
    if uris and redirect_uri not in uris:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="redirect_uri not in CIMD")


def build_authorize_redirect(
    *,
    redirect_uri: str,
    code: str,
    state: str | None,
) -> str:
    params = {"code": code}
    if state:
        params["state"] = state
    sep = "&" if "?" in redirect_uri else "?"
    return f"{redirect_uri}{sep}{urlencode(params)}"


def chatgpt_actions_openapi(settings: Settings, request_base: str | None = None) -> dict[str, Any]:
    """OpenAPI 3.1 for Custom GPT Actions (Bearer API key) — secondary to MCP OAuth."""
    base = public_api_base(settings, request_base)
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "TWIN Agent Dispatcher",
            "version": "1.0.0",
            "description": (
                "Dispatch Cursor Cloud Agents via TWIN without pasting prompts. "
                "Auth: Authorization Bearer AGENT_DISPATCH_TOKEN. "
                "Prefer MCP connector with OAuth when available."
            ),
        },
        "servers": [{"url": base}],
        "security": [{"bearerAuth": []}],
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "AGENT_DISPATCH_TOKEN",
                    "description": "Production AGENT_DISPATCH_TOKEN from Railway secret store",
                }
            },
            "schemas": {
                "DispatchCreate": {
                    "type": "object",
                    "required": ["task_name", "prompt"],
                    "properties": {
                        "task_name": {"type": "string"},
                        "prompt": {"type": "string"},
                        "repository_url": {
                            "type": "string",
                            "default": "https://github.com/CzechowskiT/twin",
                        },
                        "base_branch": {
                            "type": "string",
                            "default": "cursor/phase1-monorepo-scaffold",
                        },
                        "execution_mode": {
                            "type": "string",
                            "enum": ["read_only", "mutating"],
                        },
                        "read_only": {"type": "boolean"},
                        "mutation_required": {"type": "boolean"},
                        "commit_required": {"type": "boolean"},
                        "pr_required": {"type": "boolean"},
                        "merge_required": {"type": "boolean"},
                        "deployment_required": {"type": "boolean"},
                        "production_regression_required": {"type": "boolean"},
                        "operator_execution_required": {"type": "boolean"},
                        "auto_create_pr": {"type": "boolean", "default": False},
                        "idempotency_key": {"type": "string"},
                        "dispatch_now": {"type": "boolean", "default": True},
                    },
                }
            },
        },
        "paths": {
            "/api/internal/agent-dispatch/runs": {
                "post": {
                    "operationId": "dispatch_twin_agent",
                    "summary": "Create a dispatcher run (Cursor Cloud Agent)",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/DispatchCreate"}
                            }
                        },
                    },
                    "responses": {"201": {"description": "Run created"}},
                },
                "get": {
                    "operationId": "list_twin_agent_runs",
                    "summary": "List recent dispatcher runs",
                    "parameters": [
                        {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 20}}
                    ],
                    "responses": {"200": {"description": "OK"}},
                },
            },
            "/api/internal/agent-dispatch/runs/{run_id}": {
                "get": {
                    "operationId": "get_twin_agent_status",
                    "summary": "Get run status",
                    "parameters": [
                        {"name": "run_id", "in": "path", "required": True, "schema": {"type": "string"}},
                        {"name": "refresh", "in": "query", "schema": {"type": "boolean"}},
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/internal/agent-dispatch/runs/{run_id}/report": {
                "get": {
                    "operationId": "get_twin_agent_report",
                    "summary": "Structured final report",
                    "parameters": [
                        {"name": "run_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/internal/agent-dispatch/runs/{run_id}/handoff": {
                "get": {
                    "operationId": "get_twin_agent_handoff",
                    "summary": "Full handoff package (no prompt copy)",
                    "parameters": [
                        {"name": "run_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/internal/agent-dispatch/runs/{run_id}/cancel": {
                "post": {
                    "operationId": "cancel_twin_agent",
                    "summary": "Cancel an active run",
                    "parameters": [
                        {"name": "run_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/internal/agent-dispatch/runs/{run_id}/reconcile": {
                "post": {
                    "operationId": "reconcile_twin_agent_run",
                    "summary": "Force reconcile from Cursor + GitHub",
                    "parameters": [
                        {"name": "run_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
        },
    }


def authorize_page_html(*, error: str | None = None) -> str:
    err = f"<p style='color:#b00'>{error}</p>" if error else ""
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>TWIN Agent Dispatcher — Authorize</title>
<style>
body{{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;line-height:1.45}}
label{{display:block;margin:.75rem 0 .25rem;font-weight:600}}
input[type=password]{{width:100%;padding:.5rem;box-sizing:border-box}}
button{{margin-top:1rem;padding:.6rem 1rem;font-weight:600;cursor:pointer}}
.hint{{color:#555;font-size:.9rem}}
</style></head><body>
<h1>Authorize TWIN MCP</h1>
<p class="hint">ChatGPT is requesting access to the TWIN Agent Dispatcher.
Paste the production <code>AGENT_DISPATCH_TOKEN</code> from your secret store
(never from chat logs). Cursor API keys are not accepted here.</p>
{err}
<form method="post">
<label for="token">AGENT_DISPATCH_TOKEN</label>
<input id="token" name="token" type="password" autocomplete="current-password" required/>
<button type="submit">Allow ChatGPT</button>
</form>
</body></html>"""
