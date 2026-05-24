"""Serialize Job rows with competitive board enrichment."""

from __future__ import annotations

from typing import Any

from app.database.models import Job
from app.matching.matcher import calculate_match_score
from app.schemas.job import JobOut
from app.schemas.job_competitive import InterviewStageOut, JobDetailOut
from app.services.job_enrichment import job_competitive_view
from app.services.matching_service import candidate_to_dict, job_to_dict


def competitive_fields(job: Job) -> dict[str, Any]:
    return job_competitive_view(job)


def job_out(job: Job, *, score: float | None = None) -> JobOut:
    comp = competitive_fields(job)
    payload = {
        "id": job.id,
        "job_board": job.job_board,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "url": job.url,
        "is_validated": job.is_validated,
        "scraped_at": job.scraped_at,
        "score": score,
        "tech_stack": comp["tech_stack"],
        "remote_percentage": comp["remote_percentage"],
        "seniority_level": comp["seniority_level"],
        "culture_tags": comp["culture_tags"],
    }
    return JobOut.model_validate(payload)


def job_detail_out(job: Job, *, score: float | None = None) -> JobDetailOut:
    comp = competitive_fields(job)
    stages = [InterviewStageOut.model_validate(s) for s in comp["interview_process"]]
    return JobDetailOut(
        id=job.id,
        job_board=job.job_board,
        title=job.title,
        company=job.company,
        location=job.location,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        url=job.url,
        description=job.description,
        requirements=job.requirements,
        tech_stack=comp["tech_stack"],
        requirements_must_have=comp["requirements_must_have"],
        requirements_nice_to_have=comp["requirements_nice_to_have"],
        interview_process=stages,
        remote_percentage=comp["remote_percentage"],
        seniority_level=comp["seniority_level"],
        culture_tags=comp["culture_tags"],
        score=score,
    )


def score_for_candidate(job: Job, candidate: Any | None) -> float | None:
    if candidate is None:
        return None
    cand = candidate_to_dict(candidate)
    return float(calculate_match_score(cand, job_to_dict(job)))
