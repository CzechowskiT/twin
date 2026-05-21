"""Placement retention nudge after verification (transactional, once per application)."""

from __future__ import annotations

from app.config import Settings
from app.services.mail import send_generic_email


def send_placement_retention_welcome_email(
    settings: Settings,
    *,
    to_email: str,
    company_name: str,
    job_title: str,
    dashboard_url: str,
) -> None:
    subject = "TWIN: placement verified — retention clock started"
    text_body = (
        f"Thanks for confirming your role at {company_name} ({job_title}).\n\n"
        "TWIN started the retention clock for this placement. You can review status "
        f"anytime in your dashboard:\n{dashboard_url}\n"
    )
    html_body = (
        f"<p>Thanks for confirming your role at <strong>{company_name}</strong> "
        f"(<strong>{job_title}</strong>).</p>"
        "<p>TWIN started the retention clock for this placement.</p>"
        f'<p><a href="{dashboard_url}">Open dashboard</a></p>'
    )
    send_generic_email(settings, to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
