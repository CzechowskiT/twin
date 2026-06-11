"""Microsoft 365 / Outlook calendar OAuth + interview scheduling."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.limiter import limiter
from app.api.calendar import (
    CalendarEventOut,
    CalendarEventsOut,
    CalendarFreeBusyBlock,
    CalendarFreeBusyIn,
    CalendarFreeBusyOut,
    CalendarSlotsOut,
    CalendarSlotOut,
    NextSlotOut,
    ScheduleInterviewIn,
    ScheduledInterviewOut,
    _ensure_application_owned,
    _frontend_calendar_redirect,
    _parse_instant_iso,
    _to_db_naive_utc,
)
from app.config import get_settings
from app.services.calendar_oauth_redirect import effective_microsoft_calendar_redirect_uri
from app.core.deps import get_current_user
from app.core.security import create_access_token, decode_access_token
from app.database.models import ScheduledInterview, User, UserMicrosoftCalendar
from app.database.session import get_db
from app.services.calendar_scheduling import find_free_slots_iso, find_next_slot_iso, freebusy_overlaps_slot
from app.services.microsoft_calendar_api import (
    MicrosoftCalendarApiError,
    delete_calendar_event,
    insert_calendar_event,
    list_calendar_view_events,
    query_schedule,
    schedule_items_to_busy_blocks,
)
from app.services.calendar_oauth_credentials import (
    CalendarTokenResolutionError,
    GOOGLE_RECONNECT_MSG,
    MICROSOFT_RECONNECT_MSG,
    calendar_upstream_transient,
    get_best_microsoft_row,
    resolve_microsoft_access_token,
)
from app.services.calendar_provider_health import (
    calendar_upstream_auth_failure,
    microsoft_unsupported_account_failure,
    probe_microsoft_calendar_health,
)
from app.services.microsoft_calendar_oauth import (
    MicrosoftCalendarOAuthError,
    build_microsoft_calendar_authorize_url,
    exchange_microsoft_calendar_code,
    is_microsoft_calendar_oauth_configured,
)
from app.services.token_crypto import encrypt_secret

router = APIRouter()
logger = logging.getLogger(__name__)

_MS_STATE_PREFIX = "mscal:"


def _ms_oauth_state_for_user(user_id: int) -> str:
    return create_access_token(f"{_MS_STATE_PREFIX}{user_id}", expires_minutes=15)


def _parse_ms_oauth_user_id(state: str) -> int | None:
    sub = decode_access_token(state)
    if not sub or not sub.startswith(_MS_STATE_PREFIX):
        return None
    try:
        return int(sub[len(_MS_STATE_PREFIX) :])
    except ValueError:
        return None


def _microsoft_access_token(db: Session, user_id: int, *, force_refresh: bool = False) -> str:
    row = get_best_microsoft_row(db, user_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Microsoft Calendar is not connected",
        )
    try:
        return resolve_microsoft_access_token(db, row, force_refresh=force_refresh).token
    except CalendarTokenResolutionError as exc:
        if exc.status == "temporary_error":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.message) from exc
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail=exc.message or MICROSOFT_RECONNECT_MSG,
        ) from exc


def _list_microsoft_events_with_retry(db: Session, user_id: int, time_min: str, time_max: str, *, limit: int) -> list[dict]:
    access = _microsoft_access_token(db, user_id)
    try:
        return list_calendar_view_events(access, time_min, time_max, max_results=limit)
    except MicrosoftCalendarApiError as exc:
        if microsoft_unsupported_account_failure(exc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported Microsoft personal account for calendar API; use Microsoft 365 work or school.",
            ) from exc
        if not calendar_upstream_auth_failure(exc):
            if calendar_upstream_transient(exc):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Calendar provider temporarily unavailable; try again shortly.",
                ) from exc
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Microsoft list events failed") from exc
        access = _microsoft_access_token(db, user_id, force_refresh=True)
        try:
            return list_calendar_view_events(access, time_min, time_max, max_results=limit)
        except MicrosoftCalendarApiError as retry_exc:
            if microsoft_unsupported_account_failure(retry_exc):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Unsupported Microsoft personal account for calendar API; use Microsoft 365 work or school.",
                ) from retry_exc
            if calendar_upstream_auth_failure(retry_exc):
                raise HTTPException(
                    status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                    detail=MICROSOFT_RECONNECT_MSG,
                ) from retry_exc
            if calendar_upstream_transient(retry_exc):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Calendar provider temporarily unavailable; try again shortly.",
                ) from retry_exc
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Microsoft list events failed") from retry_exc


def _ms_busy_as_google_fb(access_token: str, time_min: str, time_max: str, tz: str) -> dict:
    raw = query_schedule(access_token, time_min, time_max, time_zone=tz)
    busy = schedule_items_to_busy_blocks(raw)
    return {"calendars": {"primary": {"busy": busy}}}


class MicrosoftCalendarStatusOut(BaseModel):
    connected: bool
    status: str = Field("unknown")
    health: str = Field(
        "unknown",
        description="ok | reconnect_required | temporary_error | error | unknown",
    )
    message: str | None = None
    code: str | None = None
    can_reconnect: bool = False
    can_retry: bool = False
    provider: str = Field("microsoft", description="google | microsoft")
    microsoft_email: str | None = None
    oauth_configured: bool = False
    oauth_redirect_uri: str | None = None


class MicrosoftCalendarAuthorizeOut(BaseModel):
    authorize_url: str


@router.get("/microsoft/status", response_model=MicrosoftCalendarStatusOut)
def microsoft_calendar_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MicrosoftCalendarStatusOut:
    oauth_configured = is_microsoft_calendar_oauth_configured()
    redirect_uri = effective_microsoft_calendar_redirect_uri(get_settings()) if oauth_configured else None
    probe = probe_microsoft_calendar_health(db, current_user.id)
    return MicrosoftCalendarStatusOut(
        connected=probe.connected,
        status=probe.status,
        health=probe.health,
        message=probe.message,
        code=probe.code,
        can_reconnect=probe.can_reconnect,
        can_retry=probe.can_retry,
        provider=probe.provider,
        microsoft_email=probe.email,
        oauth_configured=oauth_configured,
        oauth_redirect_uri=redirect_uri,
    )


@router.get("/microsoft/authorize", response_model=MicrosoftCalendarAuthorizeOut)
def microsoft_calendar_authorize(current_user: User = Depends(get_current_user)) -> MicrosoftCalendarAuthorizeOut:
    if not is_microsoft_calendar_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Microsoft Calendar OAuth is not configured on this server",
        )
    try:
        state = _ms_oauth_state_for_user(current_user.id)
        url = build_microsoft_calendar_authorize_url(state)
    except MicrosoftCalendarOAuthError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return MicrosoftCalendarAuthorizeOut(authorize_url=url)


@router.get("/microsoft/callback")
@limiter.limit("10/minute")
def microsoft_calendar_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="microsoft_denied"), status_code=302)
    user_id = _parse_ms_oauth_user_id(state or "")
    if user_id is None or not code:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="invalid_state"), status_code=302)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="invalid_state"), status_code=302)
    try:
        refresh_plain, ms_email = exchange_microsoft_calendar_code(code)
    except MicrosoftCalendarOAuthError:
        return RedirectResponse(_frontend_calendar_redirect(calendar_error="exchange_failed"), status_code=302)

    now = datetime.utcnow()
    row = get_best_microsoft_row(db, user_id)
    if row:
        if refresh_plain:
            row.refresh_token_encrypted = encrypt_secret(refresh_plain)
        elif not row.refresh_token_encrypted:
            return RedirectResponse(_frontend_calendar_redirect(calendar_error="no_refresh_token"), status_code=302)
        row.microsoft_email = ms_email
        row.updated_at = now
        db.add(row)
        db.commit()
    else:
        if not refresh_plain:
            return RedirectResponse(_frontend_calendar_redirect(calendar_error="no_refresh_token"), status_code=302)
        db.add(
            UserMicrosoftCalendar(
                user_id=user_id,
                refresh_token_encrypted=encrypt_secret(refresh_plain),
                microsoft_email=ms_email,
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()
    return RedirectResponse(_frontend_calendar_redirect(calendar_connected="microsoft"), status_code=302)


@router.delete("/microsoft", status_code=status.HTTP_204_NO_CONTENT)
def microsoft_calendar_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(UserMicrosoftCalendar).filter(UserMicrosoftCalendar.user_id == current_user.id).first()
    if row:
        db.delete(row)
        db.commit()


def _microsoft_event_to_out(item: dict) -> CalendarEventOut | None:
    eid = item.get("id")
    if not eid:
        return None
    start = item.get("start") if isinstance(item.get("start"), dict) else {}
    end = item.get("end") if isinstance(item.get("end"), dict) else {}
    s_dt = start.get("dateTime") if isinstance(start, dict) else None
    e_dt = end.get("dateTime") if isinstance(end, dict) else None
    if not s_dt or not e_dt:
        return None
    s_iso = str(s_dt)
    e_iso = str(e_dt)
    if not s_iso.endswith("Z"):
        s_iso = f"{s_iso}Z"
    if not e_iso.endswith("Z"):
        e_iso = f"{e_iso}Z"
    title = str(item.get("subject") or "").strip() or "—"
    link = item.get("webLink") if isinstance(item.get("webLink"), str) else None
    return CalendarEventOut(
        id=str(eid),
        title=title,
        start_iso=s_iso,
        end_iso=e_iso,
        all_day=False,
        html_link=link,
        source="provider",
    )


@router.get("/microsoft/events", response_model=CalendarEventsOut)
def microsoft_calendar_list_events(
    time_min: str = Query(..., description="RFC3339 instant"),
    time_max: str = Query(..., description="RFC3339 instant"),
    limit: int = Query(100, ge=1, le=250),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarEventsOut:
    raw_items = _list_microsoft_events_with_retry(db, current_user.id, time_min, time_max, limit=limit)
    events: list[CalendarEventOut] = []
    for item in raw_items:
        out = _microsoft_event_to_out(item)
        if out:
            events.append(out)
    return CalendarEventsOut(events=events)


@router.post("/microsoft/freebusy", response_model=CalendarFreeBusyOut)
def microsoft_calendar_freebusy(
    body: CalendarFreeBusyIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarFreeBusyOut:
    access = _microsoft_access_token(db, current_user.id)
    try:
        fb = _ms_busy_as_google_fb(access, body.time_min, body.time_max, "UTC")
    except MicrosoftCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Microsoft free/busy failed") from e
    cal = (fb.get("calendars") or {}).get("primary") or {}
    busy: list[CalendarFreeBusyBlock] = []
    for b in cal.get("busy") or []:
        if isinstance(b, dict) and b.get("start") and b.get("end"):
            busy.append(CalendarFreeBusyBlock(start=str(b["start"]), end=str(b["end"])))
    return CalendarFreeBusyOut(busy=busy)


@router.get("/microsoft/slots", response_model=CalendarSlotsOut)
def microsoft_calendar_slots(
    duration_minutes: int = Query(60, ge=15, le=480),
    days_ahead: int = Query(14, ge=1, le=60),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarSlotsOut:
    access = _microsoft_access_token(db, current_user.id)
    now = datetime.now(timezone.utc)
    time_min = now.isoformat().replace("+00:00", "Z")
    time_max = (now + timedelta(days=days_ahead)).isoformat().replace("+00:00", "Z")
    try:
        fb = _ms_busy_as_google_fb(access, time_min, time_max, "UTC")
    except MicrosoftCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Microsoft free/busy failed") from e
    pairs = find_free_slots_iso(
        fb, duration_minutes=duration_minutes, days_ahead=days_ahead, now=now, max_slots=limit
    )
    return CalendarSlotsOut(slots=[CalendarSlotOut(start_iso=a, end_iso=b) for a, b in pairs])


@router.get("/microsoft/slots/next", response_model=NextSlotOut)
def microsoft_calendar_next_slot(
    duration_minutes: int = Query(60, ge=15, le=480),
    days_ahead: int = Query(14, ge=1, le=60),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NextSlotOut:
    access = _microsoft_access_token(db, current_user.id)
    now = datetime.now(timezone.utc)
    time_min = now.isoformat().replace("+00:00", "Z")
    time_max = (now + timedelta(days=days_ahead)).isoformat().replace("+00:00", "Z")
    try:
        fb = _ms_busy_as_google_fb(access, time_min, time_max, "UTC")
    except MicrosoftCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Microsoft free/busy failed") from e
    pair = find_next_slot_iso(fb, duration_minutes=duration_minutes, days_ahead=days_ahead, now=now)
    if not pair:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No free slot in range")
    return NextSlotOut(start_iso=pair[0], end_iso=pair[1])


@router.post("/microsoft/interviews", response_model=ScheduledInterviewOut)
def microsoft_calendar_schedule_interview(
    body: ScheduleInterviewIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScheduledInterviewOut:
    access = _microsoft_access_token(db, current_user.id)
    _ensure_application_owned(db, current_user.id, body.application_id)

    start_aware = _parse_instant_iso(body.start_iso)
    end_aware = _parse_instant_iso(body.end_iso)
    if end_aware <= start_aware:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="end_iso must be after start_iso")

    try:
        fb = _ms_busy_as_google_fb(access, body.start_iso, body.end_iso, body.time_zone)
    except MicrosoftCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Microsoft free/busy failed") from e
    if freebusy_overlaps_slot(fb, start_aware, end_aware):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Time slot not available")

    desc_parts = [f"Interview: {body.job_title} at {body.company_name}", ""]
    if body.interviewer_name:
        desc_parts.append(f"Interviewer: {body.interviewer_name}")
    if body.notes:
        desc_parts.extend(["", body.notes])
    description = "\n".join(desc_parts).strip()
    loc = body.meeting_location or body.meeting_link or None
    summary = f"Interview: {body.company_name} — {body.job_title}"

    try:
        created = insert_calendar_event(
            access,
            summary=summary,
            description=description or None,
            start_iso=body.start_iso,
            end_iso=body.end_iso,
            time_zone=body.time_zone,
            location=loc,
        )
    except MicrosoftCalendarApiError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Microsoft create event failed") from e

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
        calendar_provider="microsoft",
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
