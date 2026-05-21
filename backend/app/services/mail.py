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


def send_email_verification_email(settings: Settings, *, to_email: str, verify_url: str) -> None:
    subject = "Verify your TWIN email"
    text_body = (
        "Welcome to TWIN. Confirm your email to activate your account fully.\n\n"
        f"Open this link (valid for a limited time):\n{verify_url}\n\n"
        "If you did not create an account, ignore this message.\n"
    )
    html_body = (
        "<p>Welcome to TWIN. Confirm your email to activate your account fully.</p>"
        f'<p><a href="{verify_url}">Verify email</a></p>'
        "<p>If you did not create an account, ignore this message.</p>"
    )
    send_generic_email(
        settings,
        to_email=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )


def send_generic_email(
    settings: Settings,
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """Send a simple transactional message (waitlist, ops, etc.)."""
    from_addr = _from_address(settings)
    if settings.resend_api_key.strip():
        _send_via_resend(settings, to_email, from_addr, subject, text_body, html_body)
        return
    if settings.smtp_host.strip():
        _send_via_smtp(settings, to_email, from_addr, subject, text_body, html_body)
        return
    raise RuntimeError("Mail is not configured")


def send_employer_attestation_email(
    settings: Settings,
    *,
    to_email: str,
    attest_url: str,
    company_name: str,
) -> None:
    """Transactional: employer one-click placement confirm (candidate shared link)."""
    subject = f"Confirm hire via TWIN — {company_name}"
    text_body = (
        f"A TWIN candidate asked you to confirm their placement at {company_name}.\n\n"
        f"One-click confirm (no account):\n{attest_url}\n\n"
        "If you did not expect this, ignore the message.\n"
    )
    html_body = (
        f"<p>A TWIN candidate asked you to confirm their placement at <strong>{company_name}</strong>.</p>"
        f'<p><a href="{attest_url}">Confirm placement</a></p>'
        "<p>If you did not expect this, you can ignore this message.</p>"
    )
    send_generic_email(settings, to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def send_placement_verification_email(settings: Settings, *, to_email: str, verify_url: str) -> None:
    """Transactional: confirm you started / received offer — link hits dashboard then API confirm."""
    subject = "Confirm your placement with TWIN"
    text_body = (
        "TWIN recorded a request to verify your new role using this work email address.\n\n"
        f"Open this link to confirm (one time, expires in 48 hours):\n{verify_url}\n\n"
        "If you did not request this, you can ignore this message.\n"
    )
    html_body = (
        "<p>TWIN recorded a request to verify your new role using this work email address.</p>"
        f'<p><a href="{verify_url}">Confirm placement</a></p>'
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
