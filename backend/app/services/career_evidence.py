"""Career Evidence & Portfolio — source-backed proof of competence (not career marketing).

Canonical chain: source -> evidence -> claim -> skill -> role relevance -> usage -> outcome.
Never invents achievements, metrics, employers, clients, projects, dates, or outcomes.
"""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Application,
    Candidate,
    CandidateAcceptanceItem,
    CandidateApplicationEvidencePack,
    CandidateCareerEvidence,
    CandidateCvBulletDraft,
    CandidateEvidenceAudit,
    CandidateEvidenceClaim,
    CandidateEvidenceField,
    CandidateEvidencePrivacy,
    CandidateEvidenceSkillLink,
    CandidateEvidenceSource,
    CandidateInterviewStory,
    CandidatePortfolioProject,
)
from app.services import acceptance_calendar as acal
from app.services import career_copilot as cc

logger = logging.getLogger(__name__)

CLAIM_LABELS = frozenset(
    {
        "FACT",
        "CANDIDATE_CONFIRMED",
        "SOURCE_SUPPORTED",
        "INFERENCE",
        "SUGGESTION",
        "UNKNOWN",
        "DISPUTED",
        "REDACTED",
    }
)
QUALITY = frozenset(
    {"STRONG", "USABLE", "NEEDS_CONTEXT", "WEAK", "CONFLICTING", "UNSUPPORTED", "UNKNOWN"}
)
CONFIDENTIALITY = frozenset(
    {
        "PRIVATE",
        "TWIN_INTERNAL",
        "APPLICATION_SAFE",
        "INTERVIEW_SAFE",
        "PORTFOLIO_SAFE",
        "PUBLIC_SAFE",
        "CONFIDENTIAL",
        "CLIENT_CONFIDENTIAL",
        "EMPLOYER_CONFIDENTIAL",
        "NDA_RESTRICTED",
        "UNKNOWN",
    }
)
SKILL_STATES = frozenset(
    {
        "VERIFIED_BY_SOURCE",
        "CANDIDATE_CONFIRMED",
        "SUPPORTED",
        "PARTIALLY_SUPPORTED",
        "LEARNING_ONLY",
        "CLAIM_ONLY",
        "STALE",
        "CONFLICTING",
        "UNKNOWN",
    }
)
EVIDENCE_TYPES = frozenset(
    {
        "employment_achievement",
        "project",
        "responsibility",
        "outcome",
        "metric",
        "deliverable",
        "portfolio_asset",
        "code_sample",
        "presentation",
        "case_study",
        "certificate",
        "course_output",
        "publication",
        "testimonial",
        "feedback",
        "interview_story",
        "learning",
        "open_source",
        "education",
        "custom",
    }
)
SOURCE_KINDS = frozenset(
    {
        "cv",
        "cover_letter",
        "profile",
        "upload",
        "performance_review",
        "project_description",
        "interview_note",
        "learning_output",
        "certificate",
        "manual",
        "application_material",
        "reflection",
        "consented_link",
        "twin_draft",
        "synthetic",
    }
)
ALLOWED_MIME = frozenset(
    {
        "text/plain",
        "text/markdown",
        "application/pdf",
        "application/json",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
)
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return cc._dumps(obj)


def _loads(raw: str | None, default: Any) -> Any:
    return cc._loads(raw or "", default)


def _hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _audit(
    db: Session,
    *,
    candidate_id: int,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateEvidenceAudit(
            candidate_id=candidate_id,
            entity_type=entity_type[:64],
            entity_id=entity_id,
            action=action[:64],
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


# ── Privacy ─────────────────────────────────────────────────────────────────


def get_or_create_privacy(db: Session, *, candidate_id: int) -> CandidateEvidencePrivacy:
    row = (
        db.query(CandidateEvidencePrivacy)
        .filter(CandidateEvidencePrivacy.candidate_id == candidate_id)
        .one_or_none()
    )
    if row:
        return row
    row = CandidateEvidencePrivacy(candidate_id=candidate_id, created_at=_utcnow(), updated_at=_utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_privacy(db: Session, *, candidate_id: int, **kwargs: Any) -> CandidateEvidencePrivacy:
    row = get_or_create_privacy(db, candidate_id=candidate_id)
    before = {"version": row.version, "paused": row.paused}
    for k, v in kwargs.items():
        if v is not None and hasattr(row, k):
            setattr(row, k, v)
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    _audit(db, candidate_id=candidate_id, entity_type="privacy", entity_id=row.id, action="update", before=before, after={"version": row.version})
    db.commit()
    db.refresh(row)
    return row


# ── Source registry ─────────────────────────────────────────────────────────


def register_source(
    db: Session,
    *,
    candidate_id: int,
    source_kind: str,
    title: str,
    content: bytes | str | None = None,
    location_ref: str | None = None,
    mime_type: str | None = None,
    is_synthetic: bool = False,
    payload: dict | None = None,
) -> CandidateEvidenceSource:
    kind = (source_kind or "manual").strip().lower()
    if kind not in SOURCE_KINDS:
        kind = "manual"
    if mime_type and mime_type not in ALLOWED_MIME and kind == "upload":
        raise ValueError("unsupported_mime")
    raw = content if isinstance(content, bytes) else (content or "").encode("utf-8")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError("file_too_large")
    content_hash = _hash_bytes(raw) if raw else None
    # Duplicate detection by hash
    if content_hash:
        dup = (
            db.query(CandidateEvidenceSource)
            .filter(
                CandidateEvidenceSource.candidate_id == candidate_id,
                CandidateEvidenceSource.content_hash == content_hash,
                CandidateEvidenceSource.deleted_at.is_(None),
                CandidateEvidenceSource.status == "active",
            )
            .first()
        )
        if dup:
            return dup
    key = f"{kind}:{content_hash or _hash_bytes((title + str(_utcnow())).encode())[:16]}"
    existing = (
        db.query(CandidateEvidenceSource)
        .filter(
            CandidateEvidenceSource.candidate_id == candidate_id,
            CandidateEvidenceSource.source_key == key[:160],
        )
        .one_or_none()
    )
    if existing and existing.deleted_at is None:
        existing.version = int(existing.version or 1) + 1
        existing.updated_at = _utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    if existing and existing.deleted_at is not None:
        # Revive soft-deleted source with same key (unique constraint)
        existing.deleted_at = None
        existing.status = "active"
        existing.version = int(existing.version or 1) + 1
        existing.title = (title or kind)[:300]
        existing.content_hash = content_hash
        existing.mime_type = mime_type
        existing.byte_size = len(raw) if raw else None
        existing.is_synthetic = bool(is_synthetic)
        existing.kpi_excluded = True
        existing.updated_at = _utcnow()
        existing.payload_json = _dumps(
            {
                **(payload or {}),
                "twin_draft_not_proof": kind == "twin_draft",
                "excerpt_preview": (raw[:200].decode("utf-8", errors="replace") if raw else ""),
                "kpi_excluded": True,
                "revived": True,
            }
        )
        db.commit()
        db.refresh(existing)
        return existing
    row = CandidateEvidenceSource(
        candidate_id=candidate_id,
        source_key=key[:160],
        source_kind=kind,
        title=(title or kind)[:300],
        location_ref=(location_ref or "")[:500] or None,
        content_hash=content_hash,
        mime_type=mime_type,
        byte_size=len(raw) if raw else None,
        version=1,
        status="active",
        is_synthetic=bool(is_synthetic),
        kpi_excluded=True,
        payload_json=_dumps(
            {
                **(payload or {}),
                "twin_draft_not_proof": kind == "twin_draft",
                "excerpt_preview": (raw[:200].decode("utf-8", errors="replace") if raw else ""),
                "kpi_excluded": True,
            }
        ),
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    _audit(db, candidate_id=candidate_id, entity_type="source", entity_id=row.id, action="register", before={}, after={"source_key": row.source_key})
    db.commit()
    db.refresh(row)
    return row


def list_sources(db: Session, *, candidate_id: int) -> list[dict]:
    rows = (
        db.query(CandidateEvidenceSource)
        .filter(
            CandidateEvidenceSource.candidate_id == candidate_id,
            CandidateEvidenceSource.deleted_at.is_(None),
        )
        .order_by(CandidateEvidenceSource.id.desc())
        .limit(100)
        .all()
    )
    return [_ser_source(r) for r in rows]


def _ser_source(r: CandidateEvidenceSource) -> dict:
    return {
        "id": r.id,
        "source_key": r.source_key,
        "source_kind": r.source_kind,
        "title": r.title,
        "content_hash": r.content_hash,
        "mime_type": r.mime_type,
        "byte_size": r.byte_size,
        "version": r.version,
        "status": r.status,
        "is_synthetic": r.is_synthetic,
        "kpi_excluded": r.kpi_excluded,
        "location_ref": r.location_ref,
        "twin_draft_not_proof": r.source_kind == "twin_draft",
    }


# ── Extraction (deterministic; AI optional only with opt-in) ────────────────


def extract_from_text(
    db: Session,
    *,
    candidate_id: int,
    source_id: int,
    text: str,
    parser_version: str = "deterministic_v1",
) -> list[CandidateCareerEvidence]:
    """Deterministic extraction — missing metrics stay UNKNOWN; never estimate."""
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if privacy.paused:
        raise ValueError("evidence_processing_paused")
    source = (
        db.query(CandidateEvidenceSource)
        .filter(
            CandidateEvidenceSource.id == source_id,
            CandidateEvidenceSource.candidate_id == candidate_id,
            CandidateEvidenceSource.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not source:
        raise ValueError("source_not_found")
    items: list[CandidateCareerEvidence] = []
    # Bullet-like lines as proposed evidence (INFERENCE until confirmed)
    lines = [ln.strip(" -•*\t") for ln in (text or "").splitlines() if len(ln.strip()) > 12]
    for i, line in enumerate(lines[:20]):
        # Never invent metrics — detect numbers only if present in source
        has_number = bool(re.search(r"\d", line))
        metrics: list[dict] = []
        if has_number:
            metrics.append(
                {
                    "raw": "UNKNOWN",
                    "value": None,
                    "unit": "UNKNOWN",
                    "claim_kind": "SOURCE_SUPPORTED",
                    "note": "Numeric token present in source — value not estimated",
                    "invented": False,
                }
            )
        else:
            metrics.append({"value": None, "unit": None, "claim_kind": "UNKNOWN", "invented": False})
        ev = create_evidence(
            db,
            candidate_id=candidate_id,
            evidence_type="employment_achievement" if has_number else "responsibility",
            title=line[:120],
            summary=line[:2000],
            source_ids=[source_id],
            claim_kind="INFERENCE",
            metrics=metrics,
            context={"source_location": f"line:{i+1}", "parser_version": parser_version},
            action={"text": line, "claim_kind": "INFERENCE"},
            result={"text": "UNKNOWN", "claim_kind": "UNKNOWN"},
            is_synthetic=bool(source.is_synthetic),
            commit=False,
        )
        # Field-level pending confirmation
        for field, val, loc in (
            ("title", line[:120], f"line:{i+1}"),
            ("summary", line[:2000], f"line:{i+1}"),
            ("metric", metrics[0], f"line:{i+1}"),
        ):
            upsert_field(
                db,
                candidate_id=candidate_id,
                evidence_id=ev.id,
                field_name=field,
                value=val,
                claim_kind="INFERENCE" if field != "metric" or has_number else "UNKNOWN",
                source_location=loc,
                confirmation="pending",
                commit=False,
            )
        items.append(ev)
    db.commit()
    for ev in items:
        db.refresh(ev)
    return items


# ── Evidence CRUD + quality ─────────────────────────────────────────────────


def _score_quality(*, has_source: bool, confirmed: bool, has_result: bool, has_metric: bool, contribution: bool) -> tuple[str, dict]:
    explain = {
        "source_present": has_source,
        "confirmed": confirmed,
        "result_clarity": has_result,
        "metric_present": has_metric,
        "contribution_clarity": contribution,
    }
    if not has_source:
        return "UNSUPPORTED", explain
    if confirmed and has_result and contribution:
        return ("STRONG" if has_metric else "USABLE"), explain
    if confirmed:
        return "NEEDS_CONTEXT", explain
    if has_source:
        return "WEAK", explain
    return "UNKNOWN", explain


def create_evidence(
    db: Session,
    *,
    candidate_id: int,
    evidence_type: str,
    title: str,
    summary: str = "",
    source_ids: list[int] | None = None,
    claim_kind: str = "UNKNOWN",
    metrics: list | None = None,
    technologies: list | None = None,
    skills: list | None = None,
    target_roles: list | None = None,
    context: dict | None = None,
    action: dict | None = None,
    result: dict | None = None,
    confidentiality: str = "PRIVATE",
    is_synthetic: bool = False,
    commit: bool = True,
) -> CandidateCareerEvidence:
    et = (evidence_type or "custom").strip().lower()
    if et not in EVIDENCE_TYPES:
        et = "custom"
    ck = claim_kind if claim_kind in CLAIM_LABELS else "UNKNOWN"
    conf = confidentiality if confidentiality in CONFIDENTIALITY else "PRIVATE"
    # Metric safety — reject invented values
    safe_metrics = []
    for m in metrics or []:
        if not isinstance(m, dict):
            continue
        if m.get("invented") is True:
            raise ValueError("fabricated_metric_rejected")
        if m.get("value") is not None and not m.get("source") and ck not in {"FACT", "CANDIDATE_CONFIRMED", "SOURCE_SUPPORTED"}:
            # Unsourced numeric claim → force UNKNOWN
            m = {**m, "value": None, "claim_kind": "UNKNOWN", "blocked_reason": "unsourced_metric"}
        safe_metrics.append(m)
    srcs = source_ids or []
    quality, qexp = _score_quality(
        has_source=bool(srcs),
        confirmed=ck == "CANDIDATE_CONFIRMED",
        has_result=bool((result or {}).get("text") and (result or {}).get("text") != "UNKNOWN"),
        has_metric=any(m.get("value") is not None for m in safe_metrics),
        contribution=bool((action or {}).get("text")),
    )
    key = f"{et}:{_hash_bytes((title + str(_utcnow().timestamp())).encode())[:12]}"
    # Avoid unique collision on rapid creates
    existing = (
        db.query(CandidateCareerEvidence)
        .filter_by(candidate_id=candidate_id, evidence_key=key[:160])
        .one_or_none()
    )
    if existing:
        key = f"{key}:{existing.id}"[:160]
    row = CandidateCareerEvidence(
        candidate_id=candidate_id,
        evidence_key=key[:160],
        evidence_type=et,
        title=title[:300],
        summary=(summary or "")[:4000],
        context_json=_dumps(context or {}),
        action_json=_dumps(action or {}),
        result_json=_dumps(result or {"text": "UNKNOWN", "claim_kind": "UNKNOWN"}),
        metrics_json=_dumps(safe_metrics),
        technologies_json=_dumps(technologies or []),
        skills_json=_dumps(skills or []),
        target_roles_json=_dumps(target_roles or []),
        source_ids_json=_dumps(srcs),
        claim_kind=ck,
        quality=quality,
        quality_explain_json=_dumps(qexp),
        confidence="medium" if srcs else "low",
        confidentiality=conf,
        external_usability="PRIVATE" if conf in {"PRIVATE", "CONFIDENTIAL", "NDA_RESTRICTED", "CLIENT_CONFIDENTIAL", "EMPLOYER_CONFIDENTIAL"} else conf,
        verification_state="UNCONFIRMED",
        status="draft",
        version=1,
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        payload_json=_dumps({"kpi_excluded": True, "fabricated": False}),
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    _audit(db, candidate_id=candidate_id, entity_type="evidence", entity_id=row.id, action="create", before={}, after={"title": row.title, "claim_kind": ck})
    if commit:
        db.commit()
        db.refresh(row)
    return row


def upsert_field(
    db: Session,
    *,
    candidate_id: int,
    evidence_id: int,
    field_name: str,
    value: Any,
    claim_kind: str = "UNKNOWN",
    source_location: str | None = None,
    confirmation: str = "pending",
    commit: bool = True,
) -> CandidateEvidenceField:
    row = (
        db.query(CandidateEvidenceField)
        .filter(
            CandidateEvidenceField.evidence_id == evidence_id,
            CandidateEvidenceField.field_name == field_name[:80],
            CandidateEvidenceField.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    hist_entry = {
        "at": _utcnow().isoformat() + "Z",
        "confirmation": confirmation,
        "claim_kind": claim_kind,
        "value_preview": str(value)[:120],
    }
    if row is None:
        row = CandidateEvidenceField(
            candidate_id=candidate_id,
            evidence_id=evidence_id,
            field_name=field_name[:80],
            field_value_json=_dumps(value),
            claim_kind=claim_kind if claim_kind in CLAIM_LABELS else "UNKNOWN",
            confirmation=confirmation,
            source_location=(source_location or "")[:500] or None,
            confidence="low",
            version=1,
            history_json=_dumps([hist_entry]),
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(row)
    else:
        hist = _loads(row.history_json, [])
        hist.append(hist_entry)
        row.field_value_json = _dumps(value)
        row.claim_kind = claim_kind if claim_kind in CLAIM_LABELS else row.claim_kind
        row.confirmation = confirmation
        row.source_location = (source_location or row.source_location or "")[:500] or None
        row.version = int(row.version or 1) + 1
        row.history_json = _dumps(hist[-50:])
        row.updated_at = _utcnow()
    if commit:
        db.commit()
        db.refresh(row)
    return row


def confirm_field(
    db: Session,
    *,
    candidate_id: int,
    field_id: int,
    action: str,
    edited_value: Any | None = None,
) -> CandidateEvidenceField:
    row = (
        db.query(CandidateEvidenceField)
        .filter(
            CandidateEvidenceField.id == field_id,
            CandidateEvidenceField.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("field_not_found")
    before = {"confirmation": row.confirmation, "claim_kind": row.claim_kind}
    mapping = {
        "confirm": ("confirmed", "CANDIDATE_CONFIRMED"),
        "partial": ("partial", "SOURCE_SUPPORTED"),
        "reject": ("rejected", "UNKNOWN"),
        "dispute": ("disputed", "DISPUTED"),
        "redact": ("redacted", "REDACTED"),
        "edit": ("confirmed", "CANDIDATE_CONFIRMED"),
        "confidential": ("confidential", None),  # keep claim_kind
        "archive": ("archived", None),
        "delete": ("deleted", "UNKNOWN"),
        "split": ("pending", None),  # candidate-requested; never auto-split content
        "merge": ("pending", None),  # never auto-merge material differences
    }
    if action not in mapping:
        raise ValueError("invalid_field_action")
    conf, ck = mapping[action]
    row.confirmation = conf
    if ck is not None:
        row.claim_kind = ck
    if action == "edit" and edited_value is not None:
        row.field_value_json = _dumps(edited_value)
    hist = _loads(row.history_json, [])
    hist.append({"at": _utcnow().isoformat() + "Z", "action": action, "confirmation": conf})
    row.history_json = _dumps(hist[-50:])
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    # Promote parent evidence when title confirmed
    ev = db.query(CandidateCareerEvidence).filter_by(id=row.evidence_id, candidate_id=candidate_id).one_or_none()
    if ev and action == "confirm" and row.field_name == "title":
        ev.claim_kind = "CANDIDATE_CONFIRMED"
        ev.verification_state = "CANDIDATE_CONFIRMED"
        ev.quality, qexp = _score_quality(
            has_source=bool(_loads(ev.source_ids_json, [])),
            confirmed=True,
            has_result=True,
            has_metric=False,
            contribution=True,
        )
        ev.quality_explain_json = _dumps(qexp)
        ev.version = int(ev.version or 1) + 1
    if ev and action == "confidential":
        ev.confidentiality = "CONFIDENTIAL"
        ev.external_usability = "PRIVATE"
        ev.version = int(ev.version or 1) + 1
    if ev and action == "archive":
        ev.archived_at = _utcnow()
        ev.status = "archived"
        ev.version = int(ev.version or 1) + 1
    _audit(db, candidate_id=candidate_id, entity_type="field", entity_id=row.id, action=action, before=before, after={"confirmation": conf})
    # Adaptive memory: explicit candidate decisions only (no personality inference)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="adaptive_memory",
        entity_id=row.id,
        action=f"field_{action}",
        before={},
        after={"field_name": row.field_name, "confirmation": conf, "sensitive_source_duplicated": False},
    )
    if action == "delete":
        db.delete(row)
        db.commit()
        return row
    db.commit()
    db.refresh(row)
    return row


def link_skill(
    db: Session,
    *,
    candidate_id: int,
    evidence_id: int,
    skill: str,
    link_state: str = "CLAIM_ONLY",
) -> CandidateEvidenceSkillLink:
    state = link_state if link_state in SKILL_STATES else "CLAIM_ONLY"
    row = CandidateEvidenceSkillLink(
        candidate_id=candidate_id,
        evidence_id=evidence_id,
        skill=skill[:120],
        link_state=state,
        claim_kind="INFERENCE" if state == "CLAIM_ONLY" else "SOURCE_SUPPORTED",
        mastery_claim=False,  # never claim mastery
        evidence_explain_json=_dumps({"mastery": False, "note": "One evidence link ≠ mastery"}),
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def detect_conflicts(db: Session, *, candidate_id: int) -> list[dict]:
    rows = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .all()
    )
    out: list[dict] = []
    by_title: dict[str, list] = {}
    for r in rows:
        key = r.title.strip().lower()
        by_title.setdefault(key, []).append(r)
    for title, group in by_title.items():
        if len(group) < 2:
            continue
        kinds = {g.claim_kind for g in group}
        if "DISPUTED" in kinds or ("CANDIDATE_CONFIRMED" in kinds and "INFERENCE" in kinds):
            consistency = "CONFLICTING"
        else:
            consistency = "MINOR_VARIATION"
        claim = CandidateEvidenceClaim(
            candidate_id=candidate_id,
            evidence_id=group[0].id,
            claim_key=f"conflict:{_hash_bytes(title.encode())[:12]}",
            statement=f"Overlapping evidence titles: {group[0].title[:80]}",
            claim_kind="INFERENCE",
            consistency=consistency,
            conflict_with_json=_dumps([g.id for g in group]),
            source_ids_json=_dumps(_loads(group[0].source_ids_json, [])),
            status="open",
            version=1,
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        existing = (
            db.query(CandidateEvidenceClaim)
            .filter_by(candidate_id=candidate_id, claim_key=claim.claim_key)
            .one_or_none()
        )
        if existing:
            existing.consistency = consistency
            existing.conflict_with_json = claim.conflict_with_json
            existing.version = int(existing.version or 1) + 1
            existing.status = "open"
            db.flush()
            out.append(
                {
                    "id": existing.id,
                    "consistency": consistency,
                    "title": group[0].title,
                    "evidence_ids": [g.id for g in group],
                    "auto_resolved": False,
                }
            )
        else:
            db.add(claim)
            db.flush()
            out.append(
                {
                    "id": claim.id,
                    "consistency": consistency,
                    "title": group[0].title,
                    "evidence_ids": [g.id for g in group],
                    "auto_resolved": False,
                }
            )
    db.commit()
    return out


def resolve_conflict(
    db: Session, *, candidate_id: int, claim_id: int, resolution: str
) -> CandidateEvidenceClaim:
    row = (
        db.query(CandidateEvidenceClaim)
        .filter(
            CandidateEvidenceClaim.id == claim_id,
            CandidateEvidenceClaim.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("claim_not_found")
    if resolution not in {"keep_separate", "supersede", "archive_duplicate", "needs_review"}:
        raise ValueError("invalid_resolution")
    # Never auto-merge material differences
    row.status = "resolved" if resolution != "needs_review" else "open"
    row.consistency = "NEEDS_REVIEW" if resolution == "needs_review" else row.consistency
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="claim",
        entity_id=row.id,
        action=f"resolve_{resolution}",
        before={},
        after={"status": row.status, "auto_merge": False},
    )
    db.commit()
    db.refresh(row)
    return row


# ── Redaction / confidentiality ─────────────────────────────────────────────


def create_redacted_variant(
    db: Session, *, candidate_id: int, evidence_id: int
) -> CandidateCareerEvidence:
    src = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.id == evidence_id,
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not src:
        raise ValueError("evidence_not_found")
    # Do not overwrite original
    redacted = CandidateCareerEvidence(
        candidate_id=candidate_id,
        evidence_key=f"redacted:{src.evidence_key}"[:160],
        evidence_type=src.evidence_type,
        title=re.sub(r"\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b", "[REDACTED]", src.title)[:300],
        summary="[REDACTED VARIANT] " + re.sub(r"\b\d[\d,.]*\b", "[n]", src.summary)[:3900],
        context_json=src.context_json,
        action_json=_dumps({"text": "[REDACTED]", "claim_kind": "REDACTED"}),
        result_json=_dumps({"text": "[REDACTED]", "claim_kind": "REDACTED"}),
        metrics_json=_dumps([]),
        technologies_json=src.technologies_json,
        skills_json=src.skills_json,
        target_roles_json=src.target_roles_json,
        source_ids_json=src.source_ids_json,
        claim_kind="REDACTED",
        quality=src.quality,
        quality_explain_json=src.quality_explain_json,
        confidence=src.confidence,
        confidentiality="APPLICATION_SAFE",
        external_usability="APPLICATION_SAFE",
        verification_state=src.verification_state,
        status="redacted_variant",
        version=1,
        is_synthetic=src.is_synthetic,
        kpi_excluded=True,
        redacted_of_id=src.id,
        payload_json=_dumps({"redacted_of": src.id, "original_preserved": True}),
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(redacted)
    db.commit()
    db.refresh(redacted)
    return redacted


# ── Achievement / STAR / portfolio builders ─────────────────────────────────


def build_achievement(
    db: Session,
    *,
    candidate_id: int,
    framework: str,
    title: str,
    parts: dict,
    source_ids: list[int] | None = None,
    skills: list[str] | None = None,
) -> CandidateCareerEvidence:
    fw = (framework or "CAR").upper()
    # Missing metrics stay UNKNOWN — do not invent
    result = parts.get("result") or parts.get("outcome") or "UNKNOWN"
    metric = parts.get("metric")
    metrics = []
    if metric is None or metric == "" or metric == "UNKNOWN":
        metrics.append({"value": None, "unit": None, "claim_kind": "UNKNOWN", "invented": False})
    else:
        metrics.append(
            {
                "value": metric,
                "unit": parts.get("unit") or "UNKNOWN",
                "source": "candidate_provided",
                "claim_kind": "CANDIDATE_CONFIRMED",
                "invented": False,
            }
        )
    return create_evidence(
        db,
        candidate_id=candidate_id,
        evidence_type="employment_achievement",
        title=title,
        summary=f"{fw}: {parts.get('challenge') or parts.get('situation') or ''}",
        source_ids=source_ids or [],
        claim_kind="CANDIDATE_CONFIRMED" if source_ids else "SUGGESTION",
        metrics=metrics,
        skills=skills or [],
        context={"framework": fw, "challenge": parts.get("challenge") or parts.get("situation")},
        action={"text": parts.get("action") or parts.get("task"), "claim_kind": "CANDIDATE_CONFIRMED"},
        result={"text": result, "claim_kind": "UNKNOWN" if result == "UNKNOWN" else "CANDIDATE_CONFIRMED"},
        confidentiality="PRIVATE",
    )


def create_portfolio_project(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    body: dict,
    evidence_ids: list[int] | None = None,
    skills: list[str] | None = None,
    confidentiality: str = "PRIVATE",
) -> CandidatePortfolioProject:
    conf = confidentiality if confidentiality in CONFIDENTIALITY else "PRIVATE"
    # Reject unsupported factual sentences without lineage
    body = dict(body or {})
    body["is_public"] = False
    body["public_url"] = None
    body["unsupported_sentences"] = body.get("unsupported_sentences") or []
    key = f"proj:{_hash_bytes((title + str(_utcnow().timestamp())).encode())[:12]}"
    existing = (
        db.query(CandidatePortfolioProject)
        .filter_by(candidate_id=candidate_id, project_key=key[:160])
        .one_or_none()
    )
    if existing and existing.deleted_at is not None:
        existing.deleted_at = None
        existing.title = title[:300]
        existing.body_json = _dumps(body)
        existing.evidence_ids_json = _dumps(evidence_ids or [])
        existing.skills_json = _dumps(skills or [])
        existing.confidentiality = conf
        existing.is_public = False
        existing.version = int(existing.version or 1) + 1
        existing.updated_at = _utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    row = CandidatePortfolioProject(
        candidate_id=candidate_id,
        project_key=key[:160],
        title=title[:300],
        external_safe_title=(body.get("external_safe_title") or title)[:300],
        body_json=_dumps(body),
        evidence_ids_json=_dumps(evidence_ids or []),
        skills_json=_dumps(skills or []),
        confidentiality=conf,
        status="draft",
        is_public=False,  # hard ban public portfolio
        version=1,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_case_study(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    body: dict,
    evidence_ids: list[int],
) -> CandidatePortfolioProject:
    if not evidence_ids:
        raise ValueError("case_study_requires_evidence_lineage")
    body = {**body, "kind": "case_study", "lineage_required": True}
    # Strip sentences marked unsupported / unknown without evidence lineage
    kept: list = []
    for s in list(body.get("sentences") or []):
        if isinstance(s, dict) and s.get("claim_kind") in {"UNSUPPORTED", "UNKNOWN"} and not s.get(
            "evidence_id"
        ):
            body.setdefault("omitted_unsupported", []).append(s.get("text"))
        else:
            kept.append(s)
    body["sentences"] = kept
    return create_portfolio_project(
        db,
        candidate_id=candidate_id,
        title=title,
        body=body,
        evidence_ids=evidence_ids,
        confidentiality="PRIVATE",
    )


def create_interview_story(
    db: Session,
    *,
    candidate_id: int,
    theme: str,
    title: str,
    body: dict,
    evidence_ids: list[int],
    framework: str = "STAR",
) -> CandidateInterviewStory:
    if not evidence_ids:
        raise ValueError("story_requires_evidence")
    key = f"story:{theme}:{_hash_bytes((title + str(_utcnow().timestamp())).encode())[:10]}"
    existing = (
        db.query(CandidateInterviewStory)
        .filter_by(candidate_id=candidate_id, story_key=key[:160])
        .one_or_none()
    )
    if existing and existing.deleted_at is not None:
        existing.deleted_at = None
        existing.title = title[:300]
        existing.body_json = _dumps({**body, "fabricated": False})
        existing.evidence_ids_json = _dumps(evidence_ids)
        existing.version = int(existing.version or 1) + 1
        existing.updated_at = _utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    row = CandidateInterviewStory(
        candidate_id=candidate_id,
        story_key=key[:160],
        theme=theme[:64],
        framework=(framework or "STAR")[:16],
        title=title[:300],
        body_json=_dumps({**body, "fabricated": False}),
        evidence_ids_json=_dumps(evidence_ids),
        claim_kind="SUGGESTION",
        status="draft",
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def audit_cv_bullet(
    db: Session,
    *,
    candidate_id: int,
    bullet: str,
    evidence_ids: list[int] | None = None,
) -> CandidateCvBulletDraft:
    eids = evidence_ids or []
    status = "unsupported"
    if eids:
        confirmed_n = (
            db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.id.in_(eids),
                CandidateCareerEvidence.candidate_id == candidate_id,
                CandidateCareerEvidence.claim_kind.in_(
                    ["CANDIDATE_CONFIRMED", "FACT", "SOURCE_SUPPORTED"]
                ),
            )
            .count()
        )
        status = "candidate_confirmed" if confirmed_n else "source_backed"
    # Never invent rewrite metrics
    draft = bullet if eids else f"[NEEDS EVIDENCE] {bullet}"
    key = f"bullet:{_hash_bytes(bullet.encode())[:12]}"
    row = CandidateCvBulletDraft(
        candidate_id=candidate_id,
        bullet_key=key[:160],
        source_bullet=bullet[:4000],
        draft_text=draft[:4000],
        audit_status=status,
        evidence_ids_json=_dumps(eids),
        claim_kind="SOURCE_SUPPORTED" if eids else "UNKNOWN",
        approved=None,
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def build_cv_bullet_from_evidence(
    db: Session,
    *,
    candidate_id: int,
    evidence_id: int,
    target_role: str | None = None,
) -> CandidateCvBulletDraft:
    ev = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.id == evidence_id,
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not ev:
        raise ValueError("evidence_not_found")
    if ev.claim_kind not in {"CANDIDATE_CONFIRMED", "FACT", "SOURCE_SUPPORTED"}:
        raise ValueError("bullet_requires_confirmed_evidence")
    action = _loads(ev.action_json, {}).get("text") or ev.summary
    result = _loads(ev.result_json, {}).get("text")
    metrics = _loads(ev.metrics_json, [])
    metric_bit = ""
    for m in metrics:
        if m.get("value") is not None and m.get("invented") is not True:
            metric_bit = f" ({m.get('value')} {m.get('unit') or ''})".strip()
            break
    draft = f"{action}"
    if result and result != "UNKNOWN":
        draft += f" — {result}{metric_bit}"
    return audit_cv_bullet(
        db,
        candidate_id=candidate_id,
        bullet=draft[:4000],
        evidence_ids=[evidence_id],
    )


def build_application_pack(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    requirements: list[str] | None = None,
    application_id: int | None = None,
) -> CandidateApplicationEvidencePack:
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
            CandidateCareerEvidence.confidentiality.in_(
                ["PRIVATE", "TWIN_INTERNAL", "APPLICATION_SAFE", "INTERVIEW_SAFE"]
            ),
        )
        .limit(30)
        .all()
    )
    matched = [e for e in evidence if e.claim_kind in {"CANDIDATE_CONFIRMED", "FACT", "SOURCE_SUPPORTED"}]
    claimed = [e for e in evidence if e.claim_kind in {"INFERENCE", "SUGGESTION"}]
    gaps = []
    for req in requirements or []:
        if not any(req.lower() in (e.title + e.summary).lower() for e in matched):
            gaps.append({"requirement": req, "fit": "unsupported_fit"})
    if matched and not gaps:
        fit = "evidence_backed_fit"
    elif matched:
        fit = "partially_supported_fit"
    elif claimed:
        fit = "claimed_fit"
    else:
        fit = "unknown_fit"
    key = f"pack:{application_id or 'manual'}:{_hash_bytes(title.encode())[:8]}"
    row = CandidateApplicationEvidencePack(
        candidate_id=candidate_id,
        application_id=application_id,
        pack_key=key[:160],
        title=title[:300],
        body_json=_dumps(
            {
                "requirements": requirements or [],
                "matched_evidence_ids": [e.id for e in matched],
                "claimed_only_ids": [e.id for e in claimed],
                "confidentiality_warnings": [
                    e.id for e in evidence if e.confidentiality in {"CONFIDENTIAL", "NDA_RESTRICTED"}
                ],
                "auto_submit": False,
                "external_communication": False,
            }
        ),
        fit_kind=fit,
        evidence_ids_json=_dumps([e.id for e in matched]),
        gaps_json=_dumps(gaps),
        auto_submit=False,
        version=1,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def readiness_dimensions(db: Session, *, candidate_id: int) -> dict:
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .all()
    )
    confirmed = [e for e in evidence if e.claim_kind in {"CANDIDATE_CONFIRMED", "FACT"}]
    stories = (
        db.query(CandidateInterviewStory)
        .filter(
            CandidateInterviewStory.candidate_id == candidate_id,
            CandidateInterviewStory.deleted_at.is_(None),
        )
        .count()
    )
    projects = (
        db.query(CandidatePortfolioProject)
        .filter(
            CandidatePortfolioProject.candidate_id == candidate_id,
            CandidatePortfolioProject.deleted_at.is_(None),
        )
        .count()
    )
    return {
        "knowledge_readiness": "UNKNOWN",
        "experience_readiness": "INFERENCE" if evidence else "UNKNOWN",
        "evidence_readiness": "USABLE" if confirmed else ("WEAK" if evidence else "UNKNOWN"),
        "interview_readiness": "USABLE" if stories else "UNKNOWN",
        "application_readiness": "USABLE" if confirmed else "UNKNOWN",
        "portfolio_readiness": "USABLE" if projects else "UNKNOWN",
        "data_confidence": "medium" if confirmed else "low",
        "collapsed_single_score": False,
        "counts": {
            "evidence": len(evidence),
            "confirmed": len(confirmed),
            "stories": stories,
            "projects": projects,
        },
        "kpi_excluded": True,
    }


def completeness_and_tasks(db: Session, *, candidate_id: int, user_id: int) -> dict:
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .all()
    )
    weak = [e for e in evidence if e.quality in {"WEAK", "NEEDS_CONTEXT", "UNSUPPORTED", "UNKNOWN"}]
    tasks = []
    for e in weak[:5]:
        tasks.append(
            {
                "title": f"Strengthen evidence: {e.title[:80]}",
                "evidence_id": e.id,
                "schedulable": True,
                "autonomous": False,
            }
        )
        # Integrate with Acceptance Calendar under fatigue limits
        try:
            acal.upsert_item(
                db,
                candidate_id=candidate_id,
                item_key=f"evidence:task:{e.id}",
                category="commitment",
                title=f"Evidence: {e.title[:80]}",
                summary="Evidence-building task — not autonomous",
                importance=55,
                claim_kind=cc.CLAIM_SUGGESTION,
                state="unscheduled",
                deep_link="/dashboard/portfolio",
                evidence=[{"type": "career_evidence", "id": e.id}],
                payload={"from_evidence_system": True, "kpi_excluded": True},
            )
        except Exception:
            logger.debug("acceptance calendar evidence task skip", exc_info=True)
        # Daily OS inbox — non-autonomous evidence-building suggestion under fatigue rules
        try:
            from app.services import career_daily_os as daily_os

            daily_os.upsert_inbox_item(
                db,
                candidate_id=candidate_id,
                item_key=f"evidence:task:{e.id}",
                kind="evidence_task",
                title=f"Strengthen evidence: {e.title[:80]}",
                body={
                    "evidence_id": e.id,
                    "autonomous": False,
                    "kpi_excluded": True,
                    "from_evidence_system": True,
                },
                priority_score=55,
                deep_link="/dashboard/portfolio",
                effort="S",
                completion_criterion="Confirm or enrich evidence fields",
                claim_kind=cc.CLAIM_SUGGESTION,
            )
        except Exception:
            logger.debug("daily os evidence inbox skip", exc_info=True)
    try:
        db.commit()
    except Exception:
        logger.debug("acceptance calendar evidence task commit skip", exc_info=True)
        db.rollback()
    return {
        "strong": len([e for e in evidence if e.quality == "STRONG"]),
        "weak": len(weak),
        "conflicting": len([e for e in evidence if e.quality == "CONFLICTING"]),
        "tasks": tasks,
        "kpi_excluded": True,
    }


# ── Export / delete ─────────────────────────────────────────────────────────


def export_evidence(
    db: Session, *, candidate_id: int, include_confidential: bool | None = None
) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    allow_conf = (
        privacy.export_include_confidential
        if include_confidential is None
        else bool(include_confidential)
    )
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .all()
    )
    items = []
    for e in evidence:
        if e.confidentiality in {"CONFIDENTIAL", "NDA_RESTRICTED", "CLIENT_CONFIDENTIAL", "EMPLOYER_CONFIDENTIAL"} and not allow_conf:
            continue
        items.append(_ser_evidence(e))
    return {
        "evidence": items,
        "sources": list_sources(db, candidate_id=candidate_id),
        "projects": [
            _ser_project(p)
            for p in db.query(CandidatePortfolioProject)
            .filter(
                CandidatePortfolioProject.candidate_id == candidate_id,
                CandidatePortfolioProject.deleted_at.is_(None),
            )
            .all()
        ],
        "stories": [
            _ser_story(s)
            for s in db.query(CandidateInterviewStory)
            .filter(
                CandidateInterviewStory.candidate_id == candidate_id,
                CandidateInterviewStory.deleted_at.is_(None),
            )
            .all()
        ],
        "hidden_reasoning": False,
        "prompts_excluded": True,
        "secrets_excluded": True,
        "kpi_excluded": True,
    }


def delete_all_evidence(db: Session, *, candidate_id: int) -> dict:
    """Propagate deletion — soft-delete evidence and clear downstream task keys."""
    now = _utcnow()
    n_ev = 0
    for e in (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .all()
    ):
        e.deleted_at = now
        e.status = "deleted"
        n_ev += 1
    for s in (
        db.query(CandidateEvidenceSource)
        .filter(
            CandidateEvidenceSource.candidate_id == candidate_id,
            CandidateEvidenceSource.deleted_at.is_(None),
        )
        .all()
    ):
        s.deleted_at = now
        s.status = "deleted"
    for p in (
        db.query(CandidatePortfolioProject)
        .filter(
            CandidatePortfolioProject.candidate_id == candidate_id,
            CandidatePortfolioProject.deleted_at.is_(None),
        )
        .all()
    ):
        p.deleted_at = now
    for st in (
        db.query(CandidateInterviewStory)
        .filter(
            CandidateInterviewStory.candidate_id == candidate_id,
            CandidateInterviewStory.deleted_at.is_(None),
        )
        .all()
    ):
        st.deleted_at = now
    # Remove acceptance calendar evidence tasks
    db.query(CandidateAcceptanceItem).filter(
        CandidateAcceptanceItem.candidate_id == candidate_id,
        CandidateAcceptanceItem.item_key.like("evidence:task:%"),
    ).delete(synchronize_session=False)
    db.query(CandidateEvidenceSkillLink).filter(
        CandidateEvidenceSkillLink.candidate_id == candidate_id
    ).delete(synchronize_session=False)
    db.query(CandidateEvidenceField).filter(
        CandidateEvidenceField.candidate_id == candidate_id
    ).delete(synchronize_session=False)
    db.query(CandidateEvidenceClaim).filter(
        CandidateEvidenceClaim.candidate_id == candidate_id
    ).delete(synchronize_session=False)
    db.query(CandidateCvBulletDraft).filter(
        CandidateCvBulletDraft.candidate_id == candidate_id
    ).delete(synchronize_session=False)
    db.query(CandidateApplicationEvidencePack).filter(
        CandidateApplicationEvidencePack.candidate_id == candidate_id
    ).delete(synchronize_session=False)
    # Propagate into Application Studio — no stale evidence in drafts/assets
    try:
        from app.services import application_studio as app_studio

        app_studio.purge_all_evidence_refs(db, candidate_id=candidate_id)
    except Exception:
        logger.debug("app_studio purge skip", exc_info=True)
    try:
        from app.services import interview_decision as idc

        idc.purge_all_evidence_refs(db, candidate_id=candidate_id)
    except Exception:
        logger.debug("interview_decision purge skip", exc_info=True)
    try:
        from app.services import career_transition as ctrans

        ctrans.purge_all_evidence_refs(db, candidate_id=candidate_id)
    except Exception:
        logger.debug("career_transition purge skip", exc_info=True)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="evidence",
        entity_id=None,
        action="delete_all",
        before={},
        after={"deleted_evidence": n_ev},
    )
    db.commit()
    return {"deleted_evidence": n_ev, "ok": True, "stale_reappear_guard": True}


# ── Serializers + aggregate ──────────────────────────────────────────────────


def _ser_evidence(e: CandidateCareerEvidence) -> dict:
    return {
        "id": e.id,
        "evidence_key": e.evidence_key,
        "evidence_type": e.evidence_type,
        "title": e.title,
        "summary": e.summary,
        "claim_kind": e.claim_kind,
        "quality": e.quality,
        "quality_explain": _loads(e.quality_explain_json, {}),
        "metrics": _loads(e.metrics_json, []),
        "skills": _loads(e.skills_json, []),
        "source_ids": _loads(e.source_ids_json, []),
        "confidentiality": e.confidentiality,
        "external_usability": e.external_usability,
        "verification_state": e.verification_state,
        "status": e.status,
        "version": e.version,
        "redacted_of_id": e.redacted_of_id,
        "is_synthetic": e.is_synthetic,
        "kpi_excluded": e.kpi_excluded,
        "context": _loads(e.context_json, {}),
        "action": _loads(e.action_json, {}),
        "result": _loads(e.result_json, {}),
    }


def _ser_project(p: CandidatePortfolioProject) -> dict:
    return {
        "id": p.id,
        "title": p.title,
        "external_safe_title": p.external_safe_title,
        "body": _loads(p.body_json, {}),
        "evidence_ids": _loads(p.evidence_ids_json, []),
        "skills": _loads(p.skills_json, []),
        "confidentiality": p.confidentiality,
        "status": p.status,
        "is_public": False,  # always report false — public portfolio OFF
        "version": p.version,
    }


def _ser_story(s: CandidateInterviewStory) -> dict:
    return {
        "id": s.id,
        "theme": s.theme,
        "framework": s.framework,
        "title": s.title,
        "body": _loads(s.body_json, {}),
        "evidence_ids": _loads(s.evidence_ids_json, []),
        "claim_kind": s.claim_kind,
        "status": s.status,
    }


def build_career_evidence_aggregate(db: Session, *, candidate_id: int, user_id: int) -> dict:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .order_by(CandidateCareerEvidence.id.desc())
        .limit(50)
        .all()
    )
    fields = (
        db.query(CandidateEvidenceField)
        .filter(CandidateEvidenceField.candidate_id == candidate_id)
        .order_by(CandidateEvidenceField.id.desc())
        .limit(100)
        .all()
    )
    conflicts = (
        db.query(CandidateEvidenceClaim)
        .filter(
            CandidateEvidenceClaim.candidate_id == candidate_id,
            CandidateEvidenceClaim.status == "open",
        )
        .limit(20)
        .all()
    )
    return {
        "schema": "twin.career_evidence/v1",
        "verdict_target": (
            "CAREER EVIDENCE SYSTEM CUSTOMER-USABLE — SOURCE-BACKED PORTFOLIO AND PROOF OF COMPETENCE PRODUCTION-READY"
        ),
        "privacy": {
            "ai_extraction_opt_in": privacy.ai_extraction_opt_in,
            "drafting_opt_in": privacy.drafting_opt_in,
            "paused": privacy.paused,
            "portfolio_inclusion_default": privacy.portfolio_inclusion_default,
            "export_include_confidential": privacy.export_include_confidential,
            "hidden_reuse": False,
        },
        "sources": list_sources(db, candidate_id=candidate_id),
        "evidence": [_ser_evidence(e) for e in evidence],
        "fields": [
            {
                "id": f.id,
                "evidence_id": f.evidence_id,
                "field_name": f.field_name,
                "confirmation": f.confirmation,
                "claim_kind": f.claim_kind,
                "source_location": f.source_location,
                "version": f.version,
                "history_len": len(_loads(f.history_json, [])),
            }
            for f in fields
        ],
        "conflicts": [
            {
                "id": c.id,
                "statement": c.statement,
                "consistency": c.consistency,
                "status": c.status,
                "auto_resolved": False,
            }
            for c in conflicts
        ],
        "projects": [
            _ser_project(p)
            for p in db.query(CandidatePortfolioProject)
            .filter(
                CandidatePortfolioProject.candidate_id == candidate_id,
                CandidatePortfolioProject.deleted_at.is_(None),
            )
            .limit(20)
            .all()
        ],
        "stories": [
            _ser_story(s)
            for s in db.query(CandidateInterviewStory)
            .filter(
                CandidateInterviewStory.candidate_id == candidate_id,
                CandidateInterviewStory.deleted_at.is_(None),
            )
            .limit(20)
            .all()
        ],
        "cv_bullets": [
            {
                "id": b.id,
                "draft_text": b.draft_text,
                "audit_status": b.audit_status,
                "claim_kind": b.claim_kind,
                "approved": b.approved,
                "evidence_ids": _loads(b.evidence_ids_json, []),
            }
            for b in db.query(CandidateCvBulletDraft)
            .filter(CandidateCvBulletDraft.candidate_id == candidate_id)
            .order_by(CandidateCvBulletDraft.id.desc())
            .limit(20)
            .all()
        ],
        "packs": [
            {
                "id": p.id,
                "title": p.title,
                "fit_kind": p.fit_kind,
                "auto_submit": False,
                "evidence_ids": _loads(p.evidence_ids_json, []),
                "gaps": _loads(p.gaps_json, []),
            }
            for p in db.query(CandidateApplicationEvidencePack)
            .filter(CandidateApplicationEvidencePack.candidate_id == candidate_id)
            .order_by(CandidateApplicationEvidencePack.id.desc())
            .limit(10)
            .all()
        ],
        "readiness": readiness_dimensions(db, candidate_id=candidate_id),
        "completeness": completeness_and_tasks(db, candidate_id=candidate_id, user_id=user_id),
        "skill_links": [
            {
                "id": l.id,
                "skill": l.skill,
                "link_state": l.link_state,
                "mastery_claim": False,
                "evidence_id": l.evidence_id,
            }
            for l in db.query(CandidateEvidenceSkillLink)
            .filter(CandidateEvidenceSkillLink.candidate_id == candidate_id)
            .limit(50)
            .all()
        ],
        "safety": {
            "public_portfolio": False,
            "external_profile_write": False,
            "autonomous_publishing": False,
            "reference_outreach": False,
            "auto_apply": False,
            "microsoft_calendar_write": False,
            "fabricated_achievements": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "alembic": "111_career_evidence_portfolio",
        "observability": {"schema": "twin.career_evidence_obs/v1", "source_text_in_metrics": False},
    }
