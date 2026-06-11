"""Google Calendar connect + minimal API (free/busy, create event)."""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.limiter import limiter
from app.core.security import create_access_token, decode_access_token
from app.database.models import Application, Candidate, ScheduledInterview, User, UserGoogleCalendar
from app.services.microsoft_calendar_api import MicrosoftCalendarApiError, delete_calendar_event as delete_microsoft_event
from app.database.session import get_db
from app.services.calendar_scheduling import find_free_slots_iso, find_next_slot_iso, freebusy_overlaps_slot
from app.services.google_calendar_api import (
    GoogleCalendarApiError,
    delete_primary_event,
    insert_primary_event,
    list_primary_events,
    query_freebusy,
)
from app.services.calendar_oauth_redirect import (
    dev_calendar_redirect_uri_hints,
    effective_google_calendar_redirect_uri,
    effective_microsoft_calendar_redirect_uri,
)
from app.services.google_calendar_oauth import (
    GoogleCalendarOAuthError,
    build_google_calendar_authorize_url,
    exchange_google_calendar_code,
    is_google_calendar_oauth_configured,
    refresh_google_calendar_access_token,
)
from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured
from app.services.ics_export import interviews_feed_to_ics, scheduled_interview_to_ics
from app.services.calendar_provider_health import GOOGLE_RECONNECT_MSG, calendar_upstream_auth_failure, probe_google_calendar_health
from app.services.token_crypto import decrypt_secret, encrypt_secret

router = APIRouter()

logger = logging.getLogger(__name__)

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
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Calendar token expired or revoked; reconnect Google Calendar.",
        ) from e


class CalendarStatusOut(BaseModel):
    connected: bool
    health: str = Field(
        "unknown",
        description="ok | reconnect_required | error | unknown",
    )
    message: str | None = None
    provider: str = Field("google", description="google | microsoft")
    google_email: str | None = None
    oauth_configured: bool = False
    # Exact URI to whitelist in Google Cloud Console (fixes redirect_uri_mismatch).
    oauth_redirect_uri: str | None = None


class CalendarAuthorizeOut(BaseModel):
    authorize_url: str


class CalendarOAuthProviderOut(BaseModel):
    redirect_uri: str
    oauth_configured: bool


class CalendarOAuthConfigOut(BaseModel):
    """Runtime redirect URIs for Google Cloud / Azure (copy-paste into provider consoles)."""

    google: CalendarOAuthProviderOut
    microsoft: CalendarOAuthProviderOut
    dev_redirect_uris: dict[str, list[str]] = Field(
        default_factory=dev_calendar_redirect_uri_hints,
        description="Extra URIs when testing via localhost:8000 (API) or localhost:3000 (Next proxy).",
    )


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


class CalendarEventOut(BaseModel):
    id: str
    title: str
    start_iso: str
    end_iso: str
    all_day: bool = False
    html_link: str | None = None
    source: str = Field("provider", description="provider | twin")


class CalendarEventsOut(BaseModel):
    events: list[CalendarEventOut]


def _google_event_to_out(item: dict) -> CalendarEventOut | None:
    eid = item.get("id")
    if not eid:
        return None
    start = item.get("start") if isinstance(item.get("start"), dict) else {}
    end = item.get("end") if isinstance(item.get("end"), dict) else {}
    all_day = bool(start.get("date"))
    start_iso = start.get("dateTime") or start.get("date")
    end_iso = end.get("dateTime") or end.get("date")
    if not start_iso or not end_iso:
        return None
    title = str(item.get("summary") or "").strip() or "—"
    return CalendarEventOut(
        id=str(eid),
        title=title,
        start_iso=str(start_iso),
        end_iso=str(end_iso),
        all_day=all_day,
        html_link=item.get("htmlLink") if isinstance(item.get("htmlLink"), str) else None,
        source="provider",
    )


class InterviewIcsTokenOut(BaseModel):
    """One-time style secret URL segment for unauthenticated .ics fetch."""

    token: str
    expires_at: str
    download_path: str


_ICS_SHARE_TOKEN_TTL_DAYS = 30


