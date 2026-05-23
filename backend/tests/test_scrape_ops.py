"""Scrape ops allowlist and worker readiness flags."""

from datetime import datetime, timezone

from app.config import Settings
from app.core.scrape_ops import (
    core_consents_complete,
    scrape_worker_ready,
    user_can_trigger_scrape,
    user_has_scrape_ops,
)
from app.database.models import User

_NOW = datetime.now(timezone.utc)


def _consented_user() -> User:
    return User(
        email="u@test.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=_NOW,
        terms_of_service_accepted_at=_NOW,
        job_data_processing_consent_at=_NOW,
        ai_matching_consent_at=_NOW,
    )


def test_scrape_worker_ready_when_eager() -> None:
    s = Settings(celery_task_always_eager=True, scrape_worker_ready=False)
    assert scrape_worker_ready(s) is True


def test_scrape_worker_ready_when_declared() -> None:
    s = Settings(celery_task_always_eager=False, scrape_worker_ready=True)
    assert scrape_worker_ready(s) is True


def test_scrape_worker_not_ready_without_eager_or_flag() -> None:
    s = Settings(celery_task_always_eager=False, scrape_worker_ready=False)
    assert scrape_worker_ready(s) is False


def test_user_can_trigger_scrape_with_consents() -> None:
    user = _consented_user()
    settings = Settings()
    assert core_consents_complete(user) is True
    assert user_can_trigger_scrape(user, settings) is True


def test_user_can_trigger_scrape_without_ops_allowlist() -> None:
    user = _consented_user()
    settings = Settings(scrape_ops_emails="", scrape_ops_user_ids="")
    assert user_can_trigger_scrape(user, settings) is True
    assert user_has_scrape_ops(user, settings) is False


def test_ops_allowlist_does_not_gate_scrape() -> None:
    user = _consented_user()
    settings = Settings(scrape_ops_emails="other@test.com", scrape_ops_user_ids="")
    assert user_has_scrape_ops(user, settings) is False
    assert user_can_trigger_scrape(user, settings) is True
