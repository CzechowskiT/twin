"""Microsoft Graph calendar calls (schedule + events)."""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

GRAPH = "https://graph.microsoft.com/v1.0"


class MicrosoftCalendarApiError(Exception):
    """Upstream Graph API error."""


def query_schedule(access_token: str, time_min: str, time_max: str, time_zone: str = "UTC") -> dict[str, Any]:
    """Return Graph getSchedule payload (busy blocks in scheduleItems)."""
    body = {
        "schedules": ["me"],
        "startTime": {"dateTime": time_min.replace("Z", ""), "timeZone": time_zone},
        "endTime": {"dateTime": time_max.replace("Z", ""), "timeZone": time_zone},
        "availabilityViewInterval": 30,
    }
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            f"{GRAPH}/me/calendar/getSchedule",
            json=body,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        )
        if res.status_code != 200:
            raise MicrosoftCalendarApiError(res.text or "getSchedule failed")
        return res.json()


def schedule_items_to_busy_blocks(raw: dict[str, Any]) -> list[dict[str, str]]:
    """Normalize getSchedule response to {start,end} ISO strings."""
    out: list[dict[str, str]] = []
    for entry in raw.get("value") or []:
        if not isinstance(entry, dict):
            continue
        for item in entry.get("scheduleItems") or []:
            if not isinstance(item, dict):
                continue
            if str(item.get("status", "")).lower() not in ("busy", "tentative", "oof", "workingelsewhere"):
                continue
            start = item.get("start") or {}
            end = item.get("end") or {}
            s_dt = start.get("dateTime") if isinstance(start, dict) else None
            e_dt = end.get("dateTime") if isinstance(end, dict) else None
            if s_dt and e_dt:
                s_iso = str(s_dt)
                e_iso = str(e_dt)
                if not s_iso.endswith("Z"):
                    s_iso = f"{s_iso}Z"
                if not e_iso.endswith("Z"):
                    e_iso = f"{e_iso}Z"
                out.append({"start": s_iso, "end": e_iso})
    return out


def insert_calendar_event(
    access_token: str,
    *,
    summary: str,
    description: str | None,
    start_iso: str,
    end_iso: str,
    time_zone: str,
    location: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "subject": summary,
        "start": {"dateTime": start_iso.replace("Z", ""), "timeZone": time_zone},
        "end": {"dateTime": end_iso.replace("Z", ""), "timeZone": time_zone},
    }
    if description:
        body["body"] = {"contentType": "text", "content": description}
    if location:
        body["location"] = {"displayName": location}
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            f"{GRAPH}/me/events",
            json=body,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        )
        if res.status_code not in (200, 201):
            raise MicrosoftCalendarApiError(res.text or "event insert failed")
        return res.json()


def list_calendar_view_events(
    access_token: str,
    time_min: str,
    time_max: str,
    *,
    max_results: int = 100,
) -> list[dict[str, Any]]:
    """List events via Graph calendarView in [time_min, time_max)."""
    params: dict[str, str | int] = {
        "startDateTime": time_min,
        "endDateTime": time_max,
        "$top": max(1, min(max_results, 250)),
        "$orderby": "start/dateTime",
    }
    with httpx.Client(timeout=30.0) as client:
        res = client.get(
            f"{GRAPH}/me/calendarView",
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if res.status_code != 200:
            raise MicrosoftCalendarApiError(res.text or "calendarView failed")
        data = res.json()
    items = data.get("value")
    if not isinstance(items, list):
        return []
    return [i for i in items if isinstance(i, dict)]


def delete_calendar_event(access_token: str, event_id: str) -> None:
    eid = quote(event_id, safe="")
    with httpx.Client(timeout=30.0) as client:
        res = client.delete(
            f"{GRAPH}/me/events/{eid}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if res.status_code not in (200, 204, 404):
            raise MicrosoftCalendarApiError(res.text or "event delete failed")
