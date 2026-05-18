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


def scheduled_interview_to_ics(row: ScheduledInterview) -> str:
    """Build a minimal PUBLISH calendar with one VEVENT (stable UID per interview id)."""
    uid = f"twin-interview-{row.id}@twin"
    summary = _ics_escape(f"{row.company_name} — {row.job_title}")
    tz_label = (getattr(row, "timezone", None) or "").strip() or "UTC"
    type_label = (getattr(row, "interview_type", None) or "").strip() or "video"
    parts_desc = [
        f"Interview: {row.job_title} at {row.company_name}",
        f"Timezone: {tz_label}",
        f"Interview type: {type_label}",
    ]
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

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWIN//Interview//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART:{dtstart}",
        f"DTEND:{dtend}",
        f"SUMMARY:{summary}",
        f"DESCRIPTION:{description}",
    ]
    if location:
        lines.append(f"LOCATION:{location}")
    lines.extend(["END:VEVENT", "END:VCALENDAR"])
    return "\r\n".join(lines) + "\r\n"
