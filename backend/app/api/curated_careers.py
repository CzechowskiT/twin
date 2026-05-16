"""Stub: curated high-value employer career homepages (expand via DB or imports, not blind F500 scraping)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.database.models import User

router = APIRouter()


class CuratedCareerSource(BaseModel):
    company: str
    career_url: str
    notes: str | None = None


class CuratedCareerListOut(BaseModel):
    items: list[CuratedCareerSource]


# Minimal seed list — replace with DB-backed curation or imports from a data module.
_CURATED: list[CuratedCareerSource] = [
    CuratedCareerSource(
        company="Example Corp (placeholder)",
        career_url="https://example.com/careers",
        notes="Replace with real EU/global employers; fetch via dedicated adapters per domain.",
    ),
]


@router.get("/curated-careers", response_model=CuratedCareerListOut)
def list_curated_careers(_user: User = Depends(get_current_user)) -> CuratedCareerListOut:
    return CuratedCareerListOut(items=_CURATED)
