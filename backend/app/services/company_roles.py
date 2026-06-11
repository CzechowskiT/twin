"""Company-scoped role management — internal queues, not external posting."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Application, Job, JobMatch
from app.services.recruiter_inbox import _require_company_slug

ROLE_STATUSES = ("draft", "active", "paused", "closed")
WORK_MODES = ("onsite", "hybrid", "remote", "flexible")


def _query(db: Session, company_slug: str):
    slug = _require_company_slug(company_slug)
    return db.query(Job).filter(Job.job_board == "employer", Job.external_id.like(f"{slug}-%"))


def _count(db: Session, job_id: int) -> int:
    a = db.query(func.count(Application.id)).filter(Application.job_id == job_id).scalar() or 0
    m = db.query(func.count(JobMatch.id)).filter(JobMatch.job_id == job_id).scalar() or 0
    return int(a) + int(m)


def _skills(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [x.strip()[:120] for x in raw.replace(",", "\n").splitlines() if x.strip()]


def _row(db: Session, job: Job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "work_mode": job.work_mode,
        "status": job.role_status or "draft",
        "requirements": job.requirements,
        "description": job.description,
        "must_have_skills": _skills(job.requirements_must_have),
        "nice_to_have_skills": _skills(job.requirements_nice_to_have),
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "linked_candidates_count": _count(db, job.id),
        "created_at": job.scraped_at.isoformat() if job.scraped_at else None,
        "updated_at": job.scraped_at.isoformat() if job.scraped_at else None,
    }


def list_company_roles(db: Session, *, company_slug: str, limit: int = 50) -> list[dict]:
    rows = _query(db, company_slug).order_by(Job.scraped_at.desc()).limit(limit).all()
    return [_row(db, j) for j in rows]


def get_company_role(db: Session, *, company_slug: str, role_id: int) -> dict | None:
    job = _query(db, company_slug).filter(Job.id == role_id).first()
    return _row(db, job) if job else None


def create_company_role(db: Session, *, company_slug: str, title: str, **kw) -> dict:
    slug = _require_company_slug(company_slug)
    st = _status(kw.get("status", "draft"))
    job = Job(
        job_board="employer",
        external_id=f"{slug}-{secrets.token_hex(6)}",
        title=title.strip()[:300],
        company=slug.replace("-", " ").title()[:200],
        location=(kw.get("location") or "").strip()[:200] or None,
        work_mode=_mode(kw.get("work_mode")),
        role_status=st,
        requirements=(kw.get("requirements") or "").strip()[:20000] or None,
        description=(kw.get("description") or "").strip()[:20000] or None,
        requirements_must_have=_txt(kw.get("must_have_skills")),
        requirements_nice_to_have=_txt(kw.get("nice_to_have_skills")),
        url="https://twin.app/company/roles/internal",
        salary_min=kw.get("salary_min"),
        salary_max=kw.get("salary_max"),
        is_validated=st == "active",
        scraped_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _row(db, job)


def update_company_role(db: Session, *, company_slug: str, role_id: int, **kw) -> dict | None:
    job = _query(db, company_slug).filter(Job.id == role_id).first()
    if not job:
        return None
    if kw.get("title") is not None:
        job.title = kw["title"].strip()[:300]
    if kw.get("location") is not None:
        job.location = kw["location"].strip()[:200] or None
    if kw.get("work_mode") is not None:
        job.work_mode = _mode(kw["work_mode"])
    if kw.get("status") is not None:
        job.role_status = _status(kw["status"])
        job.is_validated = job.role_status == "active"
    if kw.get("requirements") is not None:
        job.requirements = kw["requirements"].strip()[:20000] or None
    if kw.get("description") is not None:
        job.description = kw["description"].strip()[:20000] or None
    if kw.get("must_have_skills") is not None:
        job.requirements_must_have = _txt(kw["must_have_skills"])
    if kw.get("nice_to_have_skills") is not None:
        job.requirements_nice_to_have = _txt(kw["nice_to_have_skills"])
    if kw.get("salary_min") is not None:
        job.salary_min = kw["salary_min"]
    if kw.get("salary_max") is not None:
        job.salary_max = kw["salary_max"]
    job.scraped_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return _row(db, job)


def _status(v: str) -> str:
    s = (v or "draft").strip().lower()
    if s not in ROLE_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(ROLE_STATUSES)}")
    return s


def _mode(v: str | None) -> str | None:
    if not v or not str(v).strip():
        return None
    s = str(v).strip().lower()
    if s not in WORK_MODES:
        raise ValueError(f"work_mode must be one of: {', '.join(WORK_MODES)}")
    return s


def _txt(skills: list[str] | None) -> str | None:
    if not skills:
        return None
    lines = [s.strip()[:120] for s in skills if s and s.strip()]
    return "\n".join(lines) if lines else None
