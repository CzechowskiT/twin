"""Recruiter ATS OAuth (Greenhouse MVP; Lever placeholder)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database.models import RecruiterAtsOAuthConnection
from app.services import greenhouse_oauth as gh_oauth
from app.services.token_crypto import encrypt_secret

_OAUTH_PROVIDERS = frozenset({"greenhouse", "lever"})


def oauth_available(provider: str) -> bool:
    pid = provider.strip().lower()
    if pid == "greenhouse":
        return gh_oauth.is_greenhouse_oauth_configured()
    return False


def list_connections(db: Session, user_id: int) -> list[RecruiterAtsOAuthConnection]:
    return (
        db.query(RecruiterAtsOAuthConnection)
        .filter(RecruiterAtsOAuthConnection.user_id == user_id)
        .order_by(RecruiterAtsOAuthConnection.provider)
        .all()
    )


def start_connect(
    db: Session, *, user_id: int, provider: str
) -> tuple[RecruiterAtsOAuthConnection, str | None]:
    """Persist CSRF state; return (row, authorize_url) when OAuth is configured."""
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

    authorize_url: str | None = None
    if pid == "greenhouse" and gh_oauth.is_greenhouse_oauth_configured():
        authorize_url = gh_oauth.build_greenhouse_authorize_url(state=state)
    return row, authorize_url


def complete_greenhouse_callback(
    db: Session, *, state: str, code: str
) -> RecruiterAtsOAuthConnection:
    row = (
        db.query(RecruiterAtsOAuthConnection)
        .filter(
            RecruiterAtsOAuthConnection.provider == "greenhouse",
            RecruiterAtsOAuthConnection.oauth_state == state.strip(),
        )
        .first()
    )
    if not row:
        raise ValueError("invalid_state")

    tokens = gh_oauth.exchange_greenhouse_code(code)
    now = datetime.now(timezone.utc)
    row.oauth_access_token_encrypted = encrypt_secret(str(tokens["access_token"]))
    refresh = tokens.get("refresh_token")
    if refresh:
        row.oauth_refresh_token_encrypted = encrypt_secret(str(refresh))
    expires_in = tokens.get("expires_in")
    if expires_in:
        row.oauth_token_expires_at = now + timedelta(seconds=int(expires_in))
    row.status = "connected"
    row.oauth_state = None
    row.updated_at = now
    db.flush()
    return row
