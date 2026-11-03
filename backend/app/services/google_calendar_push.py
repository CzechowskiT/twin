"""Google Calendar push notification channels — credential-gated.

Requires GOOGLE_CALENDAR_PUSH_WEBHOOK_URL (public HTTPS) + Google OAuth client.
Optional GOOGLE_CALENDAR_PUSH_CHANNEL_TOKEN for X-Goog-Channel-Token validation.
Without credentials / public URL → BLOCKED_EXTERNAL_CREDENTIALS (not Founder HELD_POLICY).
"""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import GoogleCalendarPushChannel, WebhookDeliveryAttempt
from app.services.google_calendar_oauth import is_google_calendar_oauth_configured

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _webhook_url() -> str:
    return (os.environ.get("GOOGLE_CALENDAR_PUSH_WEBHOOK_URL") or "").strip()


def _channel_token() -> str:
    return (os.environ.get("GOOGLE_CALENDAR_PUSH_CHANNEL_TOKEN") or "").strip()


def google_push_status() -> dict[str, Any]:
    webhook = _webhook_url()
    oauth_ok = is_google_calendar_oauth_configured()
    caps = {
        "CONFIGURATION": "LIVE" if oauth_ok else "BLOCKED_EXTERNAL_CREDENTIALS",
        "WEBHOOK": "LIVE" if (oauth_ok and webhook.startswith("https://")) else "BLOCKED_EXTERNAL_CREDENTIALS",
        "SYNC": "PARTIAL",
        "MONITORING": "LIVE",
    }
    if not oauth_ok:
        return {
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "Google Calendar OAuth client not configured",
            "watch_supported": False,
            "capabilities": caps,
        }
    if not webhook.startswith("https://"):
        return {
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "GOOGLE_CALENDAR_PUSH_WEBHOOK_URL must be public HTTPS",
            "watch_supported": False,
            "capabilities": caps,
        }
    return {
        "status": "READY",
        "blocker": None,
        "reason": "OAuth + webhook URL configured — watch channels can be started per user",
        "watch_supported": True,
        "webhook_configured": True,
        "channel_token_configured": bool(_channel_token()),
        "capabilities": caps,
    }


def start_calendar_watch(db: Session, *, user_id: int, access_token: str) -> dict[str, Any]:
    """Register a Google Calendar events.watch channel when credentials allow."""
    status = google_push_status()
    if status.get("status") != "READY":
        return {**status, "ok": False}
    webhook = _webhook_url()
    token = _channel_token() or secrets.token_urlsafe(24)
    try:
        import httpx
    except ImportError:
        return {"ok": False, "blocker": "BLOCKED_EXTERNAL_CREDENTIALS", "reason": "httpx missing"}

    channel_id = f"twin-gcal-{user_id}-{secrets.token_hex(4)}"
    body: dict[str, Any] = {
        "id": channel_id,
        "type": "web_hook",
        "address": webhook,
        "token": token,
    }
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
        if res.status_code >= 400:
            logger.warning("google watch failed status=%s", res.status_code)
            return {
                "ok": False,
                "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
                "reason": f"Google watch HTTP {res.status_code}",
                "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            }
        data = res.json()
        row = GoogleCalendarPushChannel(
            user_id=user_id,
            channel_id=str(data.get("id") or channel_id),
            resource_id=data.get("resourceId"),
            calendar_id="primary",
            expiration_ms=int(data["expiration"]) if data.get("expiration") else None,
            channel_token_hash=hashlib.sha256(token.encode()).hexdigest(),
            status="active",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "ok": True,
            "status": "LIVE",
            "channel_id": row.channel_id,
            "resource_id": row.resource_id,
            "expiration": row.expiration_ms,
            "db_id": row.id,
        }
    except Exception as exc:
        logger.warning("google watch exception: %s", type(exc).__name__)
        return {
            "ok": False,
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "watch_request_failed",
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
        }


def handle_push_notification(
    db: Session | None = None,
    *,
    channel_id: str | None,
    resource_state: str | None,
    channel_token: str | None = None,
    resource_id: str | None = None,
) -> dict[str, Any]:
    """Ack Google push — optional channel token check; no secrets logged."""
    expected = _channel_token()
    token_ok = True
    if expected:
        token_ok = bool(channel_token) and hmac_compare(
            hashlib.sha256(expected.encode()).hexdigest(),
            hashlib.sha256((channel_token or "").encode()).hexdigest(),
        )
        # Also accept raw token equality (Google echoes the token we registered).
        if not token_ok and channel_token:
            token_ok = channel_token == expected

    if db is not None and channel_id:
        row = (
            db.query(GoogleCalendarPushChannel)
            .filter(GoogleCalendarPushChannel.channel_id == channel_id)
            .one_or_none()
        )
        if row is not None:
            row.last_notification_at = _utcnow()
            if row.channel_token_hash and channel_token:
                got = hashlib.sha256(channel_token.encode()).hexdigest()
                token_ok = got == row.channel_token_hash
            db.add(
                WebhookDeliveryAttempt(
                    provider="google_calendar_push",
                    direction="inbound",
                    event_type=f"push.{resource_state or 'unknown'}",
                    idempotency_key=f"{channel_id}:{resource_state}:{resource_id or ''}",
                    signature_ok=token_ok,
                    replay_rejected=False,
                    status="acked" if token_ok else "token_invalid",
                    http_status=200 if token_ok else 401,
                    attempt_n=1,
                    error_code=None if token_ok else "channel_token_mismatch",
                    meta_json=None,
                )
            )
            db.commit()

    if expected and not token_ok and channel_token is not None:
        return {
            "ok": False,
            "received": True,
            "channel_id_present": bool(channel_id),
            "resource_state": resource_state or "unknown",
            "action": "token_rejected",
            "http_status": 401,
        }
    return {
        "ok": True,
        "received": True,
        "channel_id_present": bool(channel_id),
        "resource_state": resource_state or "unknown",
        "action": "ack_only",
        "http_status": 200,
    }


def hmac_compare(a: str, b: str) -> bool:
    import hmac as _hmac

    return _hmac.compare_digest(a, b)


def stop_calendar_watch(db: Session, *, user_id: int, channel_id: str) -> dict[str, Any]:
    row = (
        db.query(GoogleCalendarPushChannel)
        .filter(
            GoogleCalendarPushChannel.user_id == user_id,
            GoogleCalendarPushChannel.channel_id == channel_id,
        )
        .one_or_none()
    )
    if row is None:
        return {"ok": False, "reason": "channel_not_found"}
    row.status = "stopped"
    db.commit()
    return {"ok": True, "channel_id": channel_id, "status": "stopped"}
