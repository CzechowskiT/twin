"""Production startup validation."""

import sys
from unittest.mock import MagicMock, patch

import pytest

from app.config import Settings
from app.core.startup_checks import validate_production_config


def test_startup_allows_development_with_local_db() -> None:
    s = Settings(environment="development")
    validate_production_config(s)


def test_startup_rejects_local_database_in_production() -> None:
    s = Settings(
        environment="production",
        secret_key="x" * 32,
        database_url="postgresql+psycopg://twin:twin@localhost:5433/twin_dev",
    )
    with patch.object(sys, "exit") as mock_exit:
        validate_production_config(s)
        mock_exit.assert_called_once_with(1)


def test_startup_passes_with_remote_database() -> None:
    s = Settings(
        environment="production",
        secret_key="x" * 32,
        database_url="postgresql+psycopg://user:pass@db.railway.internal:5432/twin",
    )
    validate_production_config(s)


def test_startup_requires_stripe_webhook_when_billing_enabled() -> None:
    s = Settings(
        environment="production",
        secret_key="x" * 32,
        database_url="postgresql+psycopg://user:pass@db.railway.internal:5432/twin",
        stripe_secret_key="sk_live_test",
        stripe_webhook_secret="",
    )
    with patch.object(sys, "exit") as mock_exit:
        validate_production_config(s)
        mock_exit.assert_called_once_with(1)


def test_production_settings_still_reject_dev_secret_key(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings()
