"""Google Calendar push notification channels — built, credential-gated.

Requires GOOGLE_CALENDAR_PUSH_WEBHOOK_URL (public HTTPS) + connected Google OAuth.
Without credentials / public URL → BLOCKED_EXTERNAL_CREDENTIALS (not Founder HELD_POLICY).
"""

from __future__ import annotations

import logging
import os
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.google_calendar_oauth import is_google_calendar_oauth_configured

logger = logging.getLogger(__name__)


def google_push_status() -> dict[str, Any]:
    webhook = (os.environ.get("GOOGLE_CALENDAR_PUSH_WEBHOOK_URL") or "").strip()
    oauth_ok = is_google_calendar_oauth_configured()
    if not oauth_ok:
        return {
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "Google Calendar OAuth client not configured",
            "watch_supported": False,
        }
    if not webhook.startswith("https://"):
        return {
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "GOOGLE_CALENDAR_PUSH_WEBHOOK_URL must be public HTTPS",
            "watch_supported": False,
        }
    return {
        "status": "READY",
        "blocker": None,
        "reason": "OAuth + webhook URL configured — watch channels can be started per user",
        "watch_supported": True,
        "webhook_configured": True,
    }


def start_calendar_watch(db: Session, *, user_id: int, access_token: str) -> dict[str, Any]:
    """Register a Google Calendar events.watch channel when credentials allow."""
    status = google_push_status()
    if status.get("status") != "READY":
        return {**status, "ok": False}
    webhook = (os.environ.get("GOOGLE_CALENDAR_PUSH_WEBHOOK_URL") or "").strip()
    try:
        import httpx
    except ImportError:
        return {"ok": False, "blocker": "BLOCKED_EXTERNAL_CREDENTIALS", "reason": "httpx missing"}
    # Google Calendar API events.watch — channel id is opaque to Google
    channel_id = f"twin-gcal-{user_id}"
    body = {
        "id": channel_id,
        "type": "web_hook",
        "address": webhook,
    }
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json=body,
            )
        if res.status_code >= 400:
            logger.warning("google watch failed status=%s body=%s", res.status_code, res.text[:200])
            return {
                "ok": False,
                "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
                "reason": f"Google watch HTTP {res.status_code}",
                "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            }
        data = res.json()
        return {
            "ok": True,
            "status": "LIVE",
            "channel_id": data.get("id"),
            "resource_id": data.get("resourceId"),
            "expiration": data.get("expiration"),
        }
    except Exception as exc:
        logger.warning("google watch exception: %s", exc)
        return {
            "ok": False,
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "watch_request_failed",
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
        }


def handle_push_notification(*, channel_id: str | None, resource_state: str | None) -> dict[str, Any]:
    """Ack Google push notification (sync trigger only — no secrets logged)."""
    return {
        "ok": True,
        "received": True,
        "channel_id_present": bool(channel_id),
        "resource_state": resource_state or "unknown",
        "action": "ack_only",
    }
