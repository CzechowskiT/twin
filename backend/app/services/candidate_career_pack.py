"""Epic 2.17 — candidate-controlled Career Pack (private, owner-only).

Flow: select approved artifacts → disclosure fields → exact preview →
confirm → immutable snapshot → PDF+ZIP → authenticated download →
expire/revoke/delete.

Never sends, publishes, or externally delivers. No LLM rewrite.
"""

from __future__ import annotations

import hashlib
import io
import json
import uuid
import zipfile
from datetime import datetime, timedelta
from typing import Any

from fpdf import FPDF
from sqlalchemy.orm import Session

from app.database.models import (
    Candidate,
    CandidateAppStudioCoverLetter,
    CandidateAppStudioCvDraft,
    CandidateAppStudioWorkspace,
    CandidateCareerEvidence,
    CandidateCareerPack,
    CandidateCareerPackAudit,
    CandidateLifecyclePrivacy,
    User,
)
from app.services.candidate_career_pack_constants import (
    ARTIFACT_KINDS,
    CLOUD_UPLOAD,
    DEFAULT_TTL_HOURS,
    DISCLOSURE_FIELDS,
    EIGHTH_PRIMARY_NAV,
    EMAIL_SEND,
    EXTERNAL_DELIVERY,
    FIRST_VALUE_SATISFIED_BY_CAREER_PACK,
    LLM_REWRITE,
    MAX_ARTIFACTS,
    PACK_TYPES,
    PUBLIC_PROFILE,
    SCHEMA_ID,
    CONTRACT_ID,
    FIRST_VALUE_CONTRACT,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _uuid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), default=str, sort_keys=True)


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def _hash(obj: Any) -> str:
    return hashlib.sha256(_dumps(obj).encode("utf-8")).hexdigest()


def _privacy_paused(db: Session, *, candidate_id: int) -> bool:
    row = (
        db.query(CandidateLifecyclePrivacy)
        .filter(CandidateLifecyclePrivacy.candidate_id == candidate_id)
        .one_or_none()
    )
    return bool(row and row.paused)


