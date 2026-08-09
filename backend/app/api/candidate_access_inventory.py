"""Epic 2.20 — Candidate Access & Sharing Control Center API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_access_inventory as cai

router = APIRouter()


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


class RevokeIn(BaseModel):
    access_key: str = Field(min_length=3, max_length=200)
    kind: str = Field(min_length=3, max_length=64)
    client_revision: str = Field(min_length=1, max_length=200)
    confirm: bool = False


@router.get("/me/access-inventory/catalog")
def access_catalog(response: Response, user: User = Depends(get_current_user)) -> dict:
    _ = user
    _no_store(response)
    return cai.catalog()


@router.get("/me/access-inventory")
def get_access_inventory(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    return cai.build_inventory(db, user=user, candidate_id=cand.id)


@router.post("/me/access-inventory/revoke")
def post_access_revoke(
    body: RevokeIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cai.revoke_access(
            db,
            user=user,
            candidate_id=cand.id,
            access_key=body.access_key.strip(),
            kind=body.kind.strip().upper(),
            client_revision=body.client_revision.strip(),
            confirm=body.confirm,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="access_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from None
