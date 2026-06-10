"""Probe Google/Microsoft calendar OAuth rows for integration health (no live API calls beyond token refresh)."""

from __future__ import annotations

from typing import Literal

from sqlalchemy.orm import Session

from app.database.models import UserGoogleCalendar, UserMicrosoftCalendar
from app.services.google_calendar_oauth import GoogleCalendarOAuthError, refresh_google_calendar_access_token
from app.services.microsoft_calendar_oauth import MicrosoftCalendarOAuthError, refresh_microsoft_calendar_access_token
from app.services.token_crypto import decrypt_secret

CalendarProviderHealth = Literal["ok", "reconnect_required", "error", "unknown"]

_GOOGLE_RECONNECT_MSG = "Calendar token expired or revoked; reconnect Google Calendar."
_MICROSOFT_RECONNECT_MSG = "Microsoft token expired or revoked; reconnect Microsoft Calendar."


def probe_google_calendar_health(db: Session, user_id: int) -> tuple[bool, CalendarProviderHealth, str | None, str | None]:
    """Return (connected_row, health, message, google_email)."""
    row = db.query(UserGoogleCalendar).filter(UserGoogleCalendar.user_id == user_id).first()
    if not row:
        return False, "unknown", None, None
    email = row.google_email
    try:
        plain = decrypt_secret(row.refresh_token_encrypted)
        refresh_google_calendar_access_token(plain)
        return True, "ok", None, email
    except GoogleCalendarOAuthError:
        return True, "reconnect_required", _GOOGLE_RECONNECT_MSG, email
    except Exception:
        return True, "error", "Google Calendar connection error.", email


def probe_microsoft_calendar_health(
    db: Session, user_id: int
) -> tuple[bool, CalendarProviderHealth, str | None, str | None]:
    """Return (connected_row, health, message, microsoft_email)."""
    row = db.query(UserMicrosoftCalendar).filter(UserMicrosoftCalendar.user_id == user_id).first()
    if not row:
        return False, "unknown", None, None
    email = row.microsoft_email
    try:
        plain = decrypt_secret(row.refresh_token_encrypted)
        refresh_microsoft_calendar_access_token(plain)
        return True, "ok", None, email
    except MicrosoftCalendarOAuthError:
        return True, "reconnect_required", _MICROSOFT_RECONNECT_MSG, email
    except Exception:
        return True, "error", "Microsoft Calendar connection error.", email
