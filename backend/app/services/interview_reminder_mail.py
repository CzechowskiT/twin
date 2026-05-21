"""Transactional email for upcoming interview reminders."""

from __future__ import annotations

from datetime import datetime

from app.config import Settings
from app.services.mail import send_generic_email


def send_interview_reminder_email_message(
    settings: Settings,
    *,
    to_email: str,
    company_name: str,
    job_title: str,
    interview_start: datetime,
    meeting_link: str | None,
    calendar_url: str,
) -> None:
    """Send a 24h-style reminder with calendar deep link."""
    when = interview_start.strftime("%a %d %b %Y, %H:%M UTC")
    subject = f"TWIN reminder: interview with {company_name}"
    meet = (meeting_link or "").strip()
    meet_line = f"\nJoin link: {meet}\n" if meet else ""
    text_body = (
        f"Your interview for {job_title} at {company_name} is coming up.\n\n"
        f"When: {when}\n"
        f"{meet_line}\n"
        f"Open your TWIN calendar: {calendar_url}\n"
    )
    meet_html = f'<p><a href="{meet}">Join meeting</a></p>' if meet else ""
    html_body = (
        f"<p>Your interview for <strong>{job_title}</strong> at <strong>{company_name}</strong> "
        f"is coming up.</p>"
        f"<p><strong>When:</strong> {when}</p>"
        f"{meet_html}"
        f'<p><a href="{calendar_url}">Open TWIN calendar</a></p>'
    )
    send_generic_email(settings, to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
