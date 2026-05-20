"""Welcome email after beta waitlist signup (optional SMTP / Resend)."""

from __future__ import annotations

import logging

from app.config import Settings
from app.services.mail import is_mail_configured, send_generic_email
from app.services.waitlist_urls import beta_dashboard_url, register_from_waitlist_url, waitlist_referral_landing_url

logger = logging.getLogger(__name__)


def send_beta_waitlist_welcome_email(
    settings: Settings,
    *,
    to_email: str,
    referral_code: str,
    position: int,
) -> bool:
    """Send day-0 waitlist email with deep links. Returns True if sent, False if mail not configured."""
    if not is_mail_configured(settings):
        logger.info("beta waitlist welcome skipped (mail not configured) for %s", to_email)
        return False
    dashboard = beta_dashboard_url(settings, referral_code)
    share = waitlist_referral_landing_url(settings, referral_code)
    register = register_from_waitlist_url(settings, referral_code)
    subject = "You're on the TWIN wishlist — here's your dashboard"
    text_body = (
        "You're in.\n\n"
        f"Your spot in line: about #{position}.\n\n"
        "Next steps:\n"
        f"1) Open your waitlist dashboard: {dashboard}\n"
        f"2) Share your link to move up: {share}\n"
        f"3) When beta opens, create your account: {register}\n\n"
        "— TWIN"
    )
    html_body = (
        "<p>You're in.</p>"
        f"<p>Your spot in line: about <strong>#{position}</strong>.</p>"
        "<p><strong>Next steps</strong></p>"
        "<ol>"
        f'<li><a href="{dashboard}">Open your waitlist dashboard</a></li>'
        f'<li><a href="{share}">Copy your referral link</a> (share to move up)</li>'
        f'<li><a href="{register}">Register for TWIN</a> when beta opens</li>'
        "</ol>"
        "<p>— TWIN</p>"
    )
    try:
        send_generic_email(settings, to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
        return True
    except Exception:
        logger.exception("beta waitlist welcome email failed for %s", to_email)
        return False