def _audit(
    db: Session,
    *,
    candidate_id: int,
    pack_id: int | None,
    action: str,
    payload: dict[str, Any],
) -> None:
    safe = {
        k: v
        for k, v in payload.items()
        if k
        in {
            "state",
            "pack_type",
            "count",
            "byte_size",
            "download_count",
            "field_count",
            "artifact_count",
            "expired",
            "revoked",
            "format",
        }
    }
    db.add(
        CandidateCareerPackAudit(
            candidate_id=candidate_id,
            pack_id=pack_id,
            action=action[:64],
            payload_json=_dumps(safe),
            claim_kind="FACT",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
    )


def catalog() -> dict[str, Any]:
    fields = []
    for key, meta in DISCLOSURE_FIELDS.items():
        fields.append(
            {
                "field_key": key,
                "sensitive": meta["sensitive"],
                "default_on": meta["default_on"],
                "internal_only": meta["internal_only"],
                "selectable": not meta["internal_only"],
            }
        )
    return {
        "schema_id": SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "pack_types": list(PACK_TYPES),
        "disclosure_fields": fields,
        "external_delivery": EXTERNAL_DELIVERY,
        "public_profile": PUBLIC_PROFILE,
        "cloud_upload": CLOUD_UPLOAD,
        "email_send": EMAIL_SEND,
        "llm_rewrite": LLM_REWRITE,
        "eighth_primary_nav": EIGHTH_PRIMARY_NAV,
        "first_value_satisfied_by_career_pack": FIRST_VALUE_SATISFIED_BY_CAREER_PACK,
        "default_ttl_hours": DEFAULT_TTL_HOURS,
        "formats": ["pdf", "zip"],
        "recipient_delivery": "NOT_PERFORMED",
        "recipient_open_or_view": "NOT_TRACKED",
    }


def default_disclosure() -> dict[str, bool]:
    out: dict[str, bool] = {}
    for key, meta in DISCLOSURE_FIELDS.items():
        if meta["internal_only"]:
            out[key] = False
        else:
            out[key] = bool(meta["default_on"]) and not meta["sensitive"]
            # sensitive default OFF even if default_on somehow true
            if meta["sensitive"]:
                out[key] = False
    return out


def _get_pack(db: Session, *, candidate_id: int, pack_key: str) -> CandidateCareerPack:
    row = (
        db.query(CandidateCareerPack)
        .filter(
            CandidateCareerPack.candidate_id == candidate_id,
            CandidateCareerPack.pack_key == pack_key,
            CandidateCareerPack.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        raise LookupError("pack_not_found")
    return row


def _ser(row: CandidateCareerPack, *, include_preview: bool = True) -> dict[str, Any]:
    out: dict[str, Any] = {
        "pack_key": row.pack_key,
        "pack_type": row.pack_type,
        "state": row.state,
        "title": row.title,
        "schema_version": row.schema_version,
        "artifact_refs": _loads(row.artifact_refs_json, []),
        "disclosure": _loads(row.disclosure_json, {}),
        "preview_hash": row.preview_hash,
        "snapshot_hash": row.snapshot_hash,
        "immutable": bool(row.immutable),
        "byte_size": row.byte_size,
        "download_count": int(row.download_count or 0),
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "revoked_at": row.revoked_at.isoformat() if row.revoked_at else None,
        "confirmed_at": row.confirmed_at.isoformat() if row.confirmed_at else None,
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
        "stale_confirmed": bool(row.stale_confirmed),
        "external_delivery": False,
        "has_pdf": row.pdf_bytes is not None,
        "has_zip": row.zip_bytes is not None,
        "first_value_satisfied": False,
        "kpi_excluded": True,
    }
    if include_preview:
        out["preview"] = _loads(row.preview_json, {})
    return out


def list_selectable_artifacts(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """Approved / candidate-confirmed artifacts only — no staging/raw."""
    items: list[dict[str, Any]] = []
    for ev in (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
            CandidateCareerEvidence.status != "archived",
        )
        .order_by(CandidateCareerEvidence.id.desc())
        .limit(30)
        .all()
    ):
        # Prefer confirmed / application-safe claim kinds
        ck = (ev.claim_kind or "").upper()
        approvedish = ck in {
            "CANDIDATE_CONFIRMED",
            "CANDIDATE_DECLARED",
            "FACT",
        } or (getattr(ev, "confidentiality", None) in {"APPLICATION_SAFE", "INTERVIEW_SAFE"})
        if not approvedish and ck not in {"SOURCE_SUPPORTED", "SUGGESTION"}:
            continue
        items.append(
            {
                "artifact_kind": "career_evidence",
                "artifact_ref": str(ev.id),
                "label": (ev.title or f"evidence:{ev.id}")[:120],
                "claim_kind": ev.claim_kind,
                "approved": approvedish,
            }
        )
    for ws in (
        db.query(CandidateAppStudioWorkspace)
        .filter(
            CandidateAppStudioWorkspace.candidate_id == candidate_id,
            CandidateAppStudioWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateAppStudioWorkspace.id.desc())
        .limit(20)
        .all()
    ):
        items.append(
            {
                "artifact_kind": "app_studio_workspace",
                "artifact_ref": str(ws.id),
                "label": (ws.title or f"workspace:{ws.id}")[:120],
                "claim_kind": ws.claim_kind,
                "approved": (ws.status or "") in {"approved", "ready", "declared"},
            }
        )
    for cv in (
        db.query(CandidateAppStudioCvDraft)
        .filter(
            CandidateAppStudioCvDraft.candidate_id == candidate_id,
            CandidateAppStudioCvDraft.deleted_at.is_(None),
            CandidateAppStudioCvDraft.approved.is_(True),
        )
        .order_by(CandidateAppStudioCvDraft.id.desc())
        .limit(10)
        .all()
    ):
        items.append(
            {
                "artifact_kind": "app_studio_cv_draft",
                "artifact_ref": str(cv.id),
                "label": f"cv_draft:{cv.id}:v{cv.version}",
                "claim_kind": getattr(cv, "claim_kind", "FACT") or "FACT",
                "approved": True,
            }
        )
    for cov in (
        db.query(CandidateAppStudioCoverLetter)
        .filter(
            CandidateAppStudioCoverLetter.candidate_id == candidate_id,
            CandidateAppStudioCoverLetter.deleted_at.is_(None),
            CandidateAppStudioCoverLetter.approved.is_(True),
        )
        .order_by(CandidateAppStudioCoverLetter.id.desc())
        .limit(10)
        .all()
    ):
        items.append(
            {
                "artifact_kind": "app_studio_cover_draft",
                "artifact_ref": str(cov.id),
                "label": f"cover_draft:{cov.id}:v{getattr(cov, 'version', 1)}",
                "claim_kind": getattr(cov, "claim_kind", "FACT") or "FACT",
                "approved": True,
            }
        )
    return {
        "schema_id": SCHEMA_ID,
        "artifacts": items[:MAX_ARTIFACTS],
        "mutations": 0,
        "first_value_satisfied": False,
    }


def create_draft(
    db: Session,
    *,
    candidate_id: int,
    pack_type: str,
    title: str | None = None,
) -> dict[str, Any]:
    if pack_type not in PACK_TYPES:
        raise ValueError("invalid_pack_type")
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    row = CandidateCareerPack(
        candidate_id=candidate_id,
        pack_key=_uuid("pack"),
        pack_type=pack_type,
        state="DRAFT",
        schema_version=SCHEMA_ID,
        title=(title or "Career Pack")[:300],
        artifact_refs_json="[]",
        disclosure_json=_dumps(default_disclosure()),
        preview_json="{}",
        snapshot_json="{}",
        immutable=False,
        external_delivery=False,
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=False,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=row.id,
        action="create_draft",
        payload={"state": "DRAFT", "pack_type": pack_type},
    )
    db.commit()
    db.refresh(row)
    return _ser(row)


def list_packs(db: Session, *, candidate_id: int) -> dict[str, Any]:
    rows = (
        db.query(CandidateCareerPack)
        .filter(
            CandidateCareerPack.candidate_id == candidate_id,
            CandidateCareerPack.deleted_at.is_(None),
            CandidateCareerPack.state != "DELETED",
        )
        .order_by(CandidateCareerPack.id.desc())
        .limit(50)
        .all()
    )
    return {
        "schema_id": SCHEMA_ID,
        "packs": [_ser(r, include_preview=False) for r in rows],
        "first_value_satisfied": False,
    }


def update_selection(
    db: Session,
    *,
    candidate_id: int,
    pack_key: str,
    artifact_refs: list[dict[str, str]],
    disclosure: dict[str, bool] | None = None,
) -> dict[str, Any]:
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    row = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    if row.state not in {"DRAFT", "PREVIEW_READY", "AWAITING_CONFIRMATION"}:
        raise ValueError("pack_not_editable")
    if row.immutable:
        raise ValueError("pack_immutable")
    cleaned: list[dict[str, str]] = []
    for ref in artifact_refs[:MAX_ARTIFACTS]:
        kind = str(ref.get("artifact_kind") or "")
        rid = str(ref.get("artifact_ref") or "")
        if kind not in ARTIFACT_KINDS or not rid:
            continue
        cleaned.append({"artifact_kind": kind, "artifact_ref": rid[:64]})
    disc = default_disclosure()
    if isinstance(disclosure, dict):
        for key, meta in DISCLOSURE_FIELDS.items():
            if meta["internal_only"]:
                disc[key] = False
                continue
            if key in disclosure:
                disc[key] = bool(disclosure[key])
                if meta["sensitive"] and disc[key] is True:
                    # allow explicit opt-in for sensitive non-internal
                    disc[key] = True
    row.artifact_refs_json = _dumps(cleaned)
    row.disclosure_json = _dumps(disc)
    row.preview_json = "{}"
    row.preview_hash = None
    row.state = "DRAFT"
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=row.id,
        action="update_selection",
        payload={"artifact_count": len(cleaned), "field_count": sum(1 for v in disc.values() if v)},
    )
    db.commit()
    return _ser(row)


def _resolve_payload(
    db: Session,
    *,
    candidate_id: int,
    pack_type: str,
    artifact_refs: list[dict[str, str]],
    disclosure: dict[str, bool],
) -> dict[str, Any]:
    """Build exact recipient-facing payload from disclosure — no LLM."""
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    user = db.query(User).filter(User.id == cand.user_id).one_or_none()
    sections: list[dict[str, Any]] = []
    warnings: list[str] = []

    if disclosure.get("display_name"):
        sections.append({"field": "display_name", "value": (cand.name or "Candidate")[:120]})
    if disclosure.get("headline"):
        sections.append(
            {
                "field": "headline",
                "value": f"{pack_type.replace('_', ' ').title()}",
            }
        )
    if disclosure.get("skills"):
        try:
            skills = json.loads(cand.skills or "[]")
            if isinstance(skills, list):
                sections.append({"field": "skills", "value": [str(s)[:60] for s in skills][:30]})
        except json.JSONDecodeError:
            warnings.append("skills_parse_skipped")
    if disclosure.get("contact_email") and user and user.email:
        sections.append({"field": "contact_email", "value": str(user.email)[:200]})
    if disclosure.get("location") and getattr(cand, "location", None):
        sections.append({"field": "location", "value": str(cand.location)[:120]})
    # Always blocked internal
    for blocked in ("internal_notes", "twin_scores", "raw_cv_full"):
        if disclosure.get(blocked):
            warnings.append(f"blocked_internal:{blocked}")
            disclosure[blocked] = False

    for ref in artifact_refs:
        kind = ref.get("artifact_kind")
        rid = int(ref.get("artifact_ref") or 0)
        if kind == "career_evidence":
            ev = (
                db.query(CandidateCareerEvidence)
                .filter(
                    CandidateCareerEvidence.id == rid,
                    CandidateCareerEvidence.candidate_id == candidate_id,
                    CandidateCareerEvidence.deleted_at.is_(None),
                )
                .one_or_none()
            )
            if not ev:
                warnings.append(f"missing_evidence:{rid}")
                continue
            item: dict[str, Any] = {"artifact_kind": kind, "artifact_ref": str(rid)}
            if disclosure.get("evidence_titles"):
                item["title"] = (ev.title or "")[:200]
            if disclosure.get("evidence_summaries"):
                item["summary"] = (ev.summary or "")[:2000]
            sections.append(item)
        elif kind == "app_studio_workspace":
            ws = (
                db.query(CandidateAppStudioWorkspace)
                .filter(
                    CandidateAppStudioWorkspace.id == rid,
                    CandidateAppStudioWorkspace.candidate_id == candidate_id,
                    CandidateAppStudioWorkspace.deleted_at.is_(None),
                )
                .one_or_none()
            )
            if not ws:
                warnings.append(f"missing_workspace:{rid}")
                continue
            item = {"artifact_kind": kind, "artifact_ref": str(rid)}
            if disclosure.get("application_workspace_title"):
                item["title"] = (ws.title or "")[:200]
            sections.append(item)
        elif kind == "app_studio_cv_draft":
            cv = (
                db.query(CandidateAppStudioCvDraft)
                .filter(
                    CandidateAppStudioCvDraft.id == rid,
                    CandidateAppStudioCvDraft.candidate_id == candidate_id,
                    CandidateAppStudioCvDraft.deleted_at.is_(None),
                    CandidateAppStudioCvDraft.approved.is_(True),
                )
                .one_or_none()
            )
            if not cv:
                warnings.append(f"missing_or_unapproved_cv:{rid}")
                continue
            item = {"artifact_kind": kind, "artifact_ref": str(rid), "version": cv.version}
            if disclosure.get("approved_cv_excerpt"):
                body = getattr(cv, "body_json", None) or getattr(cv, "content_json", None) or "{}"
                text = body if isinstance(body, str) else _dumps(body)
                item["excerpt"] = text[:1500]
            sections.append(item)
        elif kind == "app_studio_cover_draft":
            cov = (
                db.query(CandidateAppStudioCoverLetter)
                .filter(
                    CandidateAppStudioCoverLetter.id == rid,
                    CandidateAppStudioCoverLetter.candidate_id == candidate_id,
                    CandidateAppStudioCoverLetter.deleted_at.is_(None),
                    CandidateAppStudioCoverLetter.approved.is_(True),
                )
                .one_or_none()
            )
            if not cov:
                warnings.append(f"missing_or_unapproved_cover:{rid}")
                continue
            item = {
                "artifact_kind": kind,
                "artifact_ref": str(rid),
                "version": getattr(cov, "version", 1),
            }
            if disclosure.get("approved_cover_excerpt"):
                text = getattr(cov, "body_text", None) or ""
                item["excerpt"] = str(text)[:1500]
            sections.append(item)

    return {
        "pack_type": pack_type,
        "disclosure": {k: v for k, v in disclosure.items() if v},
        "sections": sections,
        "warnings": warnings,
        "external_delivery": False,
        "llm_rewrite": False,
        "generated_content": False,
    }


def build_preview(
    db: Session, *, candidate_id: int, pack_key: str, stale_confirmed: bool = False
) -> dict[str, Any]:
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    row = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    if row.state not in {"DRAFT", "PREVIEW_READY", "AWAITING_CONFIRMATION"}:
        raise ValueError("invalid_state_for_preview")
    refs = _loads(row.artifact_refs_json, [])
    disc = _loads(row.disclosure_json, default_disclosure())
    payload = _resolve_payload(
        db,
        candidate_id=candidate_id,
        pack_type=row.pack_type,
        artifact_refs=refs if isinstance(refs, list) else [],
        disclosure=disc if isinstance(disc, dict) else default_disclosure(),
    )
    if payload["warnings"] and not stale_confirmed:
        row.state = "PREVIEW_READY"
        row.preview_json = _dumps(payload)
        row.preview_hash = _hash(payload)
        row.stale_confirmed = False
        row.updated_at = _utcnow()
        db.commit()
        return {
            **_ser(row),
            "requires_stale_confirmation": True,
            "warnings": payload["warnings"],
        }
    row.preview_json = _dumps(payload)
    row.preview_hash = _hash(payload)
    row.stale_confirmed = bool(stale_confirmed or not payload["warnings"])
    row.state = "AWAITING_CONFIRMATION"
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=row.id,
        action="preview",
        payload={"state": row.state, "artifact_count": len(refs)},
    )
    db.commit()
    return _ser(row)


def confirm_and_generate(
    db: Session,
    *,
    candidate_id: int,
    pack_key: str,
    preview_hash: str,
) -> dict[str, Any]:
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    row = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    if row.state != "AWAITING_CONFIRMATION":
        raise ValueError("invalid_state_for_confirm")
    if not row.preview_hash or row.preview_hash != preview_hash:
        raise ValueError("preview_hash_mismatch")
    preview = _loads(row.preview_json, {})
    if _hash(preview) != preview_hash:
        raise ValueError("preview_tampered")

    row.state = "GENERATING"
    db.commit()

    snapshot = {
        "confirmed_at": _utcnow().isoformat(),
        "preview_hash": preview_hash,
        "payload": preview,
        "immutable": True,
        "external_delivery": False,
    }
    pdf = _render_pdf(snapshot)
    zipped = _render_zip(snapshot, pdf)

    row.snapshot_json = _dumps(snapshot)
    row.snapshot_hash = _hash(snapshot)
    row.pdf_bytes = pdf
    row.zip_bytes = zipped
    row.byte_size = len(zipped)
    row.immutable = True
    row.state = "READY"
    row.confirmed_at = _utcnow()
    row.generated_at = _utcnow()
    row.expires_at = _utcnow() + timedelta(hours=DEFAULT_TTL_HOURS)
    row.updated_at = _utcnow()
    row.first_value_satisfied = False
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=row.id,
        action="confirm_generate",
        payload={"state": "READY", "byte_size": len(zipped)},
    )
    db.commit()
    db.refresh(row)
    return _ser(row)


