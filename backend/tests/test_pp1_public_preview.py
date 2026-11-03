"""PP1 — public preview kill switch independence."""

from __future__ import annotations

import os

from app.services import capability_discoverability as discover


def test_public_preview_default_inactive(monkeypatch):
    monkeypatch.delenv("PUBLIC_PREVIEW", raising=False)
    monkeypatch.delenv("NEXT_PUBLIC_PUBLIC_PREVIEW", raising=False)
    assert discover.public_preview_enabled() is False
    assert discover.public_preview_status_code() == "READY_INACTIVE"
    body = discover.public_preview_status()
    assert body["enabled_in_production"] is False
    assert body["independent_of_launch_gates"] is True


def test_public_preview_enable_exact_value(monkeypatch):
    monkeypatch.setenv("PUBLIC_PREVIEW", "READ_ONLY_SYNTHETIC")
    assert discover.public_preview_enabled() is True
    assert discover.public_preview_status_code() == "ENABLED"


def test_public_preview_wrong_value_stays_off(monkeypatch):
    monkeypatch.setenv("PUBLIC_PREVIEW", "true")
    assert discover.public_preview_enabled() is False


def test_public_preview_does_not_require_launch_env(monkeypatch):
    """Enabling preview must not imply enrollment/signup/launch."""
    monkeypatch.setenv("PUBLIC_PREVIEW", "READ_ONLY_SYNTHETIC")
    # These remain independent process env / settings concerns.
    monkeypatch.delenv("EXTERNAL_PILOT_ENROLLMENT_ENABLED", raising=False)
    assert discover.public_preview_enabled() is True
    assert os.environ.get("EXTERNAL_PILOT_ENROLLMENT_ENABLED") in (None, "", "false", "0")
