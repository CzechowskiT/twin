"""Candidate acceptance queue — interviews + high-fit matches (north star: short calendar)."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, Job, SavedJob, ScheduledInterview
from app.services.matching_service import find_top_matches


def _dismissed_job_ids(candidate: Candidate) -> set[int]:
    if not candidate.profile_signals_json:
        return set()
    try:
        blob = json.loads(candidate.profile_signals_json)
    except json.JSONDecodeError:
        return set()
    if not isinstance(blob, dict):
        return set()
    raw = blob.get("dismissed_job_ids")
    if not isinstance(raw, list):
        return set()
    return {int(x) for x in raw if isinstance(x, (int, str)) and str(x).isdigit()}


def _set_dismissed_job_ids(db: Session, candidate: Candidate, job_ids: set[int]) -> None:
    blob: dict = {}
    if candidate.profile_signals_json:
        try:
            parsed = json.loads(candidate.profile_signals_json)
            if isinstance(parsed, dict):
                blob = parsed
        except json.JSONDecodeError:
            blob = {}
    blob["dismissed_job_ids"] = sorted(job_ids)[-500:]
    candidate.profile_signals_json = json.dumps(blob, separators=(",", ":"))
    db.add(candidate)


def build_acceptance_queue(db: Session, candidate: Candidate, *, match_limit: int = 5) -> dict:
    """Upcoming interviews + top matches without an application (accept / decline in UI)."""
    now = datetime.now(timezone.utc)
    interviews = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.user_id == candidate.user_id,
            ScheduledInterview.interview_start >= now.replace(tzinfo=None),
            ScheduledInterview.status != "cancelled",
        )
        .order_by(ScheduledInterview.interview_start.asc())
        .limit(5)
        .all()
    )
    applied_job_ids = {
        j
        for (j,) in db.query(Application.job_id)
        .filter(Application.candidate_id == candidate.id)
        .all()
    }
    dismissed = _dismissed_job_ids(candidate)
    saved_ids = {
        j for (j,) in db.query(SavedJob.job_id).filter(SavedJob.candidate_id == candidate.id).all()
    }
    skip = applied_job_ids | dismissed | saved_ids

    match_rows = find_top_matches(db, candidate, limit=20, min_score=55.0)
    matches: list[dict] = []
    for row in match_rows:
        jid = int(row["job_id"])
        if jid in skip:
            continue
        matches.append(
            {
                "kind": "match",
                "job_id": jid,
                "title": row["title"],
                "company": row["company"],
                "score": round(float(row["score"]), 1),
                "url": row["url"],
            },
        )
        if len(matches) >= match_limit:
            break

    return {
        "interviews": [
            {
                "kind": "interview",
                "id": i.id,
                "company_name": i.company_name,
                "job_title": i.job_title,
                "interview_start": i.interview_start.isoformat() if i.interview_start else None,
                "interview_end": i.interview_end.isoformat() if i.interview_end else None,
                "meeting_link": i.meeting_link,
                "status": i.status,
            }
            for i in interviews
        ],
        "matches": matches,
        "total": len(interviews) + len(matches),
    }


def respond_acceptance_item(
    db: Session,
    candidate: Candidate,
    *,
    kind: str,
    item_id: int,
    action: str,
) -> dict:
    """accept|decline for match or interview (interview decline = cancel)."""
    act = action.strip().lower()
    if act not in ("accept", "decline"):
        raise ValueError("action must be accept or decline")
    k = kind.strip().lower()
    if k == "match":
        job = db.query(Job).filter(Job.id == item_id).first()
        if not job:
            raise ValueError("Job not found.")
        if act == "accept":
            exists = (
                db.query(SavedJob)
                .filter(SavedJob.candidate_id == candidate.id, SavedJob.job_id == item_id)
                .first()
            )
            if not exists:
                db.add(SavedJob(candidate_id=candidate.id, job_id=item_id))
            db.commit()
            return {"ok": True, "action": act, "kind": k, "job_id": item_id}
        dismissed = _dismissed_job_ids(candidate)
        dismissed.add(item_id)
        _set_dismissed_job_ids(db, candidate, dismissed)
        db.commit()
        return {"ok": True, "action": act, "kind": k, "job_id": item_id}
    if k == "interview":
        row = (
            db.query(ScheduledInterview)
            .filter(
                ScheduledInterview.id == item_id,
                ScheduledInterview.user_id == candidate.user_id,
            )
            .first()
        )
        if not row:
            raise ValueError("Interview not found.")
        if act == "accept":
            return {"ok": True, "action": act, "kind": k, "interview_id": item_id, "status": row.status}
        row.status = "cancelled"
        row.updated_at = datetime.utcnow()
        db.add(row)
        db.commit()
        return {"ok": True, "action": act, "kind": k, "interview_id": item_id, "status": row.status}
    raise ValueError("kind must be match or interview")