def _render_pdf(snapshot: dict[str, Any]) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.multi_cell(0, 6, "TWIN Career Pack (private owner copy)")
    pdf.ln(2)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5, "Not delivered externally by TWIN. Owner download only.")
    pdf.ln(2)
    payload = snapshot.get("payload") or {}
    for section in payload.get("sections") or []:
        if not isinstance(section, dict):
            continue
        line = _dumps({k: v for k, v in section.items() if k != "excerpt"})
        pdf.multi_cell(0, 5, line[:500])
        if section.get("excerpt"):
            pdf.multi_cell(0, 5, str(section["excerpt"])[:800])
        pdf.ln(1)
    out = pdf.output()
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return str(out).encode("latin-1", errors="replace")


def _render_zip(snapshot: dict[str, Any], pdf: bytes) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", _dumps(snapshot))
        zf.writestr("career-pack.pdf", pdf)
        zf.writestr(
            "README.txt",
            "TWIN Career Pack — private owner-only copy. TWIN does not send this pack.\n",
        )
    return buf.getvalue()


def _ensure_ready(row: CandidateCareerPack) -> None:
    if row.state == "READY" and row.expires_at and row.expires_at < _utcnow():
        row.state = "EXPIRED"
    if row.state != "READY":
        raise ValueError(f"pack_not_downloadable:{row.state}")


