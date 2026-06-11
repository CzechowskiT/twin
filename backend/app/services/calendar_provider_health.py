"""Probe Google/Microsoft calendar OAuth rows for integration health."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.services.calendar_oauth_credentials import (
    CalendarProviderStatusPayload,
    GOOGLE_RECONNECT_MSG,
    MICROSOFT_RECONNECT_MSG,
    CalendarTokenResolutionError,
    access_token_still_valid,
    get_best_google_row,
    get_best_microsoft_row,
    provider_status_payload,
    resolve_google_access_token,
    resolve_microsoft_access_token,
)


def calendar_upstream_auth_failure(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(m in text for m in ('"code": 401', '"code": 403', "invalid_grant", "unauthorized"))


def microsoft_unsupported_account_failure(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        m in text
        for m in (
            "mailboxnotenabledforrestapi",
            "mailbox not enabled for rest api",
            "unsupported microsoft",
            "personal microsoft account",
        )
    )


def probe_google_calendar_health(db: Session, user_id: int) -> CalendarProviderStatusPayload:
    row = get_best_google_row(db, user_id)
    if not row:
        return provider_status_payload(
            provider="google", connected=False, status="not_connected", health="unknown",
            message=None, code=None, email=None,
        )
    if not row.refresh_token_encrypted:
        return provider_status_payload(
            provider="google", connected=True, status="reconnect_required", health="reconnect_required",
            message=GOOGLE_RECONNECT_MSG, code="missing_refresh_token", email=row.google_email,
        )
    if access_token_still_valid(row):
        return provider_status_payload(
            provider="google", connected=True, status="connected", health="ok",
            message=None, code=None, email=row.google_email,
        )
    try:
        resolve_google_access_token(db, row)
        return provider_status_payload(
            provider="google", connected=True, status="connected", health="ok",
            message=None, code=None, email=row.google_email,
        )
    except CalendarTokenResolutionError as exc:
        return provider_status_payload(
            provider="google", connected=True, status=exc.status, health=exc.health,
            message=exc.message, code=exc.code, email=row.google_email,
        )


def probe_microsoft_calendar_health(db: Session, user_id: int) -> CalendarProviderStatusPayload:
    row = get_best_microsoft_row(db, user_id)
    if not row:
        return provider_status_payload(
            provider="microsoft", connected=False, status="not_connected", health="unknown",
            message=None, code=None, email=None,
        )
    if not row.refresh_token_encrypted:
        return provider_status_payload(
            provider="microsoft", connected=True, status="reconnect_required", health="reconnect_required",
            message=MICROSOFT_RECONNECT_MSG, code="missing_refresh_token", email=row.microsoft_email,
        )
    if access_token_still_valid(row):
        return provider_status_payload(
            provider="microsoft", connected=True, status="connected", health="ok",
            message=None, code=None, email=row.microsoft_email,
        )
    try:
        resolve_microsoft_access_token(db, row)
        return provider_status_payload(
            provider="microsoft", connected=True, status="connected", health="ok",
            message=None, code=None, email=row.microsoft_email,
        )
    except CalendarTokenResolutionError as exc:
        return provider_status_payload(
            provider="microsoft", connected=True, status=exc.status, health=exc.health,
            message=exc.message, code=exc.code, email=row.microsoft_email,
        )
