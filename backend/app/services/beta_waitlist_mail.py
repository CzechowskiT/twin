"""Welcome email after beta waitlist signup (optional SMTP / Resend)."""

from __future__ import annotations

import logging

from app.config import Settings
from app.services.email_templates import build_beta_waitlist_welcome_email
from app.services.mail import is_mail_configured, send_generic_email
from app.services.waitlist_urls import beta_dashboard_url, register_from_waitlist_url, waitlist_referral_landing_url

logger = logging.getLogger(__name__)


def send_beta_waitlist_welcome_email(
    settings: Settings,
    *,
    to_email: str,
    referral_code: str,
    position: int,
    locale: str = "en",
) -> bool:
    """Send day-0 waitlist email with deep links. Returns True if sent, False if mail not configured."""
    if not is_mail_configured(settings):
        logger.info("beta waitlist welcome skipped (mail not configured) for %s", to_email)
        return False
    dashboard = beta_dashboard_url(settings, referral_code)
    share = waitlist_referral_landing_url(settings, referral_code)
    register = register_from_waitlist_url(settings, referral_code)
    subject, text_body, html_body = build_beta_waitlist_welcome_email(
        position=position,
        dashboard_url=dashboard,
        share_url=share,
        register_url=register,
        locale=locale,
    )
    try:
        send_generic_email(settings, to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
        return True
    except Exception:
        logger.exception("beta waitlist welcome email failed for %s", to_email)
        return False
