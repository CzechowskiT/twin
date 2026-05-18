"""Aggregate placement outcomes for internal analytics (non-PII aggregates)."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Job


def placement_summary_by_company(db: Session, *, limit: int = 50) -> dict[str, Any]:
    """Count verified placements (HIRED + placement_verified_at) per company label."""
    limit = max(1, min(200, limit))
    rows = (
        db.query(Job.company, func.count(Application.id))
        .join(Application, Application.job_id == Job.id)
        .filter(
            Application.status == ApplicationStatus.HIRED,
            Application.placement_verified_at.isnot(None),
        )
        .group_by(Job.company)
        .order_by(func.count(Application.id).desc())
        .limit(limit)
        .all()
    )
    return {"by_company": [{"company": c, "verified_hires": int(n)} for c, n in rows]}


def skill_cooccurrence_from_titles(db: Session, *, sample: int = 500) -> dict[str, Any]:
    """Cheap token co-occurrence from job titles (placeholder for richer CV-based moat)."""
    sample = max(50, min(5000, sample))
    titles = [t for (t,) in db.query(Job.title).filter(Job.is_validated.is_(True)).limit(sample).all()]
    pairs: dict[str, int] = defaultdict(int)
    for title in titles:
        words = {w.lower() for w in title.replace("/", " ").split() if len(w) > 3}
        for a in words:
            for b in words:
                if a < b:
                    pairs[f"{a}|{b}"] += 1
    top = sorted(pairs.items(), key=lambda kv: kv[1], reverse=True)[:30]
    return {"title_token_pairs": [{"pair": k, "count": v} for k, v in top]}
