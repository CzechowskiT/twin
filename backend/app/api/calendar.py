"""Google Calendar connect + minimal API (free/busy, create event)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, decode_access_token
from app.database.models import Application, Candidate, ScheduledInterview, User, UserGoogleCalendar
from app.database.session import get_db
from app.services.calendar_scheduling import find_free_slots_iso, find_next_slot_iso, freebusy_overlaps_slot
from app.services.google_calendar_api import GoogleCalendarApiError, insert_primary_event, query_freebusy
from app.services.google_calendar_oauth import (
    GoogleCalendarOAuthError,
    build_google_calendar_authorize_url,
    exchange_google_calendar_code,
    is_google_calendar_oauth_configured,
    refresh_google_calendar_access_token,
)
from app.services.ics_export import scheduled_interview_to_ics
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
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No candidate profile for this user")
    row = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == cand.id)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")


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


@router.get("/google/interviews", response_model=list[ScheduledInterviewOut])
def google_calendar_list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ScheduledInterviewOut]:
    now = datetime.utcnow()
    rows = (
        db.query(ScheduledInterview)
        .filter(ScheduledInterview.user_id == current_user.id)
        .filter(ScheduledInterview.interview_start >= now)
        .filter(ScheduledInterview.status != "cancelled")
        .order_by(ScheduledInterview.interview_start.asc())
        .limit(25)
        .all()
    )
    return rows


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


@router.post("/interviews/{interview_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_scheduled_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Mark a scheduled interview as cancelled in TWIN (does not auto-delete Google event)."""
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
