"""Summary email after autonomous auto-apply (scheduled or manual test)."""

from app.config import Settings
from app.services.mail import send_generic_email


def send_nightly_auto_apply_summary_email(
    settings: Settings,
    *,
    to_email: str,
    applications_count: int,
    manual_trigger: bool = False,
) -> None:
    n = max(0, int(applications_count))
    dashboard = (settings.frontend_url or "http://localhost:3000").rstrip("/")
    settings_url = f"{dashboard}/dashboard/settings/auto-apply"

    if manual_trigger:
        if n == 1:
            subject = "TWIN: 1 testowa auto-aplikacja"
        else:
            subject = f"TWIN: {n} testowe auto-aplikacje"
        text_body = (
            f"TWIN właśnie wykonał test autonomicznej aplikacji — {n} ofert(a) "
            f"(próg dopasowania i limity zostały zastosowane).\n\n"
            f"Pipeline: {dashboard}/dashboard\n"
            f"Ustawienia agenta aplikacji: {settings_url}\n"
        )
        html_body = (
            f"<p>TWIN właśnie wykonał <strong>test</strong> autonomicznej aplikacji — "
            f"<strong>{n}</strong> ofert(a).</p>"
            f'<p><a href="{dashboard}/dashboard">Otwórz panel</a> · '
            f'<a href="{settings_url}">Ustawienia agenta aplikacji</a></p>'
        )
    else:
        subject = f"TWIN: {n} application{'s' if n != 1 else ''} submitted overnight"
        text_body = (
            f"Good morning — while you were away, TWIN auto-applied to {n} job listing(s) "
            f"that matched your profile (score threshold and daily limit applied).\n\n"
            f"Review your pipeline: {dashboard}/dashboard\n"
            f"Auto-apply settings: {settings_url}\n"
        )
        html_body = (
            f"<p>Good morning — TWIN auto-applied to <strong>{n}</strong> job listing(s) overnight.</p>"
            f'<p><a href="{dashboard}/dashboard">Open your dashboard</a> · '
            f'<a href="{settings_url}">Auto-apply settings</a></p>'
        )

    send_generic_email(settings, to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
