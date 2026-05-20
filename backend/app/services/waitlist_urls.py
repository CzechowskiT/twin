"""Deep links for beta waitlist lifecycle emails."""

from __future__ import annotations

from urllib.parse import urlencode

from app.config import Settings


def waitlist_referral_landing_url(settings: Settings, referral_code: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}/waitlist?ref={referral_code}"


def beta_dashboard_url(settings: Settings, referral_code: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}/beta/dashboard?code={referral_code}"


def register_from_waitlist_url(settings: Settings, referral_code: str) -> str:
    base = settings.frontend_url.rstrip("/")
    q = urlencode(
        {
            "utm_source": "waitlist",
            "utm_medium": "email",
            "ref": referral_code,
        }
    )
    return f"{base}/register?{q}"
