"""Per-job match feedback (distinct from product_feedback)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.database.models import JobMatchFeedback
from app.matching.quality_gate import FEEDBACK_VALUES


def list_feedback_by_candidate(db: Session, candidate_id: int) -> dict[int, str]:
    """Latest feedback value per job_id for a candidate."""
    rows = (
        db.query(JobMatchFeedback)
        .filter(JobMatchFeedback.candidate_id == candidate_id)
        .order_by(JobMatchFeedback.updated_at.desc())
        .all()
    )
    out: dict[int, str] = {}
    for row in rows:
        if row.job_id not in out:
            out[row.job_id] = row.feedback_value
    return out


def excluded_job_ids(db: Session, candidate_id: int) -> set[int]:
    """Jobs the candidate marked not_relevant — hide from ranking."""
    return {
        job_id
        for job_id, value in list_feedback_by_candidate(db, candidate_id).items()
        if value == "not_relevant"
    }


def apply_intent_job_ids(db: Session, candidate_id: int) -> set[int]:
    return {
        job_id
        for job_id, value in list_feedback_by_candidate(db, candidate_id).items()
        if value == "apply_intent"
    }


def upsert_feedback(
    db: Session,
    *,
    candidate_id: int,
    job_id: int,
    feedback_value: str,
) -> JobMatchFeedback:
    value = feedback_value.strip().lower()
    if value not in FEEDBACK_VALUES:
        raise ValueError(f"Invalid feedback_value: {feedback_value}")
    row = (
        db.query(JobMatchFeedback)
        .filter(
            JobMatchFeedback.candidate_id == candidate_id,
            JobMatchFeedback.job_id == job_id,
        )
        .first()
    )
    if row:
        row.feedback_value = value
    else:
        row = JobMatchFeedback(
            candidate_id=candidate_id,
            job_id=job_id,
            feedback_value=value,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
