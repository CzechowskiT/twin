"""In-app notifications + channel architecture stubs (email/Slack/push later)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import FounderCommandNotification


def notify_founder(
    db: Session,
    *,
    command_id: str,
    kind: str,
    title: str,
    body: str,
    links: dict[str, str] | None = None,
) -> FounderCommandNotification:
    row = FounderCommandNotification(
        id=str(uuid.uuid4()),
        command_id=command_id,
        kind=kind,
        title=title[:256],
        body=body[:4000],
        links_json=json.dumps(links or {}, separators=(",", ":")),
        channel="in_app",
        read_at=None,
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.flush()
    # Future: enqueue email / Slack / push adapters without changing call sites.
    return row


def list_notifications(
    db: Session, *, command_id: str | None = None, unread_only: bool = False, limit: int = 50
) -> list[dict[str, Any]]:
    q = select(FounderCommandNotification).order_by(FounderCommandNotification.created_at.desc())
    if command_id:
        q = q.where(FounderCommandNotification.command_id == command_id)
    if unread_only:
        q = q.where(FounderCommandNotification.read_at.is_(None))
    rows = db.execute(q.limit(limit)).scalars().all()
    out = []
    for r in rows:
        try:
            links = json.loads(r.links_json or "{}")
        except json.JSONDecodeError:
            links = {}
        out.append(
            {
                "id": r.id,
                "command_id": r.command_id,
                "kind": r.kind,
                "title": r.title,
                "body": r.body,
                "links": links,
                "channel": r.channel,
                "read_at": r.read_at.isoformat() + "Z" if r.read_at else None,
                "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
            }
        )
    return out


def mark_notification_read(db: Session, notification_id: str) -> bool:
    row = db.get(FounderCommandNotification, notification_id)
    if not row:
        return False
    row.read_at = datetime.utcnow()
    db.flush()
    return True


NOTIFICATION_CHANNEL_ARCHITECTURE = {
    "in_app": "shipped",
    "email": "planned — Resend transactional adapter",
    "slack": "planned — incoming webhook adapter",
    "push": "planned — Web Push subscription store",
}