def download(
    db: Session,
    *,
    candidate_id: int,
    pack_key: str,
    fmt: str = "zip",
) -> tuple[bytes, str, str]:
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    row = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    _ensure_ready(row)
    fmt_l = (fmt or "zip").lower()
    if fmt_l == "pdf":
        if not row.pdf_bytes:
            raise ValueError("pdf_missing")
        data = bytes(row.pdf_bytes)
        filename = f"{row.pack_key}.pdf"
        media = "application/pdf"
    else:
        if not row.zip_bytes:
            raise ValueError("zip_missing")
        data = bytes(row.zip_bytes)
        filename = f"{row.pack_key}.zip"
        media = "application/zip"
    row.download_count = int(row.download_count or 0) + 1
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=row.id,
        action="download",
        payload={
            "format": fmt_l,
            "byte_size": len(data),
            "download_count": row.download_count,
        },
    )
    db.commit()
    return data, filename, media


def _mark_pack_grants_unavailable(db: Session, *, pack_id: int) -> None:
    """Fail-closed: revoke/delete pack immediately closes active share grants."""
    from app.database.models import CandidateCareerPackShareGrant

    now = _utcnow()
    rows = (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.pack_id == pack_id,
            CandidateCareerPackShareGrant.deleted_at.is_(None),
            CandidateCareerPackShareGrant.state == "ACTIVE",
        )
        .all()
    )
    for g in rows:
        g.state = "PACK_UNAVAILABLE"
        g.updated_at = now


