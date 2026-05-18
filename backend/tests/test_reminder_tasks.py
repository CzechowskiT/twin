"""Interview reminder Celery task."""

from unittest.mock import MagicMock, patch

from app.tasks.reminder_tasks import send_interview_reminder_email


@patch("app.tasks.reminder_tasks.get_settings")
def test_send_interview_reminder_skipped_without_smtp(mock_gs: MagicMock) -> None:
    m = MagicMock()
    m.smtp_host = ""
    m.smtp_from = ""
    mock_gs.return_value = m
    assert send_interview_reminder_email.run(1) == "skipped_no_smtp"


@patch("app.tasks.reminder_tasks.get_settings")
def test_send_interview_reminder_noop_when_smtp_configured(mock_gs: MagicMock) -> None:
    m = MagicMock()
    m.smtp_host = "smtp.example.com"
    m.smtp_from = "noreply@example.com"
    mock_gs.return_value = m
    assert send_interview_reminder_email.run(2) == "noop_smtp_configured"
