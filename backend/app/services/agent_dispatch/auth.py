"""Scoped Bearer auth for Agent Dispatcher internal API."""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass

from fastapi import Header, HTTPException, Request, status

from app.config import Settings, get_settings
from app.services.agent_dispatch.constants import (
    ALL_DISPATCH_SCOPES,
    normalize_scope,
)


@dataclass(frozen=True)
class AgentDispatchPrincipal:
    """Authenticated caller — token fingerprint only (never the raw secret)."""

    token_fingerprint: str
    scopes: frozenset[str]


def fingerprint_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]


def _normalize_scopes(raw_scopes: frozenset[str] | set[str] | list[str]) -> frozenset[str]:
    out: set[str] = set()
    for s in raw_scopes:
        canon = normalize_scope(s)
        if canon:
            out.add(canon)
    return frozenset(out) & ALL_DISPATCH_SCOPES or ALL_DISPATCH_SCOPES


def _parse_entry(part: str) -> tuple[str, frozenset[str]]:
    """Parse `token:scope1|scope2` where scopes may be short or `agent_runs:*`."""
    part = part.strip()
    if not part:
        return "", ALL_DISPATCH_SCOPES

    # Try each colon as the token/scopes separator; accept when RHS is valid scopes.
    idx = part.find(":")
    while idx != -1:
        token = part[:idx].strip()
        scopes_s = part[idx + 1 :].strip()
        scope_parts = [s.strip() for s in scopes_s.replace(",", "|").split("|") if s.strip()]
        if token and scope_parts and all(normalize_scope(s) for s in scope_parts):
            return token, _normalize_scopes(scope_parts)
        idx = part.find(":", idx + 1)

    return part, ALL_DISPATCH_SCOPES


def parse_token_scope_entries(settings: Settings) -> list[tuple[str, frozenset[str]]]:
    """Parse AGENT_DISPATCH_TOKENS or single AGENT_DISPATCH_TOKEN."""
    raw = (settings.agent_dispatch_tokens or "").strip()
    if not raw:
        single = (settings.agent_dispatch_token or "").strip()
        if not single:
            return []
        scopes_raw = (
            settings.agent_dispatch_default_scopes
            or "agent_runs:create|agent_runs:read|agent_runs:cancel|agent_runs:admin"
        ).strip()
        scopes = [s.strip() for s in scopes_raw.replace(",", "|").split("|") if s.strip()]
        return [(single, _normalize_scopes(scopes))]

    entries: list[tuple[str, frozenset[str]]] = []
    for part in raw.split(","):
        token, scopes = _parse_entry(part)
        if token:
            entries.append((token, scopes))
    return entries


def resolve_principal(
    settings: Settings,
    authorization: str | None,
    *,
    request: Request | None = None,
) -> AgentDispatchPrincipal:
    """Validate Bearer: static AGENT_DISPATCH_TOKEN or ChatGPT OAuth access JWT."""
    entries = parse_token_scope_entries(settings)
    if not entries:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent dispatcher auth not configured",
        )
    auth = (authorization or "").strip()
    if not auth.startswith("Bearer "):
        raise _unauthorized(settings, request, "Missing Bearer token")
    presented = auth[len("Bearer ") :].strip()
    if not presented:
        raise _unauthorized(settings, request, "Missing Bearer token")

    for token, scopes in entries:
        if hmac.compare_digest(token, presented):
            return AgentDispatchPrincipal(
                token_fingerprint=fingerprint_token(token), scopes=scopes
            )

    # ChatGPT MCP connector presents OAuth access tokens (not the long-lived secret).
    from app.services.agent_dispatch.oauth_as import (
        mcp_resource_url,
        resolve_oauth_access_principal,
    )

    request_base = str(request.base_url).rstrip("/") if request is not None else None
    oauth_principal = resolve_oauth_access_principal(
        settings,
        presented,
        expected_resource=mcp_resource_url(settings, request_base),
        request_base=request_base,
    )
    if oauth_principal:
        return oauth_principal

    raise _unauthorized(settings, request, "Invalid dispatcher token")


def _unauthorized(
    settings: Settings, request: Request | None, detail: str
) -> HTTPException:
    from app.services.agent_dispatch.oauth_as import www_authenticate_header

    request_base = str(request.base_url).rstrip("/") if request is not None else None
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": www_authenticate_header(settings, request_base)},
    )


def require_scope(principal: AgentDispatchPrincipal, scope: str) -> None:
    """Require a scope. Admin does not auto-grant create/read/cancel (least privilege)."""
    needed = normalize_scope(scope) or scope
    if needed not in principal.scopes:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"Missing scope: {needed}")


def get_agent_dispatch_principal(
    request: Request,
    authorization: str | None = Header(default=None),
) -> AgentDispatchPrincipal:
    return resolve_principal(get_settings(), authorization, request=request)
