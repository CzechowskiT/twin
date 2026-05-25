"""Scrape trigger eligibility and optional ops allowlist (elevated limits / monitoring)."""

from app.config import Settings
from app.database.models import User


def core_consents_complete(user: User) -> bool:
    """Privacy + ToS + job-data + AI matching — same bar as password login."""
    return bool(
        user.gdpr_consent_at
        and user.terms_of_service_accepted_at
        and user.job_data_processing_consent_at
        and user.ai_matching_consent_at
    )


def user_can_trigger_scrape(user: User, settings: Settings) -> bool:
    """Manual scrape-all from dashboard/API — off by default (autonomous beat only)."""
    if not settings.scrape_user_trigger_enabled:
        return False
    return bool(user.is_active) and core_consents_complete(user)


def parse_scrape_ops_user_ids(raw: str) -> set[int]:
    ids: set[int] = set()
    for part in (raw or "").split(","):
        token = part.strip()
        if token.isdigit():
            ids.add(int(token))
    return ids


def parse_scrape_ops_emails(raw: str) -> set[str]:
    return {part.strip().lower() for part in (raw or "").split(",") if part.strip()}


def scrape_ops_configured(settings: Settings) -> bool:
    return bool(parse_scrape_ops_user_ids(settings.scrape_ops_user_ids)) or bool(
        parse_scrape_ops_emails(settings.scrape_ops_emails)
    )


def user_has_scrape_ops(user: User, settings: Settings) -> bool:
    if user.id in parse_scrape_ops_user_ids(settings.scrape_ops_user_ids):
        return True
    emails = parse_scrape_ops_emails(settings.scrape_ops_emails)
    return bool(emails) and user.email.strip().lower() in emails


def scrape_worker_ready(settings: Settings) -> bool:
    """True when scrape jobs can run: in-process eager API or dedicated worker declared."""
    if settings.celery_task_always_eager:
        return True
    return settings.scrape_worker_ready
