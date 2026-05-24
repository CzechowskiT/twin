"""Profile import: LinkedIn + CV text synthesis."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Candidate, User
from app.database.session import get_db
from app.schemas.profile_import import ImportCvTextIn, ImportLinkedInIn, ProfileImportOut
from app.services.career_assistant_common import get_candidate_for_user
from app.services.gamification import record_activity
from app.services.linkedin_profile_import import (
    apply_synthesis_to_candidate,
    build_profile_from_candidate,
    fetch_linkedin_profile,
    synthesize_profile_deterministic,
    synthesize_profile_with_ai,
)

router = APIRouter()


def _next_steps(synthesized: dict) -> list[str]:
    steps = list(synthesized.get("quick_wins") or [])[:3]
    if not steps:
        steps = ["Review suggested roles", "Upload CV if missing", "Connect calendar"]
    return steps


async def _run_import(raw: dict, candidate: Candidate, user: User, db: Session) -> ProfileImportOut:
    synthesized = synthesize_profile_with_ai(raw) or synthesize_profile_deterministic(raw)
    apply_synthesis_to_candidate(candidate, synthesized)
    db.commit()
    db.refresh(candidate)
    record_activity(db, candidate, event="profile_update")
    completeness = int(synthesized.get("profile_completeness") or 0)
    return ProfileImportOut(
        synthesized=synthesized,
        profile_completeness=completeness,
        next_steps=_next_steps(synthesized),
        source=str(synthesized.get("source") or "unknown"),
        applied_to_profile=True,
    )


@router.post("/import-linkedin", response_model=ProfileImportOut)
async def import_linkedin_profile(
    body: ImportLinkedInIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileImportOut:
    """Import LinkedIn profile — token optional; falls back to stored candidate data."""
    candidate = get_candidate_for_user(db, current_user.id)
    raw: dict
    if body.linkedin_access_token:
        try:
            raw = await fetch_linkedin_profile(body.linkedin_access_token)
            if candidate.cv_text:
                raw["cv_text"] = candidate.cv_text
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    else:
        raw = build_profile_from_candidate(candidate, current_user)
        if not raw.get("cv_text") and not current_user.linkedin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connect LinkedIn or upload a CV first.",
            )
    return await _run_import(raw, candidate, current_user, db)


@router.post("/import-cv-text", response_model=ProfileImportOut)
async def import_cv_text_profile(
    body: ImportCvTextIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileImportOut:
    """Synthesize profile from pasted CV text."""
    candidate = get_candidate_for_user(db, current_user.id)
    candidate.cv_text = body.cv_text.strip()
    raw = build_profile_from_candidate(candidate, current_user)
    raw["cv_text"] = body.cv_text
    return await _run_import(raw, candidate, current_user, db)