@router.get("/oauth-config", response_model=CalendarOAuthConfigOut)
def calendar_oauth_config() -> CalendarOAuthConfigOut:
    """Public: exact redirect URIs this API sends to Google/Microsoft (no secrets)."""
    s = get_settings()
    return CalendarOAuthConfigOut(
        google=CalendarOAuthProviderOut(
            redirect_uri=effective_google_calendar_redirect_uri(s),
            oauth_configured=is_google_calendar_oauth_configured(),
        ),
        microsoft=CalendarOAuthProviderOut(
            redirect_uri=effective_microsoft_calendar_redirect_uri(s),
            oauth_configured=is_microsoft_calendar_oauth_configured(),
        ),
    )


@router.get("/google/status", response_model=CalendarStatusOut)
def google_calendar_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarStatusOut:
    oauth_configured = is_google_calendar_oauth_configured()
    redirect_uri = effective_google_calendar_redirect_uri(get_settings()) if oauth_configured else None
    has_row, health, message, google_email = probe_google_calendar_health(db, current_user.id)
    if not has_row:
        return CalendarStatusOut(
            connected=False,
            health="unknown",
            provider="google",
            oauth_configured=oauth_configured,
            oauth_redirect_uri=redirect_uri,
        )
    return CalendarStatusOut(
        connected=True,
        health=health,
        message=message,
        provider="google",
        google_email=google_email,
        oauth_configured=oauth_configured,
        oauth_redirect_uri=redirect_uri,
    )


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
@limiter.limit("10/minute")
def google_calendar_callback(
    request: Request,
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


@router.get("/google/events", response_model=CalendarEventsOut)
def google_calendar_list_events(
    time_min: str = Query(..., description="RFC3339 instant"),
    time_max: str = Query(..., description="RFC3339 instant"),
    limit: int = Query(100, ge=1, le=250),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarEventsOut:
    access = _calendar_access_token(db, current_user.id)
    try:
        raw_items = list_primary_events(access, time_min, time_max, max_results=limit)
    except GoogleCalendarApiError as e:
        if calendar_upstream_auth_failure(e):
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail=GOOGLE_RECONNECT_MSG,
            ) from e
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Calendar list events failed") from e
    events: list[CalendarEventOut] = []
    for item in raw_items:
        out = _google_event_to_out(item)
        if out:
            events.append(out)
    return CalendarEventsOut(events=events)


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


def _parse_instant_iso(iso: str) -> datetime:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _to_db_naive_utc(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _ensure_application_owned(db: Session, user_id: int, application_id: int | None) -> None:
    if application_id is None:
        return
    cand = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No candidate profile for this user",
        )
    row = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == cand.id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )


class NextSlotOut(BaseModel):
    start_iso: str
    end_iso: str


class CalendarSlotOut(BaseModel):
    start_iso: str
    end_iso: str


class CalendarSlotsOut(BaseModel):
    slots: list[CalendarSlotOut]


class ScheduleInterviewIn(BaseModel):
    application_id: int | None = None
    company_name: str = Field(..., min_length=1, max_length=255)
    job_title: str = Field(..., min_length=1, max_length=255)
    interviewer_name: str | None = Field(None, max_length=255)
    interviewer_email: str | None = Field(None, max_length=255)
    start_iso: str
    end_iso: str
    time_zone: str = Field("UTC", max_length=80)
    meeting_link: str | None = Field(None, max_length=500)
    meeting_location: str | None = Field(None, max_length=500)
    interview_type: str = Field("video", max_length=50)
    notes: str | None = Field(None, max_length=8000)


class ScheduledInterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    job_title: str
    interviewer_name: str | None
    interviewer_email: str | None
    interview_start: datetime
    interview_end: datetime
    timezone: str
    meeting_link: str | None
    meeting_location: str | None
    interview_type: str
    status: str
    calendar_event_id: str | None
    calendar_provider: str = "google"


