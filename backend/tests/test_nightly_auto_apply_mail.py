"""Tests for autonomous apply summary email copy."""

from unittest.mock import patch

from app.config import Settings
from app.services.nightly_auto_apply_mail import send_nightly_auto_apply_summary_email


def test_manual_trigger_email_avoids_overnight_wording() -> None:
    settings = Settings(frontend_url="https://example.com")
    with patch("app.services.nightly_auto_apply_mail.send_generic_email") as mock_send:
        send_nightly_auto_apply_summary_email(
            settings,
            to_email="founder@example.com",
            applications_count=1,
            manual_trigger=True,
        )
    mock_send.assert_called_once()
    kwargs = mock_send.call_args.kwargs
    assert "overnight" not in kwargs["subject"].lower()
    assert "testowa auto-aplikacja" in kwargs["subject"]
    assert "overnight" not in kwargs["text_body"].lower()


def test_nightly_email_keeps_overnight_wording() -> None:
    settings = Settings(frontend_url="https://example.com")
    with patch("app.services.nightly_auto_apply_mail.send_generic_email") as mock_send:
        send_nightly_auto_apply_summary_email(
            settings,
            to_email="founder@example.com",
            applications_count=2,
            manual_trigger=False,
        )
    kwargs = mock_send.call_args.kwargs
    assert "overnight" in kwargs["subject"].lower()
    assert "overnight" in kwargs["html_body"].lower()
