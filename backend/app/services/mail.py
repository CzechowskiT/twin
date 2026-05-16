"""Transactional email (password reset). Optional SMTP or Resend."""

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


def is_mail_configured(settings: Settings) -> bool:
    if settings.resend_api_key.strip():
        return bool(settings.mail_from.strip())
    return bool(settings.smtp_host.strip() and settings.smtp_from.strip())


def _from_address(settings: Settings) -> str:
    return (settings.smtp_from or settings.mail_from).strip()


def send_password_reset_email(settings: Settings, *, to_email: str, reset_url: str) -> None:
    """Send reset email or raise on transport failure (caller handles logging fallback)."""
    subject = "Reset your TWIN password"
    text_body = (
        "We received a request to reset your TWIN account password.\n\n"
        f"Open this link to choose a new password (valid for a limited time):\n{reset_url}\n\n"
        "If you did not request this, you can ignore this message.\n"
    )
    html_body = (
        "<p>We received a request to reset your TWIN account password.</p>"
        f'<p><a href="{reset_url}">Set a new password</a></p>'
        "<p>If you did not request this, you can ignore this message.</p>"
    )
    from_addr = _from_address(settings)

    if settings.resend_api_key.strip():
        _send_via_resend(settings, to_email, from_addr, subject, text_body, html_body)
        return

    if settings.smtp_host.strip():
        _send_via_smtp(settings, to_email, from_addr, subject, text_body, html_body)
        return

    raise RuntimeError("Mail is not configured")


def _send_via_resend(
    settings: Settings,
    to_email: str,
    from_addr: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    payload = {
        "from": from_addr,
        "to": [to_email],
        "subject": subject,
        "text": text_body,
        "html": html_body,
    }
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key.strip()}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        res.raise_for_status()


def _send_via_smtp(
    settings: Settings,
    to_email: str,
    from_addr: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    host = settings.smtp_host.strip()
    port = int(settings.smtp_port)
    user = settings.smtp_user.strip()
    password = settings.smtp_password

    with smtplib.SMTP(host, port, timeout=30) as smtp:
        smtp.ehlo()
        try:
            smtp.starttls()
            smtp.ehlo()
        except smtplib.SMTPException:
            pass
        if user and password:
            smtp.login(user, password)
        smtp.send_message(msg)
