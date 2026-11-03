"""Epic 2.12 API — candidate-owned Import Center (auth required)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_owned_import as coi

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


class CreateBatchIn(BaseModel):
    family: str = Field(max_length=32)


class ApproveIn(BaseModel):
    item_keys: list[str] = Field(default_factory=list, max_length=200)
    preview_version: int
    idempotency_key: str = Field(min_length=8, max_length=64)


class CommitIn(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=64)


@router.get("/me/import/catalog")
def import_catalog(user: User = Depends(get_current_user)) -> dict:
    _ = user
    return coi.catalog()


@router.get("/me/import/batches")
def list_batches(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return coi.list_batches(db, candidate_id=cand.id)


@router.post("/me/import/batches")
def create_batch(
    body: CreateBatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    family = (body.family or "").strip().lower()
    if family not in {"document", "tracker", "twin_export", "linkedin_export"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="unsupported_family")
    return coi.create_batch(db, candidate_id=cand.id, user_id=user.id, family=family)


@router.get("/me/import/batches/{batch_key}")
def get_batch(
    batch_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return coi.get_batch(db, candidate_id=cand.id, batch_key=batch_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="batch_not_found") from None


@router.post("/me/import/batches/{batch_key}/upload")
async def upload_batch(
    batch_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    file: UploadFile = File(...),
) -> dict:
    cand = _candidate(db, user)
    raw = await file.read()
    # Do not log filename
    declared = file.filename
    try:
        return coi.upload_bytes(
            db,
            candidate_id=cand.id,
            batch_key=batch_key,
            content=raw,
            declared_name=declared,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="batch_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/import/batches/{batch_key}/process")
def process_batch(
    batch_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return coi.process_to_preview(db, candidate_id=cand.id, batch_key=batch_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="batch_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/import/batches/{batch_key}/approve")
def approve_batch(
    batch_key: str,
    body: ApproveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return coi.record_approval(
            db,
            candidate_id=cand.id,
            batch_key=batch_key,
            item_keys=body.item_keys[:200],
            preview_version=body.preview_version,
            idempotency_key=body.idempotency_key,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="batch_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/import/batches/{batch_key}/commit")
def commit_batch(
    batch_key: str,
    body: CommitIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return coi.commit_approved(
            db,
            candidate_id=cand.id,
            batch_key=batch_key,
            idempotency_key=body.idempotency_key,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="batch_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/import/batches/{batch_key}/rollback")
def rollback_batch(
    batch_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return coi.rollback_commit(db, candidate_id=cand.id, batch_key=batch_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="batch_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.delete("/me/import/batches/{batch_key}")
def delete_batch(
    batch_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return coi.cancel_or_delete(db, candidate_id=cand.id, batch_key=batch_key, hard=True)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="batch_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None
