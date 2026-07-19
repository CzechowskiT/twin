"""Founder-only auth + CSRF for Founder Command Center."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.config import Settings, get_settings


@dataclass(frozen=True)
class FounderPrincipal:
    fingerprint: str
    via: str  # founder_token | ops_admin


def _token_fingerprint(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]


def _configured_founder_token(settings: Settings) -> str:
    return (settings.founder_command_token or "").strip() or (
        settings.ops_admin_token or ""
    ).strip() or (settings.beta_admin_token or "").strip()


def require_founder(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> FounderPrincipal:
    expected = _configured_founder_token(settings)
    if not expected:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Founder Command token not configured",
        )
    raw = (authorization or "").strip()
    if not raw.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    presented = raw[7:].strip()
    if not hmac.compare_digest(presented, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid founder token")
    via = "founder_token" if (settings.founder_command_token or "").strip() else "ops_admin"
    return FounderPrincipal(fingerprint=_token_fingerprint(presented), via=via)


def issue_csrf_token(settings: Settings, principal: FounderPrincipal) -> str:
    secret = (settings.founder_command_csrf_secret or settings.secret_key or "").strip()
    if not secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="CSRF secret missing")
    nonce = secrets.token_urlsafe(16)
    ts = str(int(time.time()))
    payload = f"{principal.fingerprint}:{ts}:{nonce}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_csrf(
    settings: Settings,
    principal: FounderPrincipal,
    csrf_token: str | None,
    *,
    max_age_seconds: int = 7200,
) -> None:
    secret = (settings.founder_command_csrf_secret or settings.secret_key or "").strip()
    if not secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="CSRF secret missing")
    raw = (csrf_token or "").strip()
    parts = raw.split(":")
    if len(parts) != 4:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
    fp, ts_s, nonce, sig = parts
    if fp != principal.fingerprint:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="CSRF principal mismatch")
    try:
        ts = int(ts_s)
    except ValueError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Invalid CSRF timestamp") from exc
    if abs(int(time.time()) - ts) > max_age_seconds:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="CSRF token expired")
    payload = f"{fp}:{ts_s}:{nonce}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="CSRF signature invalid")


def require_csrf_header(
    request: Request,
    principal: FounderPrincipal = Depends(require_founder),
    settings: Settings = Depends(get_settings),
    x_csrf_token: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> FounderPrincipal:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return principal
    verify_csrf(settings, principal, x_csrf_token)
    return principal
