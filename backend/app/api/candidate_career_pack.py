"""Epic 2.17 API — Career Pack (auth required; never sends externally)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import Response as RawResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_career_pack as ccp

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


class CreateIn(BaseModel):
    pack_type: str = Field(min_length=8, max_length=64)
    title: str | None = Field(default=None, max_length=300)


class SelectionIn(BaseModel):
    artifact_refs: list[dict[str, str]] = Field(default_factory=list, max_length=40)
    disclosure: dict[str, bool] | None = None


class PreviewIn(BaseModel):
    stale_confirmed: bool = False


class ConfirmIn(BaseModel):
    preview_hash: str = Field(min_length=16, max_length=64)


@router.get("/me/career-packs/catalog")
def catalog(response: Response, user: User = Depends(get_current_user)) -> dict:
    _ = user
    _no_store(response)
    return ccp.catalog()


@router.get("/me/career-packs/artifacts")
def artifacts(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    return ccp.list_selectable_artifacts(db, candidate_id=cand.id)


@router.get("/me/career-packs")
def list_packs(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    return ccp.list_packs(db, candidate_id=cand.id)


@router.post("/me/career-packs")
def create_pack(
    body: CreateIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return ccp.create_draft(
            db,
            candidate_id=cand.id,
            pack_type=body.pack_type.strip().upper(),
            title=body.title,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.get("/me/career-packs/{pack_key}")
def get_pack(
    pack_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return ccp.get_pack(db, candidate_id=cand.id, pack_key=pack_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None


@router.post("/me/career-packs/{pack_key}/selection")
def selection(
    pack_key: str,
    body: SelectionIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return ccp.update_selection(
            db,
            candidate_id=cand.id,
            pack_key=pack_key,
            artifact_refs=body.artifact_refs,
            disclosure=body.disclosure,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/career-packs/{pack_key}/preview")
def preview(
    pack_key: str,
    body: PreviewIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return ccp.build_preview(
            db,
            candidate_id=cand.id,
            pack_key=pack_key,
            stale_confirmed=body.stale_confirmed,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/career-packs/{pack_key}/confirm")
def confirm(
    pack_key: str,
    body: ConfirmIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return ccp.confirm_and_generate(
            db,
            candidate_id=cand.id,
            pack_key=pack_key,
            preview_hash=body.preview_hash.strip(),
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.get("/me/career-packs/{pack_key}/download")
def download(
    pack_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    format: str = "zip",
) -> RawResponse:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        data, filename, media = ccp.download(
            db, candidate_id=cand.id, pack_key=pack_key, fmt=format
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from None
    return RawResponse(
        content=data,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Twin-External-Delivery": "false",
        },
    )


@router.post("/me/career-packs/{pack_key}/revoke")
def revoke_pack(
    pack_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return ccp.revoke(db, candidate_id=cand.id, pack_key=pack_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.delete("/me/career-packs/{pack_key}")
def delete_pack(
    pack_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return ccp.delete_pack(db, candidate_id=cand.id, pack_key=pack_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None


# Epic 2.19 — private share grants (owner). TWIN never sends the link.
from app.services import candidate_career_pack_share as cps  # noqa: E402
from app.config import get_settings  # noqa: E402


class ShareCreateIn(BaseModel):
    permission: str = Field(default="INLINE_VIEW", max_length=32)
    ttl_hours: int = Field(default=24, ge=1, le=72)
    disclosure_hash: str = Field(min_length=16, max_length=64)
    confirm_disclosure: bool = False


@router.get("/me/career-packs/share/catalog")
def share_catalog(response: Response, user: User = Depends(get_current_user)) -> dict:
    _ = user
    _no_store(response)
    return cps.catalog()


@router.get("/me/career-packs/{pack_key}/shares")
def list_shares(
    pack_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cps.list_grants(db, candidate_id=cand.id, pack_key=pack_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None


@router.post("/me/career-packs/{pack_key}/shares")
def create_share(
    pack_key: str,
    body: ShareCreateIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    settings = get_settings()
    base = (settings.frontend_url or "https://twin-sooty.vercel.app").rstrip("/")
    try:
        return cps.create_grant(
            db,
            candidate_id=cand.id,
            pack_key=pack_key,
            permission=body.permission.strip().upper(),
            ttl_hours=body.ttl_hours,
            disclosure_hash=body.disclosure_hash.strip(),
            confirm_disclosure=body.confirm_disclosure,
            public_base_url=base,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pack_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/career-packs/{pack_key}/shares/{grant_key}/revoke")
def revoke_share(
    pack_key: str,
    grant_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cps.revoke_grant(
            db, candidate_id=cand.id, pack_key=pack_key, grant_key=grant_key
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="grant_not_found") from None


@router.delete("/me/career-packs/{pack_key}/shares/{grant_key}")
def delete_share(
    pack_key: str,
    grant_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cps.delete_grant(
            db, candidate_id=cand.id, pack_key=pack_key, grant_key=grant_key
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="grant_not_found") from None


# Explicitly no outbound send/email routes — fail closed.
