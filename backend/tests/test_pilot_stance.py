"""Unit tests for resolve_pilot_stance."""

from __future__ import annotations

from app.config import Settings
from app.services.pilot_stance import (
    PILOT_BLOCKED,
    PILOT_READY,
    is_controlled_pilot_ready,
    on_call_assigned,
    resolve_pilot_stance,
    temporary_pilot_canonical_url,
)


def test_default_blocked() -> None:
    s = Settings(pilot_stance="BLOCKED_BY_FOUNDER")
    assert resolve_pilot_stance(s) == PILOT_BLOCKED
    assert not is_controlled_pilot_ready(s)


def test_ready_aliases() -> None:
    for raw in ("READY_FOR_CONTROLLED_PILOT", "ready", "CONTROLLED_PILOT_READY"):
        s = Settings(pilot_stance=raw)
        assert resolve_pilot_stance(s) == PILOT_READY
        assert is_controlled_pilot_ready(s)


def test_canonical_url_and_on_call() -> None:
    s = Settings(temporary_pilot_canonical_url="https://twin-sooty.vercel.app/")
    assert temporary_pilot_canonical_url(s) == "https://twin-sooty.vercel.app"
    assert on_call_assigned("Tomasz <cz***@example.com>")
    assert not on_call_assigned("PILOT_ON_CALL_PRIMARY_UNASSIGNED")
    assert not on_call_assigned("")
