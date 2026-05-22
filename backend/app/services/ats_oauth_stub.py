"""ATS OAuth connect stubs (persist state; full OAuth when vendor apps are configured)."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import RecruiterAtsOAuthConnection

_OAUTH_PROVIDERS = frozenset({"greenhouse", "lever"})
_CONNECTABLE = frozenset()  # empty until env credentials ship


def list_connections(db: Session, user_id: int) -> list[RecruiterAtsOAuthConnection]:
    return (
        db.query(RecruiterAtsOAuthConnection)
        .filter(RecruiterAtsOAuthConnection.user_id == user_id)
        .order_by(RecruiterAtsOAuthConnection.provider)
        .all()
    )


def start_connect_stub(db: Session, *, user_id: int, provider: str) -> RecruiterAtsOAuthConnection:
    pid = provider.strip().lower()
    if pid not in _OAUTH_PROVIDERS:
        raise ValueError("unsupported_provider")

    state = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    row = (
        db.query(RecruiterAtsOAuthConnection)
        .filter(
            RecruiterAtsOAuthConnection.user_id == user_id,
            RecruiterAtsOAuthConnection.provider == pid,
        )
        .first()
    )
    if row:
        row.oauth_state = state
        row.status = "pending"
        row.updated_at = now
    else:
        row = RecruiterAtsOAuthConnection(
            user_id=user_id,
            provider=pid,
            status="pending",
            oauth_state=state,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    db.flush()
    return row


def oauth_available(provider: str) -> bool:
    return provider.strip().lower() in _CONNECTABLE
