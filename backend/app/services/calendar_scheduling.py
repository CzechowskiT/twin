"""Helpers to interpret Google freeBusy and suggest interview-sized gaps (UTC workdays)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


def _parse_google_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def freebusy_overlaps_slot(fb: dict[str, Any], slot_start: datetime, slot_end: datetime) -> bool:
    cal = (fb.get("calendars") or {}).get("primary") or {}
    for b in cal.get("busy") or []:
        if not isinstance(b, dict):
            continue
        bs, be = b.get("start"), b.get("end")
        if not bs or not be:
            continue
        b0, b1 = _parse_google_time(str(bs)), _parse_google_time(str(be))
        if slot_start < b1 and b0 < slot_end:
            return True
    return False


def _fmt_iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def find_next_slot_iso(
    fb: dict[str, Any],
    *,
    duration_minutes: int,
    days_ahead: int,
    now: datetime | None = None,
) -> tuple[str, str] | None:
    """Next 30-min-aligned slot Mon–Fri 09:00–17:00 UTC that does not overlap freeBusy."""
    now = now or datetime.utcnow().replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    duration = timedelta(minutes=duration_minutes)
    horizon = now + timedelta(days=days_ahead)
    step = timedelta(minutes=30)
    t = now
    rem = (30 - (t.minute % 30)) % 30
    if rem or t.second or t.microsecond:
        t = (t.replace(second=0, microsecond=0) + timedelta(minutes=rem))
    if t <= now:
        t = now + step

    while t + duration <= horizon:
        while t.weekday() >= 5:
            t = (t + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            if t + duration > horizon:
                return None

        day_open = t.replace(hour=9, minute=0, second=0, microsecond=0)
        day_close = t.replace(hour=17, minute=0, second=0, microsecond=0)
        if t < day_open:
            t = day_open
        if t + duration > day_close:
            t = (t + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        if not freebusy_overlaps_slot(fb, t, t + duration):
            return _fmt_iso_z(t), _fmt_iso_z(t + duration)
        t += step
    return None
