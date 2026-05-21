"""Interview reminder Celery tasks."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import app.tasks.reminder_tasks  # noqa: F401
from app.tasks.reminder_tasks import send_interview_reminder_email


@patch("app.tasks.reminder_tasks.get_settings")
def test_send_interview_reminder_skipped_without_mail(mock_gs: MagicMock) -> None:
    m = MagicMock()
    m.resend_api_key = ""
    m.smtp_host = ""
    m.mail_from = ""
    mock_gs.return_value = m
    with patch("app.tasks.reminder_tasks.is_mail_configured", return_value=False):
        assert send_interview_reminder_email.run(1) == "skipped_no_mail"


@patch("app.tasks.reminder_tasks.send_interview_reminder_email_message")
@patch("app.tasks.reminder_tasks.is_mail_configured", return_value=True)
@patch("app.tasks.reminder_tasks.get_settings")
def test_send_interview_reminder_sends_once(
    mock_gs: MagicMock,
    _mock_mail: MagicMock,
    mock_send: MagicMock,
) -> None:
    mock_gs.return_value = MagicMock(frontend_url="https://app.example.com")
    mock_db = MagicMock()
    interview = MagicMock(
        status="scheduled",
        reminder_email_sent_at=None,
        interview_start=datetime.utcnow() + timedelta(days=1),
        company_name="Acme",
        job_title="Engineer",
        meeting_link=None,
    )
    user = MagicMock(email="u@example.com", email_interview_reminders=True)
    mock_db.query.return_value.join.return_value.filter.return_value.first.return_value = (
        interview,
        user,
    )

    with patch("app.tasks.reminder_tasks.SessionLocal", return_value=mock_db):
        assert send_interview_reminder_email.run(9) == "sent"
    mock_send.assert_called_once()
    assert interview.reminder_email_sent_at is not None
    mock_db.commit.assert_called_once()
