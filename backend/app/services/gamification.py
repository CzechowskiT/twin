"""Gamification: XP, streaks, badges — complements career_compass milestones."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, CandidateProgress


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _level_from_xp(xp: int) -> int:
    tiers = [0, 50, 120, 250, 450, 700, 1000, 1400, 1900, 2500]
    level = 1
    for i, threshold in enumerate(tiers):
        if xp >= threshold:
            level = i + 1
    return min(level, 15)


def get_or_create_progress(db: Session, candidate_id: int) -> CandidateProgress:
    row = db.query(CandidateProgress).filter(CandidateProgress.candidate_id == candidate_id).first()
    if row:
        return row
    row = CandidateProgress(candidate_id=candidate_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _parse_badges(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def _award_badge(badges: list[dict[str, Any]], badge_id: str, title: str) -> list[dict[str, Any]]:
    if any(b.get("id") == badge_id for b in badges):
        return badges
    badges.append({"id": badge_id, "title": title, "earned_at": datetime.now(timezone.utc).isoformat()})
    return badges


def record_activity(db: Session, candidate: Candidate, *, event: str) -> CandidateProgress:
    """Bump XP/streak on profile or pipeline events."""
    row = get_or_create_progress(db, candidate.id)
    xp_gain = {"profile_update": 10, "application": 25, "interview_prep": 40, "login": 5}.get(event, 5)
    row.xp_total = int(row.xp_total or 0) + xp_gain
    row.level = _level_from_xp(row.xp_total)
    today = _today()
    if row.last_active_date == today:
        pass
    elif row.last_active_date and (today - row.last_active_date).days == 1:
        row.streak_days = int(row.streak_days or 0) + 1
    else:
        row.streak_days = 1
    row.last_active_date = today
    badges = _parse_badges(row.badges_json)
    if row.streak_days >= 3:
        badges = _award_badge(badges, "streak_3", "3-day streak")
    if row.xp_total >= 100:
        badges = _award_badge(badges, "xp_100", "Century XP")
    row.badges_json = json.dumps(badges, ensure_ascii=False)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def progress_snapshot(db: Session, candidate: Candidate) -> dict[str, Any]:
    """Aggregate progress for dashboard API."""
    row = get_or_create_progress(db, candidate.id)
    app_count = db.query(Application).filter(Application.candidate_id == candidate.id).count()
    badges = _parse_badges(row.badges_json)
    next_level_xp = _next_level_threshold(int(row.xp_total or 0))
    return {
        "xp_total": int(row.xp_total or 0),
        "level": int(row.level or 1),
        "streak_days": int(row.streak_days or 0),
        "badges": badges,
        "applications_count": app_count,
        "next_level_xp": next_level_xp,
        "xp_to_next_level": max(0, next_level_xp - int(row.xp_total or 0)),
    }


def _next_level_threshold(xp: int) -> int:
    tiers = [50, 120, 250, 450, 700, 1000, 1400, 1900, 2500, 3200]
    for t in tiers:
        if xp < t:
            return t
    return xp + 500
