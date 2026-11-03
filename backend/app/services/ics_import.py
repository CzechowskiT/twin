"""ICS import — parse VEVENT busy/holds into imported_calendar_holds (no provider write)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import ImportedCalendarHold

_DT_RE = re.compile(
    r"^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$"
)


def _unescape(text: str) -> str:
    return (
        text.replace("\\n", "\n")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
    )


def _parse_dt(value: str) -> datetime | None:
    raw = (value or "").strip()
    m = _DT_RE.match(raw)
    if not m:
        return None
    y, mo, d, hh, mm, ss, z = m.groups()
    hour = int(hh or 0)
    minute = int(mm or 0)
    second = int(ss or 0)
    dt = datetime(int(y), int(mo), int(d), hour, minute, second)
    if z == "Z" or raw.endswith("Z"):
        return dt.replace(tzinfo=timezone.utc)
    return dt.replace(tzinfo=timezone.utc)


def parse_ics_events(ics_text: str) -> list[dict[str, Any]]:
    """Minimal RFC5545 VEVENT parser — unfolded lines, no recurrence expansion."""
    text = (ics_text or "").replace("\r\n", "\n").replace("\r", "\n")
    # Unfold continued lines
    unfolded: list[str] = []
    for line in text.split("\n"):
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] += line[1:]
        else:
            unfolded.append(line)

    events: list[dict[str, Any]] = []
    cur: dict[str, str] = {}
    in_event = False
    for line in unfolded:
        upper = line.upper()
        if upper == "BEGIN:VEVENT":
            in_event = True
            cur = {}
            continue
        if upper == "END:VEVENT":
            in_event = False
            uid = cur.get("UID") or ""
            dtstart = _parse_dt(cur.get("DTSTART", ""))
            dtend = _parse_dt(cur.get("DTEND", ""))
            if not dtend and dtstart:
                dtend = dtstart
            if uid and dtstart and dtend:
                events.append(
                    {
                        "uid": uid[:255],
                        "summary": _unescape(cur.get("SUMMARY", "") or "")[:500] or None,
                        "starts_at": dtstart.replace(tzinfo=None),
                        "ends_at": dtend.replace(tzinfo=None),
                        "timezone": "UTC",
                    }
                )
            continue
        if not in_event or ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.split(";", 1)[0].upper()
        cur[key] = val
    return events


def import_ics_for_user(
    db: Session,
    *,
    user_id: int,
    ics_text: str,
) -> dict[str, Any]:
    parsed = parse_ics_events(ics_text)
    if not parsed:
        raise ValueError("No VEVENT entries found in ICS")
    created = 0
    updated = 0
    for ev in parsed:
        row = (
            db.query(ImportedCalendarHold)
            .filter(
                ImportedCalendarHold.user_id == user_id,
                ImportedCalendarHold.uid == ev["uid"],
            )
            .one_or_none()
        )
        if row is None:
            db.add(
                ImportedCalendarHold(
                    user_id=user_id,
                    uid=ev["uid"],
                    summary=ev.get("summary"),
                    starts_at=ev["starts_at"],
                    ends_at=ev["ends_at"],
                    timezone=ev.get("timezone") or "UTC",
                    source="ics_import",
                    raw_json=json.dumps({"summary": ev.get("summary")}),
                )
            )
            created += 1
        else:
            row.summary = ev.get("summary")
            row.starts_at = ev["starts_at"]
            row.ends_at = ev["ends_at"]
            row.timezone = ev.get("timezone") or "UTC"
            updated += 1
    db.commit()
    return {
        "imported": created + updated,
        "created": created,
        "updated": updated,
        "sample_metrics": False,
        "provider_write": False,
    }


def list_imported_holds(
    db: Session,
    *,
    user_id: int,
    limit: int = 50,
) -> dict[str, Any]:
    rows = (
        db.query(ImportedCalendarHold)
        .filter(ImportedCalendarHold.user_id == user_id)
        .order_by(ImportedCalendarHold.starts_at.asc())
        .limit(max(1, min(limit, 200)))
        .all()
    )
    return {
        "items": [
            {
                "id": r.id,
                "uid": r.uid,
                "summary": r.summary,
                "starts_at": r.starts_at.isoformat() + "Z" if r.starts_at else None,
                "ends_at": r.ends_at.isoformat() + "Z" if r.ends_at else None,
                "timezone": r.timezone,
                "source": r.source,
            }
            for r in rows
        ],
        "total": len(rows),
    }
