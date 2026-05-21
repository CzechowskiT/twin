"""Morning summary after nightly auto-apply."""

from app.config import Settings
from app.services.mail import send_generic_email


def send_nightly_auto_apply_summary_email(
    settings: Settings,
    *,
    to_email: str,
    applications_count: int,
) -> None:
    n = max(0, int(applications_count))
    subject = f"TWIN: {n} application{'s' if n != 1 else ''} submitted overnight"
    dashboard = (settings.frontend_url or "http://localhost:3000").rstrip("/")
    text_body = (
        f"Good morning — while you were away, TWIN auto-applied to {n} job listing(s) "
        f"that matched your profile (score threshold and daily limit applied).\n\n"
        f"Review your pipeline: {dashboard}/dashboard\n"
        f"Auto-apply settings: {dashboard}/dashboard/settings/auto-apply\n"
    )
    html_body = (
        f"<p>Good morning — TWIN auto-applied to <strong>{n}</strong> job listing(s) overnight.</p>"
        f'<p><a href="{dashboard}/dashboard">Open your dashboard</a> · '
        f'<a href="{dashboard}/dashboard/settings/auto-apply">Auto-apply settings</a></p>'
    )
    send_generic_email(settings, to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
