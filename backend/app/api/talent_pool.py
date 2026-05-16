"""Anonymous talent pool preview for B2B (no PII in responses)."""

import hashlib
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database.models import Candidate, Job, User
from app.database.session import get_db
from app.matching.matcher import calculate_match_score
from app.schemas.talent_pool import AnonymousTalentPoolItemOut, AnonymousTalentPoolListOut
from app.services.matching_service import job_to_dict

router = APIRouter()


def candidate_public_id(secret_key: str, candidate_id: int) -> str:
    """Stable opaque id for pool listings (first 20 hex chars of keyed SHA-256)."""
    digest = hashlib.sha256(f"{secret_key}:{candidate_id}".encode()).hexdigest()
    return digest[:20]


def _parse_skills_json(raw: str | None) -> list[str]:
    try:
        data = json.loads(raw) if raw else []
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [str(x).strip() for x in data if str(x).strip()]


def is_talent_pool_validated(user: User, candidate: Candidate) -> bool:
    """Pool 'validated' badge: GDPR consent, pool opt-in, and substantive profile.

    Substantive means at least three declared skills or non-empty stored CV text
    (signals the profile is populated enough for serious matching).
    """
    if user.gdpr_consent_at is None or not candidate.talent_pool_opt_in:
        return False
    if len(_parse_skills_json(candidate.skills)) >= 3:
        return True
    return bool((candidate.cv_text or "").strip())


def minimal_candidate_dict_for_pool_match(candidate: Candidate) -> dict[str, Any]:
    """Scoring payload without cv_text or location (public pool anonymity)."""
    titles_raw = json.loads(candidate.preferred_job_titles) if candidate.preferred_job_titles else []
    titles = [str(t) for t in titles_raw] if isinstance(titles_raw, list) else []
    return {
        "skills": _parse_skills_json(candidate.skills),
        "preferred_job_titles": titles,
        "experience_years": candidate.experience_years,
        "desired_salary": candidate.desired_salary,
    }


def _synthetic_job_dict(job_title: str | None, required_skills_csv: str | None) -> dict[str, Any]:
    parts = [p.strip() for p in (required_skills_csv or "").split(",") if p.strip()]
    requirements = ", ".join(parts) if parts else ""
    return {
        "title": (job_title or "").strip(),
        "requirements": requirements,
        "description": None,
        "salary_min": None,
        "salary_max": None,
        "location": None,
    }


@router.get("/anonymous", response_model=AnonymousTalentPoolListOut)
def list_anonymous_talent_pool(
    limit: int = Query(24, ge=1, le=50),
    offset: int = Query(0, ge=0),
    job_id: int | None = Query(None, ge=1, description="Use this job as the match target (overrides job_title/required_skills)."),
    job_title: str | None = Query(None, max_length=300),
    required_skills: str | None = Query(
        None,
        max_length=2000,
        description='Comma-separated skills or keywords (e.g. "Python,PostgreSQL") used as synthetic job requirements.',
    ),
    db: Session = Depends(get_db),
) -> AnonymousTalentPoolListOut:
    if job_id is not None:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        target_job = job_to_dict(job)
    else:
        target_job = _synthetic_job_dict(job_title, required_skills)

    settings = get_settings()
    rows = (
        db.query(Candidate)
        .join(User, User.id == Candidate.user_id)
        .filter(Candidate.talent_pool_opt_in.is_(True), User.gdpr_consent_at.isnot(None))
        .options(joinedload(Candidate.user))
        .all()
    )

    scored: list[tuple[float, str, AnonymousTalentPoolItemOut]] = []
    for cand in rows:
        cand_dict = minimal_candidate_dict_for_pool_match(cand)
        raw_score = float(calculate_match_score(cand_dict, target_job))
        pct = int(round(max(0.0, min(100.0, raw_score))))
        public_id = candidate_public_id(settings.secret_key, cand.id)
        skills = _parse_skills_json(cand.skills)[:12]
        user = cand.user
        if user is None:
            continue
        item = AnonymousTalentPoolItemOut(
            public_id=public_id,
            skills=skills,
            validated=is_talent_pool_validated(user, cand),
            match_percent=pct,
        )
        scored.append((-float(pct), public_id, item))

    scored.sort(key=lambda x: (x[0], x[1]))
    total = len(scored)
    page = scored[offset : offset + limit]
    return AnonymousTalentPoolListOut(items=[x[2] for x in page], total=total)
