"""Company-scoped pipeline quality aggregates by role — no PII, no fake hire metrics."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Candidate, Job, ScheduledInterview
from app.services.recruiter_match_explanations import build_recruiter_match_summary
from app.utils.slug import slugify_company

SEGMENT_KEYS = ("in_review", "accepted", "invited", "rejected", "on_hold")


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def _empty_segments() -> dict[str, int]:
    return {key: 0 for key in SEGMENT_KEYS}


def _segment_from_application(app: Application, *, has_scheduled_interview: bool) -> str:
    if app.status == ApplicationStatus.REJECTED:
        return "rejected"
    if app.status == ApplicationStatus.PENDING:
        return "on_hold"
    if app.status == ApplicationStatus.APPLIED:
        return "in_review"
    if app.status == ApplicationStatus.INTERVIEW:
        return "invited" if has_scheduled_interview else "accepted"
    return "in_review"


def _missing_data_count(review_card: dict) -> int:
    gaps = review_card.get("uncertain_or_missing") or []
    return 1 if isinstance(gaps, list) and len(gaps) > 0 else 0


def _verification_risk_count(review_card: dict) -> int:
    red_flags = review_card.get("red_flags") or []
    confidence = str(review_card.get("data_confidence") or "").lower()
    if isinstance(red_flags, list) and len(red_flags) > 0:
        return 1
    if confidence in {"low", "unknown"}:
        return 1
    return 0


def _scheduled_app_ids(db: Session, application_ids: list[int]) -> set[int]:
    if not application_ids:
        return set()
    rows = (
        db.query(ScheduledInterview.application_id)
        .filter(
            ScheduledInterview.application_id.in_(application_ids),
            ScheduledInterview.status.in_(("scheduled", "confirmed")),
        )
        .all()
    )
    return {row[0] for row in rows if row[0] is not None}


def build_company_pipeline_quality(
    db: Session,
    *,
    company_slug: str,
    locale: str = "en",
) -> dict:
    """Per-role pipeline segments and quality signals for one employer workspace."""
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
        .limit(500)
        .all()
    )

    company_rows: list[tuple[Application, Job, Candidate]] = []
    for app, job, cand in rows:
        if slugify_company(job.company) == slug:
            company_rows.append((app, job, cand))

    scheduled_ids = _scheduled_app_ids(db, [app.id for app, _, _ in company_rows])

    by_role: dict[str, dict] = {}
    company_totals = _empty_segments()
    score_sum = 0.0
    score_count = 0
    missing_total = 0
    risk_total = 0
    total_apps = len(company_rows)

    for app, job, cand in company_rows:
        segment = _segment_from_application(app, has_scheduled_interview=app.id in scheduled_ids)
        company_totals[segment] += 1

        summary = build_recruiter_match_summary(db, cand, job, locale=locale)
        score = summary.get("match_score")
        if isinstance(score, (int, float)):
            score_sum += float(score)
            score_count += 1
        review_card = summary.get("review_card") or {}
        missing_total += _missing_data_count(review_card)
        risk_total += _verification_risk_count(review_card)

        role_key = (job.title or "Role").strip()[:300] or "Role"
        bucket = by_role.setdefault(
            role_key,
            {
                "role_title": role_key,
                "job_id": job.id,
                "segments": _empty_segments(),
                "match_scores": [],
                "missing_data_count": 0,
                "verification_risk_count": 0,
            },
        )
        bucket["segments"][segment] += 1
        if isinstance(score, (int, float)):
            bucket["match_scores"].append(float(score))
        bucket["missing_data_count"] += _missing_data_count(review_card)
        bucket["verification_risk_count"] += _verification_risk_count(review_card)

    roles: list[dict] = []
    for role in sorted(by_role.values(), key=lambda r: (-sum(r["segments"].values()), r["role_title"])):
        scores = role.pop("match_scores")
        role_total = sum(role["segments"].values())
        avg = round(sum(scores) / len(scores), 1) if scores else None
        roles.append(
            {
                "role_title": role["role_title"],
                "job_id": role["job_id"],
                "segments": role["segments"],
                "total": role_total,
                "average_match_score": avg,
                "missing_data_count": role["missing_data_count"],
                "verification_risk_count": role["verification_risk_count"],
            }
        )

    return {
        "company_slug": slug,
        "source": "workspace",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_applications": total_apps,
        "company_totals": company_totals,
        "average_match_score": round(score_sum / score_count, 1) if score_count else None,
        "missing_data_count": missing_total,
        "verification_risk_count": risk_total,
        "roles": roles,
        "recruiter_activity": None,
    }
