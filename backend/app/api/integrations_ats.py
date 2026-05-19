"""Inbound ATS webhooks (best-effort; extend per vendor contract)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import Application, ApplicationStatus
from app.database.session import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_greenhouse_webhook(settings: Settings, body: bytes, header_sig: str | None) -> None:
    """Validate Greenhouse webhook HMAC-SHA256; reject unsigned traffic in production."""
    secret = (settings.greenhouse_webhook_secret or "").strip()
    env = (settings.environment or "").strip().lower()

    if not secret:
        if env in ("production", "staging"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Webhook secret not configured. Set GREENHOUSE_WEBHOOK_SECRET.",
            )
        logger.warning("Greenhouse webhook secret not set — allowing in non-production")
        return

    if not header_sig:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing X-Greenhouse-Signature header",
        )

    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    candidate = header_sig.removeprefix("sha256=").strip()
    if len(candidate) != len(digest) or not hmac.compare_digest(digest, candidate):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature",
        )


@router.post("/ats/greenhouse")
async def greenhouse_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    """Receive Greenhouse-style JSON payloads; HMAC-SHA256 over raw body when secret is set."""
    settings = get_settings()
    body = await request.body()
    sig = request.headers.get("X-Greenhouse-Signature") or request.headers.get("X-Hub-Signature-256")
    _verify_greenhouse_webhook(settings, body, sig)

    try:
        payload: dict[str, Any] = json.loads(body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from exc

    action = str(payload.get("action") or payload.get("event") or "")
    app_id = payload.get("application", {}).get("id") if isinstance(payload.get("application"), dict) else None
    if app_id is None and isinstance(payload.get("payload"), dict):
        inner = payload["payload"].get("application")
        if isinstance(inner, dict):
            app_id = inner.get("id")

    if action and "hire" in action.lower() and app_id is not None:
        ext = str(app_id)
        row = (
            db.query(Application)
            .filter(Application.external_ats_id == ext, Application.external_ats_provider == "greenhouse")
            .first()
        )
        if row:
            row.status = ApplicationStatus.HIRED
            db.commit()
            logger.info("ATS webhook marked application %s hired (greenhouse)", row.id)
        else:
            logger.info("ATS hire event for unknown external id=%s", ext)

    return {"status": "ok"}


@router.post("/ats/lever")
async def lever_webhook() -> dict[str, str]:
    """Lever webhook — disabled until signature validation is implemented."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Lever webhook integration not yet implemented",
    )


@router.post("/ats/ashby")
async def ashby_webhook() -> dict[str, str]:
    """Ashby webhook — disabled until signature validation is implemented."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Ashby webhook integration not yet implemented",
    )
