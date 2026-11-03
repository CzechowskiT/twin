"""Epic 2.20 — Candidate Access & Sharing Control Center API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
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
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    sid = getattr(request.state, "session_key", None)
    return cai.build_inventory(
        db, user=user, candidate_id=cand.id, current_session_key=sid
    )


@router.post("/me/access-inventory/revoke")
def post_access_revoke(
    body: RevokeIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    kind = body.kind.strip().upper()
    if kind in {"PENDING_RECOVERY", "MFA_TOTP"}:
        from app.services import candidate_step_up as step_up
        from app.services.candidate_account_recovery_constants import (
            PURPOSE_CANCEL_RECOVERY,
            PURPOSE_MFA_DISABLE,
        )
        from app.services.step_up_request import (
            session_binding_from_request,
            step_up_token_from_request,
        )

        purpose = PURPOSE_CANCEL_RECOVERY if kind == "PENDING_RECOVERY" else PURPOSE_MFA_DISABLE
        sid, epoch = session_binding_from_request(request)
        try:
            step_up.require_step_up_or_raise(
                db,
                user=user,
                purpose=purpose,
                step_up_token=step_up_token_from_request(request),
                session_key=sid,
                session_epoch=epoch,
            )
        except ValueError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    try:
        return cai.revoke_access(
            db,
            user=user,
            candidate_id=cand.id,
            access_key=body.access_key.strip(),
            kind=kind,
            client_revision=body.client_revision.strip(),
            confirm=body.confirm,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="access_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from None
