"""Candidate skill evidence vault — append-only skill proof records."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import CandidateEvidenceItem

ALLOWED_EVIDENCE_TYPES = frozenset(
    {"cv", "project", "certificate", "github", "case_study", "language_test", "assessment"}
)
ALLOWED_PRIVACY = frozenset({"candidate_private", "recruiter_visible", "compliance_restricted"})
MAX_ITEMS_PER_CANDIDATE = 200


def _serialize(row: CandidateEvidenceItem) -> dict:
    return {
        "id": row.id,
        "skill_name": row.skill_name,
        "evidence_type": row.evidence_type,
        "title": row.title,
        "note": row.note,
        "source_url": row.source_url,
        "privacy_class": row.privacy_class,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def list_candidate_evidence_items(db: Session, *, candidate_id: int) -> dict:
    rows = (
        db.query(CandidateEvidenceItem)
        .filter(CandidateEvidenceItem.candidate_id == candidate_id)
        .order_by(CandidateEvidenceItem.created_at.desc())
        .limit(MAX_ITEMS_PER_CANDIDATE)
        .all()
    )
    items = [_serialize(r) for r in rows]
    return {"items": items, "total": len(items)}


def create_candidate_evidence_item(
    db: Session,
    *,
    candidate_id: int,
    skill_name: str,
    evidence_type: str,
    title: str | None = None,
    note: str | None = None,
    source_url: str | None = None,
    privacy_class: str = "candidate_private",
) -> dict:
    skill = skill_name.strip()
    if not skill:
        raise ValueError("skill_name is required.")
    etype = evidence_type.strip().lower()
    if etype not in ALLOWED_EVIDENCE_TYPES:
        raise ValueError("evidence_type is invalid.")
    pclass = privacy_class.strip().lower()
    if pclass not in ALLOWED_PRIVACY:
        raise ValueError("privacy_class is invalid.")
    count = db.query(CandidateEvidenceItem).filter(CandidateEvidenceItem.candidate_id == candidate_id).count()
    if count >= MAX_ITEMS_PER_CANDIDATE:
        raise ValueError("Evidence vault limit reached.")
    now = datetime.now(timezone.utc)
    row = CandidateEvidenceItem(
        candidate_id=candidate_id,
        skill_name=skill[:120],
        evidence_type=etype,
        title=(title or "").strip()[:200] or None,
        note=(note or "").strip()[:4000] or None,
        source_url=(source_url or "").strip()[:2000] or None,
        privacy_class=pclass,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


def delete_candidate_evidence_item(db: Session, *, candidate_id: int, item_id: int) -> None:
    row = (
        db.query(CandidateEvidenceItem)
        .filter(
            CandidateEvidenceItem.id == item_id,
            CandidateEvidenceItem.candidate_id == candidate_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Evidence item not found.")
    db.delete(row)
    db.commit()
