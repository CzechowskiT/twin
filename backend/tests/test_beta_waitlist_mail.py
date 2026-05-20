"""Beta waitlist welcome email deep links."""

from unittest.mock import MagicMock, patch

from app.config import Settings
from app.services.waitlist_urls import beta_dashboard_url, register_from_waitlist_url, waitlist_referral_landing_url


def test_waitlist_deep_link_urls() -> None:
    s = Settings(frontend_url="https://app.example.com")
    assert waitlist_referral_landing_url(s, "abc123") == "https://app.example.com/waitlist?ref=abc123"
    assert beta_dashboard_url(s, "abc123") == "https://app.example.com/beta/dashboard?code=abc123"
    assert "utm_source=waitlist" in register_from_waitlist_url(s, "abc123")
    assert "ref=abc123" in register_from_waitlist_url(s, "abc123")


@patch("app.services.beta_waitlist_mail.send_generic_email")
def test_send_welcome_when_mail_configured(mock_send: MagicMock) -> None:
    s = Settings(
        frontend_url="https://app.example.com",
        resend_api_key="re_test",
        mail_from="TWIN <hello@twin.test>",
    )
    from app.services.beta_waitlist_mail import send_beta_waitlist_welcome_email

    assert send_beta_waitlist_welcome_email(s, to_email="a@b.com", referral_code="deadbeef", position=42)
    mock_send.assert_called_once()
    _args, kwargs = mock_send.call_args
    assert kwargs["to_email"] == "a@b.com"
    assert "deadbeef" in kwargs["text_body"]
    assert "beta/dashboard?code=deadbeef" in kwargs["text_body"]
    assert "#42" in kwargs["html_body"]
    assert "waitlist dashboard" in kwargs["html_body"].lower()
    assert "TWIN" in kwargs["html_body"]


@patch("app.services.beta_waitlist_mail.send_generic_email")
def test_send_welcome_skipped_without_mail(mock_send: MagicMock) -> None:
    from app.services.beta_waitlist_mail import send_beta_waitlist_welcome_email

    s = Settings(frontend_url="https://app.example.com")
    assert not send_beta_waitlist_welcome_email(s, to_email="a@b.com", referral_code="x", position=1)
    mock_send.assert_not_called()
