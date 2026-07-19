"""Bearer API key auth scoped exclusively to /api/v1/chatgpt/twin/*."""

from __future__ import annotations

import hashlib
import hmac
import logging
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.config import Settings, get_settings
from app.services.founder_command.auth import FounderPrincipal

logger = logging.getLogger("uvicorn.error")

VIA = "chatgpt_twin_actions"


@dataclass(frozen=True)
class ChatGptTwinPrincipal:
    """Authenticated Custom GPT Actions caller — fingerprint only in logs."""

    fingerprint: str
    via: str = VIA

    def as_founder(self) -> FounderPrincipal:
        return FounderPrincipal(fingerprint=self.fingerprint, via=self.via)


def fingerprint_api_key(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]


def _configured_keys(settings: Settings) -> list[str]:
    keys: list[str] = []
    multi = (settings.chatgpt_twin_actions_api_keys or "").strip()
    if multi:
        for part in multi.split(","):
            k = part.strip()
            if k:
                keys.append(k)
    single = (settings.chatgpt_twin_actions_api_key or "").strip()
    if single and single not in keys:
        keys.append(single)
    return keys


def validate_key_strength(key: str, *, min_bytes: int) -> bool:
    """Require ≥256-bit entropy material (URL-safe / hex / raw length)."""
    raw = key.encode("utf-8")
    return len(raw) >= max(32, int(min_bytes))


def require_chatgpt_twin(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> ChatGptTwinPrincipal:
    if not settings.chatgpt_twin_actions_enabled:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatGPT Twin Actions disabled",
        )
    keys = _configured_keys(settings)
    if not keys:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatGPT Twin Actions API key not configured",
        )
    raw = (authorization or "").strip()
    if not raw.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    presented = raw[7:].strip()
    if not presented:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    matched: str | None = None
    for key in keys:
        if hmac.compare_digest(presented, key):
            matched = key
            break
    if matched is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    min_bytes = int(settings.chatgpt_twin_actions_min_key_bytes or 32)
    if not validate_key_strength(matched, min_bytes=min_bytes):
        # Config error — do not accept weak keys in production paths.
        logger.error(
            "chatgpt_twin_actions_key_too_short fingerprint=%s",
            fingerprint_api_key(matched),
        )
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatGPT Twin Actions API key does not meet minimum strength",
        )

    principal = ChatGptTwinPrincipal(fingerprint=fingerprint_api_key(matched))
    rid = getattr(request.state, "request_id", None)
    logger.info(
        "chatgpt_twin_auth ok fingerprint=%s correlation_id=%s path=%s",
        principal.fingerprint,
        rid,
        request.url.path,
    )
    return principal
