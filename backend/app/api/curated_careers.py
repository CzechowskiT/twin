"""Stub: curated high-value employer career homepages (expand via DB or imports, not blind F500 scraping)."""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field

from app.core.deps import get_current_user
from app.database.models import EmployerLead, User
from app.database.session import get_db
from sqlalchemy.orm import Session

router = APIRouter()


class CuratedCareerSource(BaseModel):
    company: str
    career_url: str
    notes: str | None = None


class CuratedCareerListOut(BaseModel):
    items: list[CuratedCareerSource]


class EmployerLeadIn(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    contact_name: str | None = Field(None, max_length=200)
    message: str | None = Field(None, max_length=5000)
    source: str = Field(default="companies_signup", max_length=64)


class EmployerLeadOut(BaseModel):
    id: int


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


@router.post("/employer-leads", response_model=EmployerLeadOut, status_code=status.HTTP_201_CREATED)
def create_employer_lead(body: EmployerLeadIn, db: Session = Depends(get_db)) -> EmployerLeadOut:
    """Public lead capture for company / employer interest (no auth)."""
    chunks: list[str] = []
    if body.contact_name and body.contact_name.strip():
        chunks.append(f"Contact: {body.contact_name.strip()}")
    if body.message and body.message.strip():
        chunks.append(body.message.strip())
    src = (body.source or "companies_signup").strip()[:64]
    if src != "companies_signup":
        chunks.append(f"Source: {src}")
    notes = "\n\n".join(chunks) if chunks else None
    row = EmployerLead(
        email=str(body.email).lower().strip()[:255],
        company_name=body.company_name.strip()[:255],
        notes=notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return EmployerLeadOut(id=row.id)
