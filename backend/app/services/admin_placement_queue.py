"""Ops queue: applications in placement dispute state."""

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, Job, User


def build_placement_dispute_queue(db: Session, *, limit: int = 50) -> dict:
    rows = (
        db.query(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .join(User, Candidate.user_id == User.id)
        .filter(Application.placement_state == "disputed")
        .order_by(Application.updated_at.desc())
        .limit(min(100, max(1, limit)))
        .all()
    )
    items = [
        {
            "application_id": app.id,
            "company": job.company,
            "job_title": job.title,
            "candidate_email": user.email,
            "placement_reported_at": app.placement_reported_at.isoformat() + "Z"
            if app.placement_reported_at and app.placement_reported_at.tzinfo is None
            else (app.placement_reported_at.isoformat() if app.placement_reported_at else None),
            "updated_at": app.updated_at.isoformat() + "Z"
            if app.updated_at.tzinfo is None
            else app.updated_at.isoformat(),
        }
        for app, job, user in rows
    ]
    return {"items": items, "total": len(items)}
