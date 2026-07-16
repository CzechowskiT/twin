"""Scoped Bearer auth for Agent Dispatcher internal API."""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass

from fastapi import Header, HTTPException, status

from app.config import Settings, get_settings
from app.services.agent_dispatch.constants import (
    AGENT_DISPATCH_SCOPE_ADMIN,
    ALL_DISPATCH_SCOPES,
)


@dataclass(frozen=True)
class AgentDispatchPrincipal:
    """Authenticated caller — token fingerprint only (never the raw secret)."""

    token_fingerprint: str
    scopes: frozenset[str]


def _fingerprint(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]


def _parse_token_scopes(settings: Settings) -> list[tuple[str, frozenset[str]]]:
    """Parse AGENT_DISPATCH_TOKENS as `token:scope1|scope2,token2:admin` or single token."""
    raw = (settings.agent_dispatch_tokens or "").strip()
    if not raw:
        single = (settings.agent_dispatch_token or "").strip()
        if not single:
            return []
        scopes_raw = (settings.agent_dispatch_default_scopes or "create|read|cancel|admin").strip()
        scopes = frozenset(s.strip() for s in scopes_raw.replace(",", "|").split("|") if s.strip())
        return [(single, scopes & ALL_DISPATCH_SCOPES or ALL_DISPATCH_SCOPES)]

    entries: list[tuple[str, frozenset[str]]] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            token, scopes_s = part.split(":", 1)
            scopes = frozenset(s.strip() for s in scopes_s.replace(",", "|").split("|") if s.strip())
        else:
            token = part
            scopes = ALL_DISPATCH_SCOPES
        token = token.strip()
        if token:
            entries.append((token, scopes & ALL_DISPATCH_SCOPES or ALL_DISPATCH_SCOPES))
    return entries


def resolve_principal(settings: Settings, authorization: str | None) -> AgentDispatchPrincipal:
    """Validate Bearer token against configured dispatcher tokens."""
    entries = _parse_token_scopes(settings)
    if not entries:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent dispatcher auth not configured",
        )
    auth = (authorization or "").strip()
    if not auth.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    presented = auth[len("Bearer ") :].strip()
    if not presented:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")

    for token, scopes in entries:
        if hmac.compare_digest(token, presented):
            return AgentDispatchPrincipal(token_fingerprint=_fingerprint(token), scopes=scopes)
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid dispatcher token")


def require_scope(principal: AgentDispatchPrincipal, scope: str) -> None:
    if AGENT_DISPATCH_SCOPE_ADMIN in principal.scopes:
        return
    if scope not in principal.scopes:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"Missing scope: {scope}")


def get_agent_dispatch_principal(
    authorization: str | None = Header(default=None),
) -> AgentDispatchPrincipal:
    return resolve_principal(get_settings(), authorization)
