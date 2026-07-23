"""Best-effort outbound webhook when auto-apply succeeds (B2B / ATS integrations)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


def dispatch_auto_apply_webhook(
    settings: Settings,
    *,
    application_id: int | None,
    job_id: int,
    user_id: int,
    outcome: str,
) -> None:
    url = (settings.employer_webhook_url or "").strip()
    if not url:
        return
    try:
        from app.services.url_safety import assert_public_https_url

        assert_public_https_url(url)
    except ValueError:
        logger.warning("employer webhook URL blocked by SSRF guard")
        return
    secret = (settings.employer_webhook_secret or "").strip()
    payload: dict[str, Any] = {
        "event": "twin.auto_apply.finished",
        "user_id": user_id,
        "job_id": job_id,
        "application_id": application_id,
        "outcome": outcome,
    }
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if secret:
        sig = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        headers["X-Twin-Signature"] = f"sha256={sig}"
    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.post(url, content=body, headers=headers)
            if r.status_code >= 400:
                logger.warning("employer webhook HTTP %s: %s", r.status_code, r.text[:500])
    except Exception as exc:  # pragma: no cover - network
        logger.warning("employer webhook failed: %s", exc)
