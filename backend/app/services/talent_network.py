"""Re-engagement helpers for candidates with verified placements (talent network)."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Candidate


def list_candidates_verified_placements_before(
    db: Session,
    *,
    older_than_days: int = 540,
    limit: int = 200,
) -> list[Candidate]:
    """Candidates with a verified placement whose verification date is older than ``older_than_days``."""
    older_than_days = max(30, min(3650, older_than_days))
    limit = max(1, min(1000, limit))
    cutoff = datetime.utcnow() - timedelta(days=older_than_days)
    q = (
        db.query(Candidate)
        .join(Application, Application.candidate_id == Candidate.id)
        .filter(
            Application.placement_verified_at.isnot(None),
            Application.placement_verified_at < cutoff,
            Application.status == ApplicationStatus.HIRED,
        )
        .distinct()
        .limit(limit)
    )
    return list(q.all())