@router.get("/google/slots", response_model=CalendarSlotsOut)
def google_calendar_slots(
    duration_minutes: int = Query(60, ge=15, le=480),
    days_ahead: int = Query(14, ge=1, le=60),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarSlotsOut:
    """Several suggested interview windows from primary-calendar free/busy (same rules as next slot)."""
    access = _calendar_access_token(db, current_user.id)
    now = datetime.now(timezone.utc)
    time_min = now.isoformat().replace("+00:00", "Z")
    time_max = (now + timedelta(days=days_ahead)).isoformat().replace("+00:00", "Z")
    try:
        raw = query_freebusy(access, time_min, time_max)
    except GoogleCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Calendar free/busy failed") from e
    pairs = find_free_slots_iso(
        raw,
        duration_minutes=duration_minutes,
        days_ahead=days_ahead,
        now=now,
        max_slots=limit,
    )
    return CalendarSlotsOut(slots=[CalendarSlotOut(start_iso=a, end_iso=b) for a, b in pairs])


@router.get("/google/slots/next", response_model=NextSlotOut)
def google_calendar_next_slot(
    duration_minutes: int = Query(60, ge=15, le=480),
    days_ahead: int = Query(14, ge=1, le=60),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NextSlotOut:
    access = _calendar_access_token(db, current_user.id)
    now = datetime.now(timezone.utc)
    time_min = now.isoformat().replace("+00:00", "Z")
    time_max = (now + timedelta(days=days_ahead)).isoformat().replace("+00:00", "Z")
    try:
        raw = query_freebusy(access, time_min, time_max)
    except GoogleCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Calendar free/busy failed") from e
    pair = find_next_slot_iso(raw, duration_minutes=duration_minutes, days_ahead=days_ahead, now=now)
    if not pair:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No free slot in range")
    return NextSlotOut(start_iso=pair[0], end_iso=pair[1])


def _list_upcoming_interviews(
    db: Session,
    *,
    user_id: int,
    include_cancelled: bool,
    limit: int,
) -> list[ScheduledInterview]:
    now = datetime.utcnow()
    q = (
        db.query(ScheduledInterview)
        .filter(ScheduledInterview.user_id == user_id)
        .filter(ScheduledInterview.interview_start >= now)
    )
    if not include_cancelled:
        q = q.filter(ScheduledInterview.status != "cancelled")
    return q.order_by(ScheduledInterview.interview_start.asc()).limit(limit).all()


@router.get("/me/interviews", response_model=list[ScheduledInterviewOut])
def list_my_interviews(
    include_cancelled: bool = Query(False),
    limit: int = Query(25, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ScheduledInterviewOut]:
    """Upcoming interviews for the user (Google + Microsoft + manual — unified DB feed)."""
    return _list_upcoming_interviews(
        db, user_id=current_user.id, include_cancelled=include_cancelled, limit=limit
    )


@router.get("/google/interviews", response_model=list[ScheduledInterviewOut])
def google_calendar_list_interviews(
    include_cancelled: bool = Query(
        False,
        description="When true, include interviews marked cancelled (still upcoming by start time).",
    ),
    limit: int = Query(
        25,
        ge=1,
        le=50,
        description="Max interviews to return (1–50).",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ScheduledInterviewOut]:
    return _list_upcoming_interviews(
        db, user_id=current_user.id, include_cancelled=include_cancelled, limit=limit
    )


@router.get("/interviews/{interview_id}/ics")
def download_interview_ics(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Download a single interview as .ics (Apple Calendar, Outlook, etc.) — DB-backed, no Google token required."""
    row = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.id == interview_id,
            ScheduledInterview.user_id == current_user.id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if row.status == "cancelled":
        raise HTTPException(status.HTTP_410_GONE, detail="Interview was cancelled")
    body = scheduled_interview_to_ics(row)
    return Response(
        content=body.encode("utf-8"),
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="twin-interview-{interview_id}.ics"',
            "Cache-Control": "private, no-store",
        },
    )


def _ics_token_digest(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


@router.post("/interviews/{interview_id}/ics-token", response_model=InterviewIcsTokenOut)
def mint_interview_ics_share_token(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewIcsTokenOut:
    """Issue (or rotate) a time-limited secret for unauthenticated .ics download (e.g. share with assistant)."""
    row = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.id == interview_id,
            ScheduledInterview.user_id == current_user.id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if row.status == "cancelled":
        raise HTTPException(status.HTTP_410_GONE, detail="Interview was cancelled")
    raw = secrets.token_urlsafe(32)
    row.ics_access_token_hash = _ics_token_digest(raw)
    row.ics_access_token_expires_at = datetime.utcnow() + timedelta(days=_ICS_SHARE_TOKEN_TTL_DAYS)
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    exp = row.ics_access_token_expires_at
    exp_s = exp.isoformat() + "Z" if exp and exp.tzinfo is None else (exp.isoformat() if exp else "")
    path = f"/api/v1/calendar/interviews/{interview_id}/ics-shared?token={raw}"
    return InterviewIcsTokenOut(token=raw, expires_at=exp_s, download_path=path)


@router.get("/interviews/{interview_id}/ics-shared")
def download_interview_ics_shared(
    interview_id: int,
    token: str = Query(..., min_length=16, max_length=512),
    db: Session = Depends(get_db),
) -> Response:
    """Download .ics using a minted token (no login) — token is hashed at rest."""
    digest = _ics_token_digest(token)
    row = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.id == interview_id,
            ScheduledInterview.ics_access_token_hash == digest,
            ScheduledInterview.ics_access_token_expires_at.isnot(None),
            ScheduledInterview.ics_access_token_expires_at > datetime.utcnow(),
        )
        .first()
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interview not found or link expired")
    if row.status == "cancelled":
        raise HTTPException(status.HTTP_410_GONE, detail="Interview was cancelled")
    body = scheduled_interview_to_ics(row)
    return Response(
        content=body.encode("utf-8"),
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="twin-interview-{interview_id}.ics"',
            "Cache-Control": "private, no-store",
        },
    )


@router.post("/interviews/{interview_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_scheduled_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Mark interview cancelled in TWIN; best-effort delete linked Google Calendar event when configured."""
    row = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.id == interview_id,
            ScheduledInterview.user_id == current_user.id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if row.status != "cancelled":
        prov = (row.calendar_provider or "google").lower()
        if row.calendar_event_id and prov == "google":
            try:
                access = _calendar_access_token(db, current_user.id)
                delete_primary_event(access, row.calendar_event_id)
            except (HTTPException, GoogleCalendarApiError) as exc:
                logger.warning(
                    "Google Calendar event delete skipped for interview %s: %s",
                    interview_id,
                    exc,
                )
        elif row.calendar_event_id and prov == "microsoft":
            try:
                from app.database.models import UserMicrosoftCalendar
                from app.services.microsoft_calendar_oauth import refresh_microsoft_calendar_access_token
                from app.services.token_crypto import decrypt_secret

                ms_row = (
                    db.query(UserMicrosoftCalendar)
                    .filter(UserMicrosoftCalendar.user_id == current_user.id)
                    .first()
                )
                if ms_row:
                    plain = decrypt_secret(ms_row.refresh_token_encrypted)
                    access = refresh_microsoft_calendar_access_token(plain)
                    delete_microsoft_event(access, row.calendar_event_id)
            except (HTTPException, MicrosoftCalendarApiError, Exception) as exc:
                logger.warning(
                    "Microsoft Calendar event delete skipped for interview %s: %s",
                    interview_id,
                    exc,
                )
        row.status = "cancelled"
        row.updated_at = datetime.utcnow()
        db.add(row)
        db.commit()


@router.post("/google/interviews", response_model=ScheduledInterviewOut)
def google_calendar_schedule_interview(
    body: ScheduleInterviewIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScheduledInterviewOut:
    access = _calendar_access_token(db, current_user.id)
    _ensure_application_owned(db, current_user.id, body.application_id)

    start_aware = _parse_instant_iso(body.start_iso)
    end_aware = _parse_instant_iso(body.end_iso)
    if end_aware <= start_aware:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="end_iso must be after start_iso")

    try:
        fb = query_freebusy(access, body.start_iso, body.end_iso)
    except GoogleCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Calendar free/busy failed") from e
    if freebusy_overlaps_slot(fb, start_aware, end_aware):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Time slot not available")

    attendees: list[str] = []
    if body.interviewer_email and body.interviewer_email.strip():
        attendees.append(body.interviewer_email.strip())

    desc_parts = [
        f"Interview: {body.job_title} at {body.company_name}",
        "",
    ]
    if body.interviewer_name:
        desc_parts.append(f"Interviewer: {body.interviewer_name}")
    if body.notes:
        desc_parts.extend(["", body.notes])
    description = "\n".join(desc_parts).strip()

    loc = body.meeting_location or body.meeting_link or None
    summary = f"Interview: {body.company_name} — {body.job_title}"

    try:
        created = insert_primary_event(
            access,
            summary=summary,
            description=description or None,
            start_iso=body.start_iso,
            end_iso=body.end_iso,
            time_zone=body.time_zone,
            location=loc,
            attendee_emails=attendees or None,
            send_updates="all",
        )
    except GoogleCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Calendar create event failed") from e

    now = datetime.utcnow()
    row = ScheduledInterview(
        user_id=current_user.id,
        application_id=body.application_id,
        company_name=body.company_name,
        job_title=body.job_title,
        interviewer_name=body.interviewer_name,
        interviewer_email=body.interviewer_email,
        interview_start=_to_db_naive_utc(start_aware),
        interview_end=_to_db_naive_utc(end_aware),
        timezone=body.time_zone,
        calendar_event_id=str(created.get("id") or "") or None,
        calendar_provider="google",
        meeting_link=body.meeting_link,
        meeting_location=body.meeting_location,
        interview_type=body.interview_type,
        status="scheduled",
        notes=body.notes,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


class WebcalFeedTokenOut(BaseModel):
    token: str
    expires_at: str
    subscribe_path: str
    webcal_url: str


_WEBCAL_FEED_TTL_DAYS = 365


@router.post("/me/webcal-token", response_model=WebcalFeedTokenOut)
def mint_webcal_feed_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WebcalFeedTokenOut:
    """Issue a long-lived secret URL for calendar apps to subscribe (WebCal / ICS feed)."""
    raw = secrets.token_urlsafe(32)
    current_user.webcal_feed_token_hash = _ics_token_digest(raw)
    current_user.webcal_feed_token_expires_at = datetime.utcnow() + timedelta(days=_WEBCAL_FEED_TTL_DAYS)
    db.add(current_user)
    db.commit()
    exp = current_user.webcal_feed_token_expires_at
    exp_s = exp.isoformat() + "Z" if exp and exp.tzinfo is None else (exp.isoformat() if exp else "")
    path = f"/api/v1/calendar/me/webcal.ics?token={raw}"
    settings = get_settings()
    api_public = (settings.api_url or settings.frontend_url).strip().rstrip("/")
    host = api_public.removeprefix("https://").removeprefix("http://")
    webcal_url = f"webcal://{host}{path}"
    return WebcalFeedTokenOut(
        token=raw,
        expires_at=exp_s,
        subscribe_path=path,
        webcal_url=webcal_url,
    )


@router.get("/me/webcal.ics")
def download_webcal_feed(
    token: str = Query(..., min_length=16, max_length=512),
    db: Session = Depends(get_db),
) -> Response:
    """Subscribe URL: all upcoming TWIN interviews for the user (Apple Calendar, Outlook, Google via URL)."""
    digest = _ics_token_digest(token)
    user = (
        db.query(User)
        .filter(
            User.webcal_feed_token_hash == digest,
            User.webcal_feed_token_expires_at.isnot(None),
            User.webcal_feed_token_expires_at > datetime.utcnow(),
        )
        .first()
    )
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feed not found or link expired")
    now = datetime.utcnow()
    rows = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.user_id == user.id,
            ScheduledInterview.interview_start >= now,
            ScheduledInterview.status != "cancelled",
        )
        .order_by(ScheduledInterview.interview_start.asc())
        .limit(100)
        .all()
    )
    body = interviews_feed_to_ics(rows)
    return Response(
        content=body.encode("utf-8"),
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'inline; filename="twin-interviews.ics"',
            "Cache-Control": "private, max-age=300",
        },
    )


