"""Production environment validation at API startup."""

from __future__ import annotations

import logging
import sys

from app.config import Settings, _DEV_SECRET_KEY, get_settings

logger = logging.getLogger(__name__)

_DEV_DATABASE_URL = "postgresql+psycopg://twin:twin@localhost:5433/twin_dev"


def validate_production_config(settings: Settings | None = None) -> None:
    """
    Fail fast when production/staging is misconfigured.

    SECRET_KEY defaults are enforced in ``Settings`` validators; this module adds
    operational checks (database URL, Stripe webhook when billing is enabled).
    """
    s = settings or get_settings()
    env = (s.environment or "").strip().lower()
    if env not in ("production", "staging"):
        logger.info("Skipping production startup checks (environment=%s)", env or "development")
        return

    logger.info("Running production configuration validation...")
    errors: list[str] = []

    db_url = (s.database_url or "").strip()
    if not db_url or db_url == _DEV_DATABASE_URL or "@localhost" in db_url:
        errors.append(
            "DATABASE_URL must point to a non-local database in production/staging."
        )

    stripe_key = (s.stripe_secret_key or "").strip()
    stripe_wh = (s.stripe_webhook_secret or "").strip()
    if stripe_key and not stripe_wh:
        errors.append(
            "STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set (billing webhooks)."
        )

    greenhouse_secret = (s.greenhouse_webhook_secret or "").strip()
    if not greenhouse_secret:
        logger.warning(
            "GREENHOUSE_WEBHOOK_SECRET not set — Greenhouse webhooks will be rejected in production."
        )

    if errors:
        logger.error("=" * 60)
        logger.error("PRODUCTION CONFIGURATION ERRORS DETECTED")
        logger.error("=" * 60)
        for msg in errors:
            logger.error("  %s", msg)
        logger.error("=" * 60)
        logger.error("Exiting to prevent insecure production deployment.")
        sys.exit(1)

    logger.info("Production configuration validation passed")
