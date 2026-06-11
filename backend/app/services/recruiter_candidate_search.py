"""Recruiter candidate pool search — scoped to company applications (no external sourcing)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Candidate, Job
from app.services.recruiter_inbox import _require_company_slug
from app.services.recruiter_match_explanations import (
    INBOX_FORBIDDEN_PII_KEYS,
    build_recruiter_match_summary,
)
from app.utils.slug import slugify_company

SEARCHABLE_STATUSES = (
    ApplicationStatus.PENDING,
    ApplicationStatus.APPLIED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.REJECTED,
)

PIPELINE_STATUSES = frozenset(
    {"new", "review", "accepted", "to_contact", "invited", "on_hold", "rejected"}
)


def _parse_skills(raw: str | None) -> list[str]:
    try:
        data = json.loads(raw) if raw else []
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [str(x).strip().lower() for x in data if str(x).strip()]


def _effective_pipeline_status(app: Application) -> str:
    stored = (getattr(app, "recruiter_pipeline_status", None) or "").strip().lower()
    if stored in PIPELINE_STATUSES:
        return stored
    status = app.status
    if status == ApplicationStatus.REJECTED:
        return "rejected"
    if status == ApplicationStatus.INTERVIEW:
        return "accepted"
    if status == ApplicationStatus.PENDING and not app.applied_at:
        return "new"
    if status in (ApplicationStatus.APPLIED, ApplicationStatus.PENDING):
        return "review"
    return "review"


def _search_application_row(
    db: Session,
    app: Application,
    job: Job,
    cand: Candidate,
    *,
    locale: str,
) -> dict[str, Any]:
    item = {
        "application_id": app.id,
        "job_title": job.title,
        "company": job.company,
        "candidate_name": (cand.name or "").strip() or "Candidate",
        "status": app.status.value,
        "pipeline_status": _effective_pipeline_status(app),
        "applied_at": app.applied_at.isoformat() if app.applied_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
    }
    item.update(build_recruiter_match_summary(db, cand, job, locale=locale))
    return item


def _candidate_blob(cand: Candidate, job: Job) -> str:
    skills = " ".join(_parse_skills(cand.skills))
    titles = " ".join(_parse_skills(cand.preferred_job_titles))
    return " ".join(
        filter(
            None,
            [
                (cand.name or "").lower(),
                skills,
                titles,
                (cand.location or "").lower(),
                (job.title or "").lower(),
                (job.location or "").lower(),
                f"{job.requirements or ''} {job.description or ''}".lower(),
            ],
        )
    )


def _matches_filters(
    row: dict[str, Any],
    cand: Candidate,
    job: Job,
    *,
    q: str | None,
    name: str | None,
    role_title: str | None,
    skills: str | None,
    location: str | None,
    min_score: float | None,
    max_score: float | None,
    status: str | None,
    pipeline_status: str | None,
    data_confidence: str | None,
    missing_data: bool | None,
    availability: str | None,
) -> bool:
    score = float(row.get("match_score") or 0)
    if min_score is not None and score < min_score:
        return False
    if max_score is not None and score > max_score:
        return False

    app_status = (row.get("status") or "").lower()
    if status and status.strip().lower() not in ("", "all") and app_status != status.strip().lower():
        return False

    pipe = (row.get("pipeline_status") or "").lower()
    if pipeline_status and pipeline_status.strip().lower() not in ("", "all"):
        if pipe != pipeline_status.strip().lower():
            return False

    card = row.get("review_card") or {}
    confidence = (card.get("data_confidence") or "unknown").lower()
    if data_confidence and data_confidence.strip().lower() not in ("", "all"):
        if confidence != data_confidence.strip().lower():
            return False

    uncertain = card.get("uncertain_or_missing") or []
    has_gaps = bool(uncertain)
    if missing_data is True and not has_gaps:
        return False
    if missing_data is False and has_gaps:
        return False

    avail = (availability or "").strip().lower()
    if avail == "pool_opt_in" and not cand.talent_pool_opt_in:
        return False
    if avail == "not_pool" and cand.talent_pool_opt_in:
        return False

    blob = _candidate_blob(cand, job)
    if q and q.strip().lower() not in blob:
        return False
    if name and name.strip().lower() not in (cand.name or "").lower():
        return False
    if role_title and role_title.strip().lower() not in (job.title or "").lower():
        return False
    if skills:
        terms = [t.strip().lower() for t in skills.split(",") if t.strip()]
        skill_list = _parse_skills(cand.skills)
        req_blob = f"{job.requirements or ''} {job.description or ''}".lower()
        for term in terms:
            if term not in blob and not any(term in s for s in skill_list) and term not in req_blob:
                return False
    if location:
        loc = location.strip().lower()
        cand_loc = (cand.location or "").lower()
        job_loc = (job.location or "").lower()
        if loc not in cand_loc and loc not in job_loc:
            return False
    return True


def build_recruiter_candidate_search(
    db: Session,
    *,
    company_slug: str,
    locale: str = "en",
    limit: int = 50,
    q: str | None = None,
    name: str | None = None,
    role_title: str | None = None,
    skills: str | None = None,
    location: str | None = None,
    min_score: float | None = None,
    max_score: float | None = None,
    status: str | None = None,
    pipeline_status: str | None = None,
    data_confidence: str | None = None,
    missing_data: bool | None = None,
    availability: str | None = None,
) -> dict:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(Application, Job, Candidate)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(Application.status.in_(SEARCHABLE_STATUSES))
        .order_by(Application.updated_at.desc())
        .limit(400)
        .all()
    )
    items: list[dict] = []
    scanned = 0
    for app, job, cand in rows:
        if slugify_company(job.company) != slug:
            continue
        scanned += 1
        row = _search_application_row(db, app, job, cand, locale=locale)
        row["talent_pool_opt_in"] = bool(cand.talent_pool_opt_in)
        row["candidate_location"] = (cand.location or "").strip() or None
        if not _matches_filters(
            row,
            cand,
            job,
            q=q,
            name=name,
            role_title=role_title,
            skills=skills,
            location=location,
            min_score=min_score,
            max_score=max_score,
            status=status,
            pipeline_status=pipeline_status,
            data_confidence=data_confidence,
            missing_data=missing_data,
            availability=availability,
        ):
            continue
        for forbidden in INBOX_FORBIDDEN_PII_KEYS:
            row.pop(forbidden, None)
        items.append(row)
        if len(items) >= limit:
            break
    return {
        "company_slug": slug,
        "items": items,
        "total": len(items),
        "scanned": scanned,
        "scope": "workspace_pool",
        "external_sourcing_connected": False,
    }
