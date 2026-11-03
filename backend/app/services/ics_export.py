"""RFC 5545 iCalendar (.ics) export for scheduled interviews (Apple, Outlook import, etc.)."""

from __future__ import annotations

from datetime import datetime, timezone

from app.database.models import ScheduledInterview


def _ics_escape(text: str) -> str:
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    return t.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _utc_stamp(dt: datetime) -> str:
    """Format naive UTC or aware datetime as UTC …Z for iCalendar."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y%m%dT%H%M%SZ")


def scheduled_interview_to_ics(
    row: ScheduledInterview,
    *,
    cancelled: bool | None = None,
    sequence: int = 0,
) -> str:
    """Build a minimal calendar with one VEVENT (stable UID per interview id).

    When cancelled (explicit or row.status == cancelled), emit METHOD:CANCEL + STATUS:CANCELLED
    so Apple/Outlook/Google can drop the hold without a separate provider write.
    """
    uid = f"twin-interview-{row.id}@twin"
    summary = _ics_escape(f"{row.company_name} — {row.job_title}")
    tz_label = (getattr(row, "timezone", None) or "").strip() or "UTC"
    type_label = (getattr(row, "interview_type", None) or "").strip() or "video"
    is_cancelled = bool(cancelled) or (getattr(row, "status", None) or "").lower() == "cancelled"
    parts_desc = [
        f"Interview: {row.job_title} at {row.company_name}",
        f"Timezone: {tz_label}",
        f"Interview type: {type_label}",
    ]
    if is_cancelled:
        parts_desc.append("Status: CANCELLED")
    if row.meeting_link and row.meeting_link.strip():
        parts_desc.append(f"Link: {row.meeting_link.strip()}")
    elif row.meeting_location and row.meeting_location.strip():
        parts_desc.append(f"Location: {row.meeting_location.strip()}")
    description = _ics_escape("\n".join(parts_desc))
    location = ""
    if row.meeting_link and row.meeting_link.strip():
        location = _ics_escape(row.meeting_link.strip())
    elif row.meeting_location and row.meeting_location.strip():
        location = _ics_escape(row.meeting_location.strip())

    dtstamp = _utc_stamp(datetime.now(timezone.utc))
    dtstart = _utc_stamp(row.interview_start)
    dtend = _utc_stamp(row.interview_end)
    method = "CANCEL" if is_cancelled else "PUBLISH"
    event_status = "CANCELLED" if is_cancelled else "CONFIRMED"
    seq = max(0, int(sequence))

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWIN//Interview//EN",
        "CALSCALE:GREGORIAN",
        f"METHOD:{method}",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART:{dtstart}",
        f"DTEND:{dtend}",
        f"SEQUENCE:{seq}",
        f"STATUS:{event_status}",
        f"SUMMARY:{summary}",
        f"DESCRIPTION:{description}",
    ]
    if location:
        lines.append(f"LOCATION:{location}")
    lines.extend(["END:VEVENT", "END:VCALENDAR"])
    return "\r\n".join(lines) + "\r\n"


def interviews_feed_to_ics(rows: list[ScheduledInterview]) -> str:
    """Multi-event calendar for WebCal subscribe feeds."""
    if not rows:
        return "\r\n".join(
            [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//TWIN//Interviews//EN",
                "CALSCALE:GREGORIAN",
                "METHOD:PUBLISH",
                "END:VCALENDAR",
            ]
        ) + "\r\n"
    events: list[str] = []
    for row in rows:
        block = scheduled_interview_to_ics(row)
        for line in block.splitlines():
            if line in ("BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TWIN//Interview//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "END:VCALENDAR", ""):
                continue
            events.append(line)
    header = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWIN//Interviews//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    return "\r\n".join(header + events + ["END:VCALENDAR"]) + "\r\n"
