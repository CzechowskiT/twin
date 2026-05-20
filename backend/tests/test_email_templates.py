"""Branded transactional HTML email builders."""

from app.services.email_templates import build_beta_waitlist_welcome_email


def test_beta_waitlist_welcome_html_has_brand_shell() -> None:
    subject, text, html = build_beta_waitlist_welcome_email(
        position=7,
        dashboard_url="https://app.example.com/beta/dashboard?code=abc",
        share_url="https://app.example.com/waitlist?ref=abc",
        register_url="https://app.example.com/register?ref=abc",
    )
    assert "#7" in subject
    assert "waitlist" in subject.lower()
    assert "https://app.example.com/beta/dashboard" in text
    assert "color-scheme" in html
    assert "#7" in html
    assert "Open your waitlist dashboard" in html
    assert "display:none" in html  # preheader
    assert "bgcolor=" in html  # email-client-safe solid fills


def test_beta_waitlist_welcome_polish_copy() -> None:
    subject, _, html = build_beta_waitlist_welcome_email(
        position=3,
        dashboard_url="https://app.example.com/d",
        share_url="https://app.example.com/s",
        register_url="https://app.example.com/r",
        locale="pl",
    )
    assert "liście" in subject.lower() or "miejsce" in subject.lower()
    assert "panel waitlisty" in html.lower() or "Panel waitlisty" in html
