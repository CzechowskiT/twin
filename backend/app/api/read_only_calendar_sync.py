"""Read-Only Calendar Sync API — consent lifecycle, busy sync, recalculation, private feed."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import read_only_calendar_sync as rocs

router = APIRouter()
public_router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


def _err(exc: Exception) -> HTTPException:
    msg = str(exc) or type(exc).__name__
    code = status.HTTP_404_NOT_FOUND if "not_found" in msg else status.HTTP_400_BAD_REQUEST
    return HTTPException(code, detail=msg)


class ConsentIn(BaseModel):
    ms_busy_read_opt_in: bool | None = None
    store_availability_blocks: bool | None = None
    ics_export_opt_in: bool | None = None
    internal_calendar_enabled: bool | None = None


class SyncIn(BaseModel):
    synthetic_busy: list[dict] | None = None
    idempotency_key: str | None = Field(default=None, max_length=160)


class ResolveRecalcIn(BaseModel):
    action: str = Field(default="reject", max_length=32)


@router.get("/me/calendar-sync")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return rocs.build_aggregate(db, candidate_id=cand.id, user_id=user.id)


@router.patch("/me/calendar-sync/consent")
def patch_consent(
    body: ConsentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return rocs.update_consent_lifecycle(
            db,
            candidate_id=cand.id,
            user_id=user.id,
            ms_busy_read_opt_in=body.ms_busy_read_opt_in,
            store_availability_blocks=body.store_availability_blocks,
            ics_export_opt_in=body.ics_export_opt_in,
            internal_calendar_enabled=body.internal_calendar_enabled,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/calendar-sync/runs", status_code=status.HTTP_201_CREATED)
def post_sync(
    body: SyncIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return rocs.run_sync(
            db,
            candidate_id=cand.id,
            user_id=user.id,
            synthetic_busy=body.synthetic_busy,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/calendar-sync/recalculations/{proposal_id}/resolve")
def post_recalc_resolve(
    proposal_id: int,
    body: ResolveRecalcIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return rocs.resolve_recalculation(
            db, candidate_id=cand.id, proposal_id=proposal_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/calendar-sync/feeds", status_code=status.HTTP_201_CREATED)
def post_feed(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return rocs.mint_private_feed(db, candidate_id=cand.id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/calendar-sync/feeds/{feed_id}/rotate")
def post_feed_rotate(
    feed_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return rocs.rotate_private_feed(db, candidate_id=cand.id, feed_id=feed_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/calendar-sync/feeds/{feed_id}/revoke")
def post_feed_revoke(
    feed_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return rocs.revoke_private_feed(db, candidate_id=cand.id, feed_id=feed_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/calendar-sync/disconnect")
def post_disconnect(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return rocs.disconnect_connection(db, candidate_id=cand.id, user_id=user.id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/calendar-sync/delete-history")
def post_delete(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return rocs.delete_sync_history(db, candidate_id=cand.id)


@router.get("/me/calendar-sync/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return rocs.export_sync(db, candidate_id=cand.id)


@public_router.get("/public/calendar-feed/{token}.ics")
def get_public_feed(token: str, db: Session = Depends(get_db)) -> Response:
    """Opaque private feed — no auth header; token is the secret. Never logs token."""
    try:
        ics = rocs.render_private_feed_ics(db, token=token)
    except ValueError as exc:
        raise _err(exc) from exc
    return Response(
        content=ics,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Cache-Control": "no-store",
            "X-TWIN-EXTERNAL-BOOKING": "FALSE",
            "X-TWIN-ICS-IS-CONFIRMATION": "FALSE",
        },
    )