def revoke(db: Session, *, candidate_id: int, pack_key: str) -> dict[str, Any]:
    row = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    if row.state in {"DELETED", "REVOKED"}:
        raise ValueError("already_terminal")
    row.state = "REVOKED"
    row.revoked_at = _utcnow()
    row.pdf_bytes = None
    row.zip_bytes = None
    row.updated_at = _utcnow()
    _mark_pack_grants_unavailable(db, pack_id=row.id)
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=row.id,
        action="revoke",
        payload={"state": "REVOKED", "revoked": True},
    )
    db.commit()
    return _ser(row, include_preview=False)


def delete_pack(db: Session, *, candidate_id: int, pack_key: str) -> dict[str, Any]:
    row = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    row.state = "DELETED"
    row.deleted_at = _utcnow()
    row.pdf_bytes = None
    row.zip_bytes = None
    row.updated_at = _utcnow()
    _mark_pack_grants_unavailable(db, pack_id=row.id)
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=row.id,
        action="delete",
        payload={"state": "DELETED"},
    )
    db.commit()
    return {"deleted": True, "pack_key": pack_key, "first_value_satisfied": False}


def get_pack(db: Session, *, candidate_id: int, pack_key: str) -> dict[str, Any]:
    row = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    if row.state == "READY" and row.expires_at and row.expires_at < _utcnow():
        row.state = "EXPIRED"
        db.commit()
    return _ser(row)
