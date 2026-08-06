"""Epic 2.11 API — guided first value, isolated demo, discoverability."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import capability_discoverability as discover
from app.services import guided_first_value as gfv
from app.services import isolated_demo as demo

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


class EntryIn(BaseModel):
    choice: str = Field(max_length=48)


class StarterPathIn(BaseModel):
    path: str = Field(max_length=64)


@router.get("/me/guided-first-value")
def get_guided_first_value(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return gfv.get_status(db, candidate_id=cand.id, user_id=user.id)


@router.get("/me/guided-first-value/catalog")
def guided_catalog(
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return gfv.entry_catalog()


@router.post("/me/guided-first-value/entry")
def choose_entry(
    body: EntryIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    out = gfv.choose_entry(db, candidate_id=cand.id, user_id=user.id, choice=body.choice)
    if not out.get("ok"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=out.get("reason", "invalid"))
    return out


@router.post("/me/guided-first-value/starter-path")
def starter_path(
    body: StarterPathIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    out = gfv.select_starter_path(db, candidate_id=cand.id, user_id=user.id, path=body.path)
    if not out.get("ok"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=out.get("reason", "invalid"))
    return out


@router.post("/me/guided-first-value/pause")
def pause_gfv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return gfv.pause(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/guided-first-value/resume")
def resume_gfv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return gfv.resume(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/guided-first-value/skip")
def skip_gfv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return gfv.skip(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/guided-first-value/complete")
def complete_gfv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return gfv.complete_starter(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/guided-first-value/demo-first-value-seen")
def demo_fv_seen(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return gfv.mark_demo_first_value_seen(db, candidate_id=cand.id, user_id=user.id)


@router.get("/me/isolated-demo")
def get_demo(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return demo.get_session(db, candidate_id=cand.id)


@router.post("/me/isolated-demo/start")
def start_demo(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return demo.start_session(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/isolated-demo/exit")
def exit_demo(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return demo.exit_to_my_data(db, candidate_id=cand.id, user_id=user.id)


@router.get("/me/isolated-demo/contamination")
def demo_contamination(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return demo.contamination_report(db, candidate_id=cand.id)


@router.get("/me/capability-discoverability")
def get_discoverability(
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return {
        "discoverability": discover.discoverability_registry(),
        "empty_states": discover.empty_state_contract(),
        "public_preview": discover.public_preview_status(),
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }
