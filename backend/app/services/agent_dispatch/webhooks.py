"""Webhook signature verification + payload mapping (Cursor docs 2026-07-16)."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any


def verify_cursor_webhook_signature(*, secret: str, raw_body: bytes, signature: str | None) -> bool:
    """HMAC-SHA256; header format `sha256=<hex>` per Cursor webhook docs."""
    if not secret or not signature:
        return False
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip())


def map_webhook_to_fields(payload: dict[str, Any]) -> dict[str, Any]:
    """Extract dispatcher-relevant fields from Cursor statusChange payload."""
    target = payload.get("target") or {}
    source = payload.get("source") or {}
    return {
        "event": payload.get("event"),
        "cursor_agent_id": payload.get("id"),
        "cursor_status": payload.get("status"),
        "summary": payload.get("summary"),
        "branch_name": target.get("branchName"),
        "pr_url": target.get("prUrl"),
        "agent_url": target.get("url"),
        "repository": source.get("repository"),
        "ref": source.get("ref"),
        "timestamp": payload.get("timestamp"),
    }
