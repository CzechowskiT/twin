"""Epic 2.13 API — Unified Career Workspace Search (auth required, POST body only)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import unified_workspace_search as uws
from app.services.request_locale import locale_from_request
from fastapi import Request

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    from fastapi import HTTPException, status

    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["Pragma"] = "no-cache"


class SearchIn(BaseModel):
    q: str = Field(default="", max_length=200)
    include_archived: bool = False
    domains: list[str] | None = Field(default=None, max_length=12)
    groups: list[str] | None = Field(default=None, max_length=4)


@router.get("/me/workspace-search/catalog")
def workspace_search_catalog(
    response: Response,
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    _no_store(response)
    return uws.catalog()


@router.get("/me/workspace-search/route-inventory")
def workspace_search_routes(
    response: Response,
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    _no_store(response)
    return uws.route_inventory()


@router.post("/me/workspace-search")
def workspace_search(
    body: SearchIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """POST body preferred — query must never appear in URL."""
    _no_store(response)
    cand = _candidate(db, user)
    locale = locale_from_request(request)
    # Never log body.q
    return uws.run_search(
        db,
        candidate_id=cand.id,
        q=body.q,
        locale=locale,
        include_archived=bool(body.include_archived),
        domains=body.domains,
        groups=body.groups,
    )
