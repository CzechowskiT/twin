"""Product ops metrics: signups, pipeline volume, feedback sentiment."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Application, JobMatch, ProductFeedback, User


def build_admin_metrics(db: Session) -> dict:
    """Return headline KPIs for the admin metrics dashboard."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    users_total = db.query(func.count(User.id)).scalar() or 0
    signups_7d = (
        db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0
    )
    onboarding_done = (
        db.query(func.count(User.id)).filter(User.onboarding_completed_at.isnot(None)).scalar() or 0
    )
    matches_total = db.query(func.count(JobMatch.id)).scalar() or 0
    applications_total = db.query(func.count(Application.id)).scalar() or 0
    feedback_count = db.query(func.count(ProductFeedback.id)).scalar() or 0
    avg_rating = db.query(func.avg(ProductFeedback.rating)).scalar()
    rating_histogram = {i: 0 for i in range(1, 6)}
    for rating, count in (
        db.query(ProductFeedback.rating, func.count(ProductFeedback.id))
        .group_by(ProductFeedback.rating)
        .all()
    ):
        if 1 <= rating <= 5:
            rating_histogram[rating] = count
    return {
        "users_total": users_total,
        "signups_last_7_days": signups_7d,
        "onboarding_completed": onboarding_done,
        "onboarding_completion_pct": round(100.0 * onboarding_done / users_total, 1)
        if users_total
        else 0.0,
        "matches_total": matches_total,
        "applications_total": applications_total,
        "feedback_count": feedback_count,
        "feedback_avg_rating": round(float(avg_rating), 2) if avg_rating is not None else None,
        "feedback_rating_histogram": rating_histogram,
        "generated_at": now.isoformat() + "Z",
    }
