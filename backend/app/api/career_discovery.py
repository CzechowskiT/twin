"""Career discovery API — red flags and match score."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.database.models import User
from app.schemas.career_discovery import (
    RedFlagHitOut,
    RedFlagsIn,
    RedFlagsOut,
    ScoreJobIn,
    ScoreJobOut,
)
from app.services.career_discovery import detect_red_flags, red_flag_summary, score_job_match

router = APIRouter()


@router.post("/red-flags", response_model=RedFlagsOut)
def post_red_flags(
    body: RedFlagsIn,
    user: User = Depends(get_current_user),
) -> RedFlagsOut:
    del user  # auth gate only
    hits = detect_red_flags(
        title=body.title,
        description=body.description,
        requirements=body.requirements,
        salary_min=body.salary_min,
        salary_max=body.salary_max,
        skills=body.skills,
        existing=body.existing_red_flags,
    )
    out_hits = [
        RedFlagHitOut(code=h.code, message=h.message, pattern=h.pattern) for h in hits
    ]
    codes = list(dict.fromkeys(h.code for h in hits))
    return RedFlagsOut(
        hits=out_hits,
        codes=codes,
        summary=red_flag_summary(hits),
    )


@router.post("/score", response_model=ScoreJobOut)
def post_score_job(
    body: ScoreJobIn,
    user: User = Depends(get_current_user),
) -> ScoreJobOut:
    del user
    cand = body.candidate.model_dump()
    job = body.job.model_dump()
    result = score_job_match(cand, job)
    return ScoreJobOut(score=result["score"], band=result["band"])
