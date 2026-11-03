"""Canonical pilot stance — controlled pilot vs founder block.

Launch / enrollment / Phase 3B remain separately frozen.
"""

from __future__ import annotations

from app.config import Settings, get_settings

PILOT_BLOCKED = "BLOCKED_BY_FOUNDER"
PILOT_READY = "READY_FOR_CONTROLLED_PILOT"
PILOT_JOURNEY_INCOMPLETE = "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE"
_ALLOWED = frozenset({PILOT_BLOCKED, PILOT_READY, PILOT_JOURNEY_INCOMPLETE})


def resolve_pilot_stance(settings: Settings | None = None) -> str:
    """Return pilot stance from env (READY / incomplete / blocked)."""
    s = settings or get_settings()
    raw = (s.pilot_stance or "").strip().upper().replace("-", "_").replace(" ", "_")
    if raw in {"READY_FOR_CONTROLLED_PILOT", "READY", "CONTROLLED_PILOT_READY"}:
        return PILOT_READY
    if raw in {
        "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE",
        "CUSTOMER_JOURNEY_INCOMPLETE",
        "JOURNEY_INCOMPLETE",
    }:
        return PILOT_JOURNEY_INCOMPLETE
    if raw in _ALLOWED:
        return raw
    return PILOT_BLOCKED


def is_controlled_pilot_ready(settings: Settings | None = None) -> bool:
    return resolve_pilot_stance(settings) == PILOT_READY


def temporary_pilot_canonical_url(settings: Settings | None = None) -> str:
    s = settings or get_settings()
    url = (s.temporary_pilot_canonical_url or "").strip().rstrip("/")
    return url or "https://twin-sooty.vercel.app"


def on_call_assigned(value: str | None) -> bool:
    v = (value or "").strip()
    return bool(v) and not v.endswith("UNASSIGNED")

# Controlled Pilot OS tip align 20260723T183908Z
