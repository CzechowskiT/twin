"""Audit helpers — never persist raw secrets; redact free text."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import AgentDispatchAuditEvent
from app.services.agent_dispatch.prompt_envelope import redact_secrets


def write_audit(
    db: Session,
    *,
    run_id: str | None,
    event_type: str,
    actor_fingerprint: str | None,
    detail: dict[str, Any] | None = None,
) -> AgentDispatchAuditEvent:
    safe = redact_secrets(json.dumps(detail or {}, default=str))
    row = AgentDispatchAuditEvent(
        run_id=run_id,
        event_type=event_type,
        actor_fingerprint=actor_fingerprint,
        detail_json=safe,
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.flush()
    return row
