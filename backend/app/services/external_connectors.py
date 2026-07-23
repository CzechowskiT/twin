"""External messaging connectors — capability-split, credential-gated.

Slack / Teams: draft+preview always available; OAuth/delivery require founder
provider credentials. Missing delivery secrets → BLOCKED_EXTERNAL_CREDENTIALS
only on WRITE/delivery capabilities — not Founder HELD_POLICY.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import WebhookDeliveryAttempt
from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured
from app.services.zapier_generic_webhook import zapier_status as zapier_generic_status

logger = logging.getLogger(__name__)


def _env(*names: str) -> str:
    for n in names:
        v = (os.environ.get(n) or "").strip()
        if v:
            return v
    return ""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slack_connector_status() -> dict[str, Any]:
    client_id = _env("SLACK_CLIENT_ID", "TWIN_SLACK_CLIENT_ID")
    client_secret = _env("SLACK_CLIENT_SECRET", "TWIN_SLACK_CLIENT_SECRET")
    webhook = _env("SLACK_INCOMING_WEBHOOK_URL", "TWIN_SLACK_WEBHOOK_URL")
    oauth_ok = bool(client_id and client_secret)
    delivery_ok = webhook.startswith("https://")
    return {
        "connector": "slack",
        "status": "READY" if (oauth_ok or delivery_ok) else "PARTIAL",
        "blocker": None
        if (oauth_ok or delivery_ok)
        else "BLOCKED_EXTERNAL_CREDENTIALS",
        "reason": (
            "OAuth and/or incoming webhook configured"
            if (oauth_ok or delivery_ok)
            else "SLACK_CLIENT_ID/SECRET and SLACK_INCOMING_WEBHOOK_URL unset"
        ),
        "delivery": delivery_ok,
        "capabilities": {
            "CONFIGURATION": "LIVE" if oauth_ok else "BLOCKED_EXTERNAL_CREDENTIALS",
            "READ": "BLOCKED_EXTERNAL_CREDENTIALS" if not oauth_ok else "LIVE",
            "DRAFT": "LIVE",
            "WRITE": "LIVE" if delivery_ok else "BLOCKED_EXTERNAL_CREDENTIALS",
            "MONITORING": "LIVE",
        },
        "oauth_configured": oauth_ok,
        "webhook_configured": delivery_ok,
    }


def teams_connector_status() -> dict[str, Any]:
    """Split Graph OAuth (shared MS app) vs Teams incoming webhook write."""
    ms_oauth = is_microsoft_calendar_oauth_configured()
    webhook = _env("TEAMS_INCOMING_WEBHOOK_URL", "TWIN_TEAMS_WEBHOOK_URL")
    delivery_ok = webhook.startswith("https://")
    return {
        "connector": "teams",
        "status": "PARTIAL" if ms_oauth and not delivery_ok else ("READY" if delivery_ok else "PARTIAL"),
        "blocker": None if ms_oauth else "BLOCKED_EXTERNAL_CREDENTIALS",
        "reason": (
            "Microsoft OAuth present — connect/draft LIVE; channel write needs Teams webhook or Graph consent"
            if ms_oauth
            else "Microsoft OAuth unset"
        ),
        "delivery": delivery_ok,
        "capabilities": {
            "CONFIGURATION": "LIVE" if ms_oauth else "BLOCKED_EXTERNAL_CREDENTIALS",
            "READ": "PARTIAL" if ms_oauth else "BLOCKED_EXTERNAL_CREDENTIALS",
            "DRAFT": "LIVE",
            "WRITE": "LIVE" if delivery_ok else "BLOCKED_EXTERNAL_CREDENTIALS",
            "MONITORING": "LIVE",
        },
        "microsoft_oauth_configured": ms_oauth,
        "webhook_configured": delivery_ok,
        "graph_teams_admin_consent": "UNKNOWN",
    }


def zapier_connector_status(*, public_api_base: str | None = None) -> dict[str, Any]:
    return zapier_generic_status(public_api_base=public_api_base)


def draft_notification(
    *,
    connector: str,
    title: str,
    body: str,
) -> dict[str, Any]:
    """Internal draft/preview — never posts to Slack/Teams."""
    title_s = (title or "").strip()[:120] or "TWIN connector draft"
    body_s = (body or "").strip()[:2000] or "Synthetic preview only"
    digest = hashlib.sha256(f"{connector}:{title_s}:{body_s}".encode()).hexdigest()[:16]
    return {
        "ok": True,
        "connector": connector,
        "draft": True,
        "provider_write": False,
        "preview": {
            "title": title_s,
            "body": body_s,
            "fingerprint": digest,
            "created_at": _utcnow().isoformat(),
        },
    }


def internal_test_post(
    db: Session,
    *,
    connector: str,
    title: str,
    body: str,
) -> dict[str, Any]:
    """Post only when incoming webhook URL is configured; otherwise credential block."""
    draft = draft_notification(connector=connector, title=title, body=body)
    if connector == "slack":
        url = _env("SLACK_INCOMING_WEBHOOK_URL", "TWIN_SLACK_WEBHOOK_URL")
        payload = {"text": f"[TWIN smoke] {draft['preview']['title']}: {draft['preview']['body'][:200]}"}
    elif connector == "teams":
        url = _env("TEAMS_INCOMING_WEBHOOK_URL", "TWIN_TEAMS_WEBHOOK_URL")
        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary": draft["preview"]["title"],
            "text": draft["preview"]["body"][:500],
        }
    else:
        return {**draft, "ok": False, "blocker": "unsupported_connector"}

    if not url.startswith("https://"):
        return {
            **draft,
            "ok": False,
            "delivered": False,
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": f"{connector}_webhook_unset",
        }

    try:
        import httpx

        with httpx.Client(timeout=15.0) as client:
            res = client.post(url, json=payload)
        ok = 200 <= res.status_code < 300
        db.add(
            WebhookDeliveryAttempt(
                provider=connector,
                direction="outbound",
                event_type=f"{connector}.internal_test_post",
                idempotency_key=f"{connector}:{draft['preview']['fingerprint']}",
                signature_ok=True,
                replay_rejected=False,
                status="delivered" if ok else "failed",
                http_status=res.status_code,
                attempt_n=1,
                error_code=None if ok else f"http_{res.status_code}",
                meta_json=json.dumps({"smoke": True, "provider_write": True}),
            )
        )
        db.commit()
        return {
            **draft,
            "ok": ok,
            "delivered": ok,
            "http_status": res.status_code,
            "provider_write": True,
        }
    except Exception as exc:
        logger.warning("%s test post failed: %s", connector, type(exc).__name__)
        return {
            **draft,
            "ok": False,
            "delivered": False,
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "delivery_transport_error",
        }


def all_connector_statuses(*, public_api_base: str | None = None) -> dict[str, Any]:
    return {
        "slack": slack_connector_status(),
        "teams": teams_connector_status(),
        "zapier": zapier_connector_status(public_api_base=public_api_base),
        "external_delivery_default": False,
    }
