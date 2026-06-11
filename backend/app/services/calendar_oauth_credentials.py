"""Resolve Google/Microsoft calendar access tokens with DB cache + refresh retry semantics."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal, Protocol

from sqlalchemy.orm import Session

from app.database.models import UserGoogleCalendar, UserMicrosoftCalendar
from app.services.google_calendar_oauth import (
    GoogleCalendarOAuthError,
    GoogleTokenRefreshResult,
    refresh_google_calendar_tokens,
)
from app.services.microsoft_calendar_oauth import (
    MicrosoftCalendarOAuthError,
    refresh_microsoft_calendar_tokens,
)
from app.services.token_crypto import decrypt_secret, encrypt_secret

CalendarProviderKind = Literal["google", "microsoft"]
CalendarTokenStatus = Literal[
    "not_connected",
    "connected",
    "refreshing",
    "reconnect_required",
    "temporary_error",
    "error",
]
CalendarHealth = Literal["ok", "reconnect_required", "temporary_error", "error", "unknown"]

ACCESS_TOKEN_BUFFER_SECONDS = 90

GOOGLE_RECONNECT_MSG = "Calendar token expired or revoked; reconnect Google Calendar."
MICROSOFT_RECONNECT_MSG = "Microsoft token expired or revoked; reconnect Microsoft Calendar."


@dataclass(frozen=True)
class CalendarAccessToken:
    token: str
    from_cache: bool


@dataclass(frozen=True)
class CalendarTokenResolutionError(Exception):
    status: CalendarTokenStatus
    health: CalendarHealth
    message: str
    code: str | None = None

    @property
    def can_reconnect(self) -> bool:
        return self.status == "reconnect_required"

    @property
    def can_retry(self) -> bool:
        return self.status == "temporary_error"


@dataclass(frozen=True)
class CalendarProviderStatusPayload:
    provider: CalendarProviderKind
    connected: bool
    status: CalendarTokenStatus
    health: CalendarHealth
    message: str | None
    code: str | None
    can_reconnect: bool
    can_retry: bool
    email: str | None


class _CalendarRow(Protocol):
    refresh_token_encrypted: str | None
    access_token_encrypted: str | None
    access_token_expires_at: datetime | None
    updated_at: datetime | None


def get_best_google_row(db: Session, user_id: int) -> UserGoogleCalendar | None:
    return (
        db.query(UserGoogleCalendar)
        .filter(UserGoogleCalendar.user_id == user_id)
        .order_by(UserGoogleCalendar.updated_at.desc())
        .first()
    )


def get_best_microsoft_row(db: Session, user_id: int) -> UserMicrosoftCalendar | None:
    return (
        db.query(UserMicrosoftCalendar)
        .filter(UserMicrosoftCalendar.user_id == user_id)
        .order_by(UserMicrosoftCalendar.updated_at.desc())
        .first()
    )


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def access_token_still_valid(row: _CalendarRow) -> bool:
    if not row.access_token_encrypted or not row.access_token_expires_at:
        return False
    expires = _as_utc(row.access_token_expires_at)
    return expires > _utcnow() + timedelta(seconds=ACCESS_TOKEN_BUFFER_SECONDS)


def _classify_oauth_failure(exc: Exception, *, provider: CalendarProviderKind) -> CalendarTokenResolutionError:
    text = str(exc).lower()
    if any(m in text for m in ("timeout", "timed out", "connect timeout", "read timeout")):
        return CalendarTokenResolutionError(
            status="temporary_error",
            health="temporary_error",
            message="Calendar provider temporarily unavailable; try again shortly.",
            code="provider_timeout",
        )
    if any(m in text for m in ("429", "500", "502", "503", "rate limit", "temporarily unavailable")):
        return CalendarTokenResolutionError(
            status="temporary_error",
            health="temporary_error",
            message="Calendar provider temporarily unavailable; try again shortly.",
            code="provider_transient",
        )
    if any(m in text for m in ("invalid_grant", "invalid_credentials", "revoked", "token has been expired")):
        return CalendarTokenResolutionError(
            status="reconnect_required",
            health="reconnect_required",
            message=MICROSOFT_RECONNECT_MSG if provider == "microsoft" else GOOGLE_RECONNECT_MSG,
            code="invalid_grant",
        )
    return CalendarTokenResolutionError(
        status="error",
        health="error",
        message="Calendar connection error.",
        code="provider_error",
    )


def _persist_google_tokens(db: Session, row: UserGoogleCalendar, result: GoogleTokenRefreshResult) -> None:
    row.access_token_encrypted = encrypt_secret(result.access_token)
    row.access_token_expires_at = _utcnow().replace(tzinfo=None) + timedelta(seconds=result.expires_in)
    if result.refresh_token:
        row.refresh_token_encrypted = encrypt_secret(result.refresh_token)
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()


def resolve_google_access_token(db: Session, row: UserGoogleCalendar, *, force_refresh: bool = False) -> CalendarAccessToken:
    if not row.refresh_token_encrypted:
        raise CalendarTokenResolutionError(
            status="reconnect_required",
            health="reconnect_required",
            message=GOOGLE_RECONNECT_MSG,
            code="missing_refresh_token",
        )
    if not force_refresh and access_token_still_valid(row):
        return CalendarAccessToken(decrypt_secret(row.access_token_encrypted or ""), True)
    try:
        plain_refresh = decrypt_secret(row.refresh_token_encrypted)
        result = refresh_google_calendar_tokens(plain_refresh)
    except GoogleCalendarOAuthError as exc:
        raise _classify_oauth_failure(exc, provider="google") from exc
    _persist_google_tokens(db, row, result)
    return CalendarAccessToken(result.access_token, False)


def _persist_microsoft_tokens(db: Session, row: UserMicrosoftCalendar, result: GoogleTokenRefreshResult) -> None:
    row.access_token_encrypted = encrypt_secret(result.access_token)
    row.access_token_expires_at = _utcnow().replace(tzinfo=None) + timedelta(seconds=result.expires_in)
    if result.refresh_token:
        row.refresh_token_encrypted = encrypt_secret(result.refresh_token)
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()


def resolve_microsoft_access_token(db: Session, row: UserMicrosoftCalendar, *, force_refresh: bool = False) -> CalendarAccessToken:
    if not row.refresh_token_encrypted:
        raise CalendarTokenResolutionError(
            status="reconnect_required", health="reconnect_required", message=MICROSOFT_RECONNECT_MSG, code="missing_refresh_token",
        )
    if not force_refresh and access_token_still_valid(row):
        return CalendarAccessToken(decrypt_secret(row.access_token_encrypted or ""), True)
    try:
        result = refresh_microsoft_calendar_tokens(decrypt_secret(row.refresh_token_encrypted))
    except MicrosoftCalendarOAuthError as exc:
        raise _classify_oauth_failure(exc, provider="microsoft") from exc
    _persist_microsoft_tokens(db, row, result)
    return CalendarAccessToken(result.access_token, False)


def store_google_tokens_from_exchange(
    db: Session,
    row: UserGoogleCalendar,
    *,
    access_token: str,
    expires_in: int,
    refresh_token: str | None,
) -> None:
    row.access_token_encrypted = encrypt_secret(access_token)
    row.access_token_expires_at = _utcnow().replace(tzinfo=None) + timedelta(seconds=max(expires_in, 60))
    if refresh_token:
        row.refresh_token_encrypted = encrypt_secret(refresh_token)
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()


def provider_status_payload(
    *,
    provider: CalendarProviderKind,
    connected: bool,
    status: CalendarTokenStatus,
    health: CalendarHealth,
    message: str | None,
    code: str | None,
    email: str | None,
) -> CalendarProviderStatusPayload:
    return CalendarProviderStatusPayload(
        provider=provider,
        connected=connected,
        status=status,
        health=health,
        message=message,
        code=code,
        can_reconnect=status == "reconnect_required",
        can_retry=status == "temporary_error",
        email=email,
    )


def calendar_upstream_transient(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(m in text for m in ('"code": 429', '"code": 500', '"code": 503', "rate limit", "backend error"))
