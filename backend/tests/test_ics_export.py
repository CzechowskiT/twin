"""Unit tests for iCalendar export."""

from datetime import datetime
from unittest.mock import MagicMock

from app.database.models import ScheduledInterview
from app.services.ics_export import scheduled_interview_to_ics


def test_scheduled_interview_to_ics_structure() -> None:
    row = MagicMock(spec=ScheduledInterview)
    row.id = 42
    row.company_name = "Acme Corp"
    row.job_title = "Platform Engineer"
    row.interview_start = datetime(2026, 6, 1, 14, 0, 0)
    row.interview_end = datetime(2026, 6, 1, 15, 0, 0)
    row.meeting_link = "https://meet.example/room"
    row.meeting_location = None
    row.status = "scheduled"

    text = scheduled_interview_to_ics(row)
    assert text.startswith("BEGIN:VCALENDAR\r\n")
    assert "BEGIN:VEVENT\r\n" in text
    assert "UID:twin-interview-42@twin\r\n" in text
    assert "SUMMARY:Acme Corp — Platform Engineer\r\n" in text
    assert "DTSTART:20260601T140000Z\r\n" in text
    assert "DTEND:20260601T150000Z\r\n" in text
    assert "LOCATION:https://meet.example/room\r\n" in text
    assert text.endswith("END:VCALENDAR\r\n")


def test_scheduled_interview_to_ics_escapes_text() -> None:
    row = MagicMock(spec=ScheduledInterview)
    row.id = 1
    row.company_name = "Big;Co"
    row.job_title = "Role, Senior"
    row.interview_start = datetime(2026, 1, 2, 10, 0, 0)
    row.interview_end = datetime(2026, 1, 2, 11, 0, 0)
    row.meeting_link = None
    row.meeting_location = None
    row.status = "scheduled"

    text = scheduled_interview_to_ics(row)
    assert "Big\\;Co" in text
    assert "Role\\, Senior" in text
