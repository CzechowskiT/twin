"""Gamification API schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class BadgeOut(BaseModel):
    id: str
    title: str
    earned_at: str | None = None


class GamificationProgressOut(BaseModel):
    xp_total: int
    level: int
    streak_days: int
    badges: list[BadgeOut]
    applications_count: int
    next_level_xp: int
    xp_to_next_level: int
    paywall: dict[str, str] | None = None
