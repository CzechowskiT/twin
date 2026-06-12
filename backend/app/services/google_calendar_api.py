"""Minimal Google Calendar v3 calls (free/busy + create event)."""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

CAL_BASE = "https://www.googleapis.com/calendar/v3"


class GoogleCalendarApiError(Exception):
    """Upstream Calendar API error."""


def query_freebusy(access_token: str, time_min: str, time_max: str) -> dict[str, Any]:
    payload = {
        "timeMin": time_min,
        "timeMax": time_max,
        "items": [{"id": "primary"}],
    }
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            f"{CAL_BASE}/freeBusy",
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
        if res.status_code != 200:
            raise GoogleCalendarApiError(res.text or "freeBusy failed")
        return res.json()


def insert_primary_event(
    access_token: str,
    *,
    summary: str,
    description: str | None,
    start_iso: str,
    end_iso: str,
    time_zone: str,
    location: str | None = None,
    attendee_emails: list[str] | None = None,
    send_updates: str = "none",
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "summary": summary,
        "start": {"dateTime": start_iso, "timeZone": time_zone},
        "end": {"dateTime": end_iso, "timeZone": time_zone},
    }
    if description:
        body["description"] = description
    if location:
        body["location"] = location
    if attendee_emails:
        body["attendees"] = [{"email": e.strip()} for e in attendee_emails if e and e.strip()]
    params: dict[str, str] = {"sendUpdates": send_updates}
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            f"{CAL_BASE}/calendars/primary/events",
            json=body,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            params=params,
        )
        if res.status_code not in (200, 201):
            raise GoogleCalendarApiError(res.text or "event insert failed")
        return res.json()


CALENDAR_EVENTS_HTTP_TIMEOUT = 9.0


def list_primary_events(
    access_token: str,
    time_min: str,
    time_max: str,
    *,
    max_results: int = 100,
) -> list[dict[str, Any]]:
    """List events on the user's primary calendar in [time_min, time_max)."""
    params: dict[str, str | int] = {
        "timeMin": time_min,
        "timeMax": time_max,
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": max(1, min(max_results, 250)),
    }
    with httpx.Client(timeout=CALENDAR_EVENTS_HTTP_TIMEOUT) as client:
        res = client.get(
            f"{CAL_BASE}/calendars/primary/events",
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if res.status_code != 200:
            raise GoogleCalendarApiError(res.text or "events list failed")
        data = res.json()
    items = data.get("items")
    if not isinstance(items, list):
        return []
    return [i for i in items if isinstance(i, dict)]


def delete_primary_event(access_token: str, event_id: str) -> None:
    """Delete an event on the user's primary calendar (best-effort; raises on hard API errors)."""
    eid = quote(event_id, safe="")
    with httpx.Client(timeout=30.0) as client:
        res = client.delete(
            f"{CAL_BASE}/calendars/primary/events/{eid}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"sendUpdates": "none"},
        )
        if res.status_code not in (200, 204):
            raise GoogleCalendarApiError(res.text or "event delete failed")
