"""Append-only audit for Founder Command Center (no secrets)."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import FounderCommandAuditEvent


_SECRET_KEYS = {
    "token",
    "secret",
    "password",
    "authorization",
    "api_key",
    "private_key",
    "ciphertext",
    "prompt",
}


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            key = str(k).lower()
            if any(s in key for s in _SECRET_KEYS):
                out[k] = "[redacted]"
            else:
                out[k] = _redact(v)
        return out
    if isinstance(value, list):
        return [_redact(v) for v in value[:50]]
    if isinstance(value, str) and len(value) > 2000:
        return value[:2000] + "…"
    return value


def write_founder_audit(
    db: Session,
    *,
    command_id: str | None,
    event_type: str,
    actor_fingerprint: str | None,
    detail: dict[str, Any] | None = None,
) -> FounderCommandAuditEvent:
    row = FounderCommandAuditEvent(
        command_id=command_id,
        event_type=event_type,
        actor_fingerprint=actor_fingerprint,
        detail_json=json.dumps(_redact(detail or {}), separators=(",", ":"), sort_keys=True),
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.flush()
    return row
