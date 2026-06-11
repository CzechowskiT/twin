"""Company pipeline quality aggregates — per-role segments, no candidate PII."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Candidate, Job, ScheduledInterview
from app.services.recruiter_inbox import _require_company_slug
from app.services.recruiter_match_explanations import build_recruiter_match_summary
from app.utils.slug import slugify_company

SEGMENT_KEYS = ("in_review", "accepted", "invited", "rejected", "on_hold")


def _empty_segments() -> dict[str, int]:
    return {k: 0 for k in SEGMENT_KEYS}


def _has_scheduled_interview(db: Session, application_id: int) -> bool:
    row = (
        db.query(ScheduledInterview.id)
        .filter(ScheduledInterview.application_id == application_id)
        .first()
    )
    return row is not None


def _segment_for_application(db: Session, app: Application) -> str:
    status = app.status
    if status == ApplicationStatus.REJECTED:
        return "rejected"
    if status == ApplicationStatus.PENDING:
        return "on_hold"
    if status == ApplicationStatus.APPLIED:
        return "in_review"
    if status == ApplicationStatus.INTERVIEW:
        return "invited" if _has_scheduled_interview(db, app.id) else "accepted"
    return "in_review"


def _row_quality_flags(
    db: Session,
    app: Application,
    job: Job,
    cand: Candidate,
    *,
    locale: str,
) -> tuple[bool, bool]:
    summary = build_recruiter_match_summary(db, cand, job, locale=locale)
    confidence = (summary.get("data_confidence") or "").strip().lower()
    gaps = summary.get("uncertain_or_missing") or []
    red_flags = summary.get("red_flags") or []
    missing = confidence in ("low", "unknown") or bool(gaps)
    risk = missing or bool(red_flags) or confidence == "low"
    return missing, risk


def build_company_pipeline_quality(
    db: Session,
    *,
    company_slug: str,
    locale: str = "en",
) -> dict:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(Application, Job, Candidate)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(
            Application.status.in_(
                (
                    ApplicationStatus.PENDING,
                    ApplicationStatus.APPLIED,
                    ApplicationStatus.INTERVIEW,
                    ApplicationStatus.REJECTED,
                )
            ),
        )
        .order_by(Application.updated_at.desc())
        .limit(400)
        .all()
    )

    company_totals = _empty_segments()
    role_buckets: dict[str, dict] = {}
    scores: list[float] = []
    missing_data_count = 0
    verification_risk_count = 0

    for app, job, cand in rows:
        if slugify_company(job.company or "") != slug:
            continue
        segment = _segment_for_application(db, app)
        company_totals[segment] += 1
        title = (job.title or "Role").strip()[:200]
        if title not in role_buckets:
            role_buckets[title] = {
                "role_title": title,
                "job_id": job.id,
                "segments": _empty_segments(),
                "scores": [],
                "missing_data_count": 0,
                "verification_risk_count": 0,
            }
        bucket = role_buckets[title]
        bucket["segments"][segment] += 1
        summary = build_recruiter_match_summary(db, cand, job, locale=locale)
        score = summary.get("match_score")
        if isinstance(score, (int, float)):
            scores.append(float(score))
            bucket["scores"].append(float(score))
        missing, risk = _row_quality_flags(db, app, job, cand, locale=locale)
        if missing:
            missing_data_count += 1
            bucket["missing_data_count"] += 1
        if risk:
            verification_risk_count += 1
            bucket["verification_risk_count"] += 1

    roles = []
    for bucket in role_buckets.values():
        segs = bucket["segments"]
        total = sum(segs.values())
        role_scores = bucket["scores"]
        roles.append(
            {
                "role_title": bucket["role_title"],
                "job_id": bucket["job_id"],
                "segments": segs,
                "total": total,
                "average_match_score": round(sum(role_scores) / len(role_scores), 1) if role_scores else None,
                "missing_data_count": bucket["missing_data_count"],
                "verification_risk_count": bucket["verification_risk_count"],
            }
        )
    roles.sort(key=lambda r: (-r["total"], r["role_title"]))

    return {
        "company_slug": slug,
        "source": "workspace",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_applications": sum(company_totals.values()),
        "company_totals": company_totals,
        "average_match_score": round(sum(scores) / len(scores), 1) if scores else None,
        "missing_data_count": missing_data_count,
        "verification_risk_count": verification_risk_count,
        "roles": roles[:12],
        "recruiter_activity": None,
    }
