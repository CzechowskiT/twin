"""Opportunity intelligence API — source-backed discovery, not external apply."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import opportunity_intelligence as oi

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


def _err(exc: Exception) -> HTTPException:
    msg = str(exc) or type(exc).__name__
    code = status.HTTP_404_NOT_FOUND if "not_found" in msg else status.HTTP_400_BAD_REQUEST
    return HTTPException(code, detail=msg)


class PasteIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    company: str = Field(..., min_length=1, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=12000)
    url: str | None = Field(default=None, max_length=500)
    salary_min: int | None = None
    salary_max: int | None = None


class JobIngestIn(BaseModel):
    job_id: int


class WatchlistIn(BaseModel):
    title: str = Field(default="Watchlist", max_length=300)
    query: dict | None = None


class SavedSearchIn(BaseModel):
    title: str = Field(default="Saved search", max_length=300)
    query: dict = Field(default_factory=dict)
    notify: bool = False


class CompareIn(BaseModel):
    opportunity_ids: list[int] = Field(default_factory=list, max_length=5)


class RefreshIn(BaseModel):
    idempotency_key: str | None = Field(default=None, max_length=160)


class PrefsIn(BaseModel):
    paused: bool | None = None
    prefs: dict | None = None
    privacy: dict | None = None


@router.get("/me/opportunity-intelligence")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return oi.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/opportunity-intelligence/ingest/paste", status_code=status.HTTP_201_CREATED)
def post_paste(
    body: PasteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "opportunity": oi.ingest_manual_paste(
                db,
                candidate_id=cand.id,
                title=body.title,
                company=body.company,
                location=body.location,
                description=body.description,
                url=body.url,
                salary_min=body.salary_min,
                salary_max=body.salary_max,
                is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/opportunity-intelligence/ingest/job", status_code=status.HTTP_201_CREATED)
def post_job_ingest(
    body: JobIngestIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "opportunity": oi.ingest_from_job(
                db,
                candidate_id=cand.id,
                job_id=body.job_id,
                is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/opportunity-intelligence/market")
def get_market(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _candidate(db, user)
    return {"market": oi.build_market_signals(db)}


@router.post("/me/opportunity-intelligence/watchlists", status_code=status.HTTP_201_CREATED)
def post_watchlist(
    body: WatchlistIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {
        "watchlist": oi.create_watchlist(
            db, candidate_id=cand.id, title=body.title, query=body.query
        )
    }


@router.post("/me/opportunity-intelligence/watchlists/{watchlist_id}/refresh")
def post_watchlist_refresh(
    watchlist_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return oi.refresh_watchlist(db, candidate_id=cand.id, watchlist_id=watchlist_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/opportunity-intelligence/saved-searches", status_code=status.HTTP_201_CREATED)
def post_saved_search(
    body: SavedSearchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {
        "saved_search": oi.save_search(
            db, candidate_id=cand.id, title=body.title, query=body.query, notify=body.notify
        )
    }


@router.post("/me/opportunity-intelligence/compare")
def post_compare(
    body: CompareIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return oi.compare_opportunities(
        db, candidate_id=cand.id, opportunity_ids=body.opportunity_ids
    )


@router.post("/me/opportunity-intelligence/{opportunity_id}/studio-handoff")
def post_studio_handoff(
    opportunity_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return oi.handoff_to_studio(
            db,
            candidate_id=cand.id,
            opportunity_id=opportunity_id,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/opportunity-intelligence/{opportunity_id}/push-daily-os")
def post_push_daily(
    opportunity_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return oi.push_to_daily_os_and_acal(
            db, candidate_id=cand.id, opportunity_id=opportunity_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/opportunity-intelligence/refresh")
def post_refresh(
    body: RefreshIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return oi.run_refresh(
        db, candidate_id=cand.id, idempotency_key=body.idempotency_key
    )


@router.post("/me/opportunity-intelligence/invalidate-fit")
def post_invalidate_fit(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return oi.invalidate_on_evidence_delete(db, candidate_id=cand.id)


@router.get("/me/opportunity-intelligence/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return oi.export_discovery(db, candidate_id=cand.id)


@router.post("/me/opportunity-intelligence/history/delete")
def post_delete_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return oi.delete_discovery_history(db, candidate_id=cand.id)


@router.patch("/me/opportunity-intelligence/prefs")
def patch_prefs(
    body: PrefsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    prefs = oi.get_or_create_prefs(db, candidate_id=cand.id)
    if body.paused is not None:
        prefs.paused = bool(body.paused)
    if body.prefs is not None:
        prefs.prefs_json = oi._dumps({**oi._loads(prefs.prefs_json, {}), **body.prefs})
    if body.privacy is not None:
        prefs.privacy_json = oi._dumps({**oi._loads(prefs.privacy_json, {}), **body.privacy})
    prefs.version = int(prefs.version or 1) + 1
    prefs.updated_at = oi._utcnow()
    db.commit()
    return {
        "paused": prefs.paused,
        "prefs": oi._loads(prefs.prefs_json, {}),
        "privacy": oi._loads(prefs.privacy_json, {}),
        "version": prefs.version,
    }
