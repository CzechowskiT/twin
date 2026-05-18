"""Inbound ATS webhooks (best-effort; extend per vendor contract)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Application, ApplicationStatus
from app.database.session import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


def _greenhouse_sig_ok(secret: str, body: bytes, header_sig: str | None) -> bool:
    if not secret.strip():
        return True
    if not header_sig:
        return False
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    cand = header_sig.removeprefix("sha256=").strip()
    if len(cand) != len(digest):
        return False
    return hmac.compare_digest(digest, cand)


@router.post("/ats/greenhouse")
async def greenhouse_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    """Receive Greenhouse-style JSON payloads; optional HMAC-SHA256 over raw body."""
    settings = get_settings()
    body = await request.body()
    sig = request.headers.get("X-Greenhouse-Signature") or request.headers.get("X-Hub-Signature-256")
    if not _greenhouse_sig_ok(settings.greenhouse_webhook_secret, body, sig):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid signature")

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
    """Placeholder for Lever webhook ingest."""
    return {"status": "ignored"}


@router.post("/ats/ashby")
async def ashby_webhook() -> dict[str, str]:
    """Placeholder for Ashby webhook ingest."""
    return {"status": "ignored"}
