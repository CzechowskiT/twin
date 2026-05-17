"""Google Calendar connect + minimal API (free/busy, create event)."""

from __future__ import annotations

from datetime import datetime
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, decode_access_token
from app.database.models import User, UserGoogleCalendar
from app.database.session import get_db
from app.services.google_calendar_api import GoogleCalendarApiError, insert_primary_event, query_freebusy
from app.services.google_calendar_oauth import (
    GoogleCalendarOAuthError,
    build_google_calendar_authorize_url,
    exchange_google_calendar_code,
    is_google_calendar_oauth_configured,
    refresh_google_calendar_access_token,
)
from app.services.token_crypto import decrypt_secret, encrypt_secret

router = APIRouter()

_CALENDAR_STATE_PREFIX = "gcal:"


def _frontend_calendar_redirect(**params: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    query = urlencode(params)
    return f"{base}/dashboard/calendar?{query}" if query else f"{base}/dashboard/calendar"


def _calendar_oauth_state_for_user(user_id: int) -> str:
    return create_access_token(f"{_CALENDAR_STATE_PREFIX}{user_id}", expires_minutes=15)


def _parse_calendar_oauth_user_id(state: str) -> int | None:
    sub = decode_access_token(state)
    if not sub or not sub.startswith(_CALENDAR_STATE_PREFIX):
        return None
    tail = sub[len(_CALENDAR_STATE_PREFIX) :]
    try:
        return int(tail)
    except ValueError:
        return None


def _calendar_access_token(db: Session, user_id: int) -> str:
    row = db.query(UserGoogleCalendar).filter(UserGoogleCalendar.user_id == user_id).first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar is not connected",
        )
    try:
        plain = decrypt_secret(row.refresh_token_encrypted)
        return refresh_google_calendar_access_token(plain)
    except GoogleCalendarOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Calendar token expired or revoked; reconnect Google Calendar.",
        ) from e


class CalendarStatusOut(BaseModel):
    connected: bool
    google_email: str | None = None


class CalendarAuthorizeOut(BaseModel):
    authorize_url: str


class CalendarFreeBusyIn(BaseModel):
    time_min: str = Field(..., description="RFC3339 instant")
    time_max: str = Field(..., description="RFC3339 instant")


class CalendarFreeBusyBlock(BaseModel):
    start: str
    end: str


class CalendarFreeBusyOut(BaseModel):
    busy: list[CalendarFreeBusyBlock]


class CalendarCreateEventIn(BaseModel):
    summary: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(None, max_length=8000)
    start_iso: str
    end_iso: str
    time_zone: str = Field("UTC", max_length=80)


class CalendarCreateEventOut(BaseModel):
    id: str | None = None
    html_link: str | None = None


@router.get("/google/status", response_model=CalendarStatusOut)
def google_calendar_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarStatusOut:
    row = db.query(UserGoogleCalendar).filter(UserGoogleCalendar.user_id == current_user.id).first()
    if not row:
        return CalendarStatusOut(connected=False)
    return CalendarStatusOut(connected=True, google_email=row.google_email)


@router.get("/google/authorize", response_model=CalendarAuthorizeOut)
def google_calendar_authorize(current_user: User = Depends(get_current_user)) -> CalendarAuthorizeOut:
    if not is_google_calendar_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar OAuth is not configured on this server",
        )
    try:
        state = _calendar_oauth_state_for_user(current_user.id)
        url = build_google_calendar_authorize_url(state)
    except GoogleCalendarOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
    return CalendarAuthorizeOut(authorize_url=url)


@router.get("/google/callback")
def google_calendar_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="google_denied"), status_code=302)
    user_id = _parse_calendar_oauth_user_id(state or "")
    if user_id is None or not code:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="invalid_state"), status_code=302)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="invalid_state"), status_code=302)
    try:
        refresh_plain, google_email = exchange_google_calendar_code(code)
    except GoogleCalendarOAuthError:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="exchange_failed"), status_code=302)
    if not refresh_plain:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="no_refresh_token"), status_code=302)

    enc = encrypt_secret(refresh_plain)
    now = datetime.utcnow()
    row = db.query(UserGoogleCalendar).filter(UserGoogleCalendar.user_id == user_id).first()
    if row:
        row.refresh_token_encrypted = enc
        row.google_email = google_email
        row.updated_at = now
    else:
        db.add(
            UserGoogleCalendar(
                user_id=user_id,
                refresh_token_encrypted=enc,
                google_email=google_email,
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()
    return RedirectResponse(_frontend_calendar_redirect(calendar_connected="1"), status_code=302)


@router.delete("/google", status_code=status.HTTP_204_NO_CONTENT)
def google_calendar_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(UserGoogleCalendar).filter(UserGoogleCalendar.user_id == current_user.id).first()
    if row:
        db.delete(row)
        db.commit()


@router.post("/google/freebusy", response_model=CalendarFreeBusyOut)
def google_calendar_freebusy(
    body: CalendarFreeBusyIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarFreeBusyOut:
    access = _calendar_access_token(db, current_user.id)
    try:
        raw = query_freebusy(access, body.time_min, body.time_max)
    except GoogleCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Calendar free/busy failed") from e
    cal = (raw.get("calendars") or {}).get("primary") or {}
    busy_raw = cal.get("busy") or []
    busy: list[CalendarFreeBusyBlock] = []
    for b in busy_raw:
        if isinstance(b, dict) and b.get("start") and b.get("end"):
            busy.append(CalendarFreeBusyBlock(start=str(b["start"]), end=str(b["end"])))
    return CalendarFreeBusyOut(busy=busy)


@router.post("/google/events", response_model=CalendarCreateEventOut)
def google_calendar_create_event(
    body: CalendarCreateEventIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarCreateEventOut:
    access = _calendar_access_token(db, current_user.id)
    try:
        created = insert_primary_event(
            access,
            summary=body.summary,
            description=body.description,
            start_iso=body.start_iso,
            end_iso=body.end_iso,
            time_zone=body.time_zone,
        )
    except GoogleCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Calendar create event failed") from e
    return CalendarCreateEventOut(id=created.get("id"), html_link=created.get("htmlLink"))
