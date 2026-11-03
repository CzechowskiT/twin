"""Epic 2.12 — Candidate-owned import pipeline (quarantine → staging → approve → commit).

Rules:
- canonical_mutations stay 0 until explicit approved commit
- no filenames / raw content in telemetry or public responses
- truth = CANDIDATE_DECLARED unless separately verified
- fail closed; no malware-free claims without a scanner
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
from datetime import datetime
from typing import Any

from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Candidate, CandidateImportBatch
from app.services import career_evidence as evidence_svc
from app.services.candidate_owned_import_constants import (
    AUDIT_EVENTS,
    CONTRACT_ID,
    SCHEMA,
    TRUTH,
)
from app.services.import_parsers import parse_family
from app.services.import_security import (
    ImportSecurityError,
    reject_generic_zip,
    sanitize_declared_name,
    validate_upload,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _fernet() -> Fernet:
    settings = get_settings()
    digest = hashlib.sha256(settings.secret_key.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def _encrypt(raw: bytes) -> str:
    return _fernet().encrypt(raw).decode("ascii")


def _decrypt(ciphertext_b64: str) -> bytes:
    return _fernet().decrypt(ciphertext_b64.encode("ascii"))


def _content_hash(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _append_audit(batch: CandidateImportBatch, event_type: str, meta: dict[str, Any] | None = None) -> None:
    if event_type not in AUDIT_EVENTS:
        return
    events = _loads(batch.audit_json, [])
    if not isinstance(events, list):
        events = []
    # Content-free meta only
    clean = {k: str(v)[:128] for k, v in (meta or {}).items() if v is not None}
    events.append({"event": event_type, "at": _utcnow().isoformat(), "meta": clean})
    batch.audit_json = _dumps(events[-80:])


def _public(batch: CandidateImportBatch) -> dict[str, Any]:
    staging = _loads(batch.staging_json, [])
    preview = _loads(batch.preview_json, {})
    approval = _loads(batch.approval_json, {})
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "batch_key": batch.batch_key,
        "family": batch.family,
        "state": batch.state,
        "content_hash": batch.content_hash,
        "byte_size": batch.byte_size,
        "ext": batch.ext,
        "item_count": len(staging) if isinstance(staging, list) else 0,
        "preview_version": batch.preview_version,
        "canonical_mutations": int(batch.canonical_mutations or 0),
        "rejection_code": batch.rejection_code,
        "truth_default": TRUTH,
        "kpi_excluded": True,
        "malware_scanned": False,
        "malware_free_claim": False,
        "preview": preview,
        "approval": {
            "item_keys": approval.get("item_keys") if isinstance(approval, dict) else None,
            "idempotency_key": approval.get("idempotency_key") if isinstance(approval, dict) else None,
            "preview_version": approval.get("preview_version") if isinstance(approval, dict) else None,
        },
        "commit": _loads(batch.commit_json, {}),
        "rollback": _loads(batch.rollback_json, {}),
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "updated_at": batch.updated_at.isoformat() if batch.updated_at else None,
    }


def _privacy_paused(db: Session, *, candidate_id: int) -> bool:
    """Block parse/commit when lifecycle privacy pause is active (best-effort)."""
    try:
        from app.database.models import CandidateLifecyclePrivacy

        row = (
            db.query(CandidateLifecyclePrivacy)
            .filter(CandidateLifecyclePrivacy.candidate_id == candidate_id)
            .one_or_none()
        )
        if row is None:
            return False
        paused = getattr(row, "paused", None)
        if paused is True:
            return True
        status = str(getattr(row, "status", "") or "").upper()
        return status in {"PAUSED", "PRIVACY_PAUSE", "SUSPENDED"}
    except Exception:
        return False


def create_batch(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    family: str,
) -> dict[str, Any]:
    batch_key = secrets.token_hex(16)
    row = CandidateImportBatch(
        candidate_id=candidate_id,
        user_id=user_id,
        batch_key=batch_key,
        family=family,
        state="DRAFT",
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    _append_audit(row, "import_batch_created", {"family": family})
    db.add(row)
    db.commit()
    db.refresh(row)
    return _public(row)


def _get_owned(db: Session, *, candidate_id: int, batch_key: str) -> CandidateImportBatch:
    row = (
        db.query(CandidateImportBatch)
        .filter(
            CandidateImportBatch.candidate_id == candidate_id,
            CandidateImportBatch.batch_key == batch_key,
            CandidateImportBatch.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        raise LookupError("batch_not_found")
    return row


def upload_bytes(
    db: Session,
    *,
    candidate_id: int,
    batch_key: str,
    content: bytes,
    declared_name: str | None,
) -> dict[str, Any]:
    row = _get_owned(db, candidate_id=candidate_id, batch_key=batch_key)
    if row.state not in {"DRAFT", "REJECTED", "FAILED", "CANCELLED"}:
        raise ValueError("invalid_state_for_upload")
    if _privacy_paused(db, candidate_id=candidate_id):
        row.state = "REJECTED"
        row.rejection_code = "privacy_pause"
        _append_audit(row, "import_rejected", {"code": "privacy_pause"})
        db.commit()
        return _public(row)

    # Never persist original filename
    _ = sanitize_declared_name(declared_name)
    try:
        ext = validate_upload(family=row.family, content=content, declared_name=declared_name)
        reject_generic_zip(content, ext)
    except ImportSecurityError as exc:
        row.state = "REJECTED"
        row.rejection_code = str(exc)
        row.updated_at = _utcnow()
        _append_audit(row, "import_rejected", {"code": str(exc)})
        db.commit()
        return _public(row)

    row.state = "UPLOADED"
    row.content_hash = _content_hash(content)
    row.byte_size = len(content)
    row.ext = ext
    row.ciphertext_b64 = _encrypt(content)
    row.canonical_mutations = 0
    row.updated_at = _utcnow()
    _append_audit(row, "import_uploaded", {"bytes": len(content), "ext": ext})
    # Quarantine
    row.state = "QUARANTINED"
    _append_audit(row, "import_quarantined", {"hash": (row.content_hash or "")[:16]})
    db.commit()
    db.refresh(row)
    return _public(row)


def process_to_preview(
    db: Session,
    *,
    candidate_id: int,
    batch_key: str,
) -> dict[str, Any]:
    row = _get_owned(db, candidate_id=candidate_id, batch_key=batch_key)
    if row.state not in {"QUARANTINED", "STAGED", "PREVIEW_READY", "AWAITING_APPROVAL"}:
        raise ValueError("invalid_state_for_parse")
    if _privacy_paused(db, candidate_id=candidate_id):
        row.state = "REJECTED"
        row.rejection_code = "privacy_pause"
        _append_audit(row, "import_rejected", {"code": "privacy_pause"})
        db.commit()
        return _public(row)
    if not row.ciphertext_b64:
        raise ValueError("missing_artifact")

    row.state = "VALIDATING"
    row.updated_at = _utcnow()
    db.commit()

    try:
        raw = _decrypt(row.ciphertext_b64)
        # Re-validate after decrypt
        validate_upload(family=row.family, content=raw, declared_name=f"x{row.ext or '.txt'}")
        row.state = "PARSING"
        db.commit()
        items = parse_family(family=row.family, content=raw, ext=row.ext or ".txt")
    except (ImportSecurityError, Exception) as exc:
        code = str(exc) if isinstance(exc, ImportSecurityError) else "parse_failed"
        row.state = "FAILED"
        row.rejection_code = code[:64]
        row.updated_at = _utcnow()
        _append_audit(row, "import_failed", {"code": code[:64]})
        db.commit()
        return _public(row)

    # Deterministic conflict/dup hints (content-free keys only)
    seen: set[str] = set()
    for item in items:
        key = (item.get("title") or "").strip().lower()[:80]
        if key in seen:
            item["claim_kind"] = "CONFLICTING"
            item["dup"] = True
        else:
            seen.add(key)
            item["dup"] = False

    row.staging_json = _dumps(items)
    row.state = "STAGED"
    _append_audit(row, "import_parsed", {"items": len(items)})
    _append_audit(row, "import_staged", {"items": len(items)})

    preview = {
        "version": int(row.preview_version or 0) + 1,
        "truth": TRUTH,
        "items": [
            {
                "item_key": it["item_key"],
                "target_kind": it["target_kind"],
                "title": it["title"],
                "summary": (it.get("summary") or "")[:400],
                "claim_kind": it.get("claim_kind"),
                "dup": bool(it.get("dup")),
                "preview_escaped": it.get("preview_escaped"),
            }
            for it in items
        ],
        "diff": {
            "adds": len(items),
            "conflicts": sum(1 for it in items if it.get("dup")),
            "canonical_mutations_if_approved": len(items),
        },
    }
    row.preview_json = _dumps(preview)
    row.preview_version = preview["version"]
    row.state = "PREVIEW_READY"
    row.updated_at = _utcnow()
    _append_audit(row, "import_previewed", {"version": preview["version"]})
    db.commit()
    db.refresh(row)
    return _public(row)


def record_approval(
    db: Session,
    *,
    candidate_id: int,
    batch_key: str,
    item_keys: list[str],
    preview_version: int,
    idempotency_key: str,
) -> dict[str, Any]:
    row = _get_owned(db, candidate_id=candidate_id, batch_key=batch_key)
    if row.state not in {"PREVIEW_READY", "AWAITING_APPROVAL"}:
        raise ValueError("invalid_state_for_approval")
    if int(preview_version) != int(row.preview_version or 0):
        raise ValueError("stale_preview")
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")

    staging = _loads(row.staging_json, [])
    allowed = {it["item_key"] for it in staging if isinstance(it, dict)}
    selected = [k for k in item_keys if k in allowed]
    if not selected:
        raise ValueError("no_valid_items")

    # Idempotent approval
    existing = _loads(row.approval_json, {})
    if isinstance(existing, dict) and existing.get("idempotency_key") == idempotency_key:
        return _public(row)

    row.approval_json = _dumps(
        {
            "item_keys": selected,
            "preview_version": preview_version,
            "idempotency_key": idempotency_key[:64],
            "approved_at": _utcnow().isoformat(),
        }
    )
    row.idempotency_key = idempotency_key[:64]
    row.state = "AWAITING_APPROVAL"
    row.updated_at = _utcnow()
    _append_audit(row, "import_approval_recorded", {"items": len(selected)})
    db.commit()
    db.refresh(row)
    return _public(row)


def commit_approved(
    db: Session,
    *,
    candidate_id: int,
    batch_key: str,
    idempotency_key: str,
) -> dict[str, Any]:
    row = _get_owned(db, candidate_id=candidate_id, batch_key=batch_key)
    if row.state not in {"AWAITING_APPROVAL", "COMMITTED"}:
        raise ValueError("invalid_state_for_commit")
    approval = _loads(row.approval_json, {})
    if not isinstance(approval, dict) or not approval.get("item_keys"):
        raise ValueError("missing_approval")
    if int(approval.get("preview_version") or -1) != int(row.preview_version or 0):
        raise ValueError("stale_preview")
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")

    # Idempotent commit
    prior = _loads(row.commit_json, {})
    if isinstance(prior, dict) and prior.get("idempotency_key") == idempotency_key and row.state == "COMMITTED":
        return _public(row)

    row.state = "COMMITTING"
    db.commit()

    staging = {it["item_key"]: it for it in _loads(row.staging_json, []) if isinstance(it, dict)}
    created: list[dict[str, Any]] = []
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()

    for key in approval["item_keys"]:
        item = staging.get(key)
        if not item:
            continue
        target = item.get("target_kind")
        if target == "evidence":
            try:
                src = evidence_svc.register_source(
                    db,
                    candidate_id=candidate_id,
                    source_kind="upload",
                    title=f"import:{row.batch_key[:8]}",
                    content=(row.content_hash or row.batch_key).encode("utf-8"),
                    mime_type="text/plain",
                    is_synthetic=False,
                    payload={"import_batch": row.batch_key, "truth": TRUTH},
                )
                source_ids = [src.id]
            except Exception:
                source_ids = []
            ev = evidence_svc.create_evidence(
                db,
                candidate_id=candidate_id,
                evidence_type="custom",
                title=str(item.get("title") or "Imported")[:300],
                summary=str(item.get("summary") or "")[:4000],
                source_ids=source_ids,
                claim_kind="CANDIDATE_CONFIRMED",
                context={"import_batch": row.batch_key, "truth": TRUTH},
                is_synthetic=False,
                commit=False,
            )
            created.append({"kind": "evidence", "id": ev.id, "item_key": key})
        elif target == "opportunity":
            ev = evidence_svc.create_evidence(
                db,
                candidate_id=candidate_id,
                evidence_type="custom",
                title=str(item.get("title") or "Imported opportunity")[:300],
                summary=str(item.get("summary") or "")[:4000],
                claim_kind="CANDIDATE_CONFIRMED",
                context={
                    "import_batch": row.batch_key,
                    "truth": TRUTH,
                    "opportunity_payload": item.get("payload") or {},
                },
                is_synthetic=False,
                commit=False,
            )
            created.append({"kind": "opportunity_note", "id": ev.id, "item_key": key})
        elif target == "profile":
            payload = item.get("payload") or {}
            skills = payload.get("skills") or []
            if isinstance(skills, list) and skills:
                existing: list[str] = []
                raw_skills = cand.skills or "[]"
                try:
                    parsed = json.loads(raw_skills) if isinstance(raw_skills, str) else raw_skills
                    if isinstance(parsed, list):
                        existing = [str(s) for s in parsed]
                except json.JSONDecodeError:
                    existing = [s.strip() for s in str(raw_skills).split(",") if s.strip()]
                merged = list(dict.fromkeys([*existing, *[str(s)[:60] for s in skills]]))[:60]
                cand.skills = json.dumps(merged)
                created.append({"kind": "profile", "id": cand.id, "item_key": key})

    row.canonical_mutations = len(created)
    row.commit_json = _dumps(
        {
            "idempotency_key": idempotency_key[:64],
            "created": created,
            "committed_at": _utcnow().isoformat(),
        }
    )
    row.state = "COMMITTED"
    row.updated_at = _utcnow()
    _append_audit(row, "import_committed", {"mutations": len(created)})
    # Clear ciphertext after successful commit (retention minimization)
    row.ciphertext_b64 = None
    db.commit()
    db.refresh(row)
    # Epic 2.15 — post-commit reconciliation only (never staging/preview)
    try:
        from app.services import candidate_data_trust as cdt

        cdt.spawn_post_commit_review(
            db,
            candidate_id=candidate_id,
            import_batch_key=row.batch_key,
            created=created,
        )
    except Exception:
        # Import commit must remain durable even if review spawn fails
        pass
    db.refresh(row)
    return _public(row)


def rollback_commit(
    db: Session,
    *,
    candidate_id: int,
    batch_key: str,
) -> dict[str, Any]:
    row = _get_owned(db, candidate_id=candidate_id, batch_key=batch_key)
    if row.state != "COMMITTED":
        raise ValueError("invalid_state_for_rollback")
    commit = _loads(row.commit_json, {})
    created = commit.get("created") if isinstance(commit, dict) else []
    row.state = "ROLLING_BACK"
    db.commit()

    soft_deleted = 0
    for entry in created or []:
        if not isinstance(entry, dict):
            continue
        if entry.get("kind") in {"evidence", "opportunity_note"}:
            from app.database.models import CandidateCareerEvidence

            ev = (
                db.query(CandidateCareerEvidence)
                .filter(
                    CandidateCareerEvidence.id == int(entry["id"]),
                    CandidateCareerEvidence.candidate_id == candidate_id,
                )
                .one_or_none()
            )
            if ev is None:
                continue
            # Conflict-safe: skip if candidate edited after import
            ctx = _loads(ev.context_json, {})
            if isinstance(ctx, dict) and ctx.get("import_batch") == row.batch_key:
                if getattr(ev, "deleted_at", None) is None:
                    ev.status = "archived"
                    if hasattr(ev, "deleted_at"):
                        ev.deleted_at = _utcnow()
                    soft_deleted += 1

    row.rollback_json = _dumps(
        {"rolled_back_at": _utcnow().isoformat(), "soft_deleted": soft_deleted}
    )
    row.state = "ROLLED_BACK"
    row.updated_at = _utcnow()
    _append_audit(row, "import_rolled_back", {"soft_deleted": soft_deleted})
    db.commit()
    db.refresh(row)
    return _public(row)


def cancel_or_delete(
    db: Session,
    *,
    candidate_id: int,
    batch_key: str,
    hard: bool = False,
) -> dict[str, Any]:
    row = _get_owned(db, candidate_id=candidate_id, batch_key=batch_key)
    if row.state == "COMMITTING":
        raise ValueError("busy")
    row.ciphertext_b64 = None
    row.staging_json = "[]"
    if hard or row.state in {"DRAFT", "REJECTED", "FAILED", "CANCELLED", "ROLLED_BACK"}:
        row.state = "DELETED"
        row.deleted_at = _utcnow()
        _append_audit(row, "import_deleted", {})
    else:
        row.state = "CANCELLED"
        _append_audit(row, "import_cancelled", {})
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return _public(row)


def get_batch(db: Session, *, candidate_id: int, batch_key: str) -> dict[str, Any]:
    return _public(_get_owned(db, candidate_id=candidate_id, batch_key=batch_key))


def list_batches(db: Session, *, candidate_id: int, limit: int = 20) -> dict[str, Any]:
    rows = (
        db.query(CandidateImportBatch)
        .filter(
            CandidateImportBatch.candidate_id == candidate_id,
            CandidateImportBatch.deleted_at.is_(None),
        )
        .order_by(CandidateImportBatch.id.desc())
        .limit(min(limit, 50))
        .all()
    )
    return {"schema": SCHEMA, "batches": [_public(r) for r in rows]}


def catalog() -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "families": ["document", "tracker", "twin_export", "linkedin_export"],
        "banned": ["zip_generic", "xlsx", "scrape", "oauth_import_via_this_center"],
        "truth_default": TRUTH,
        "malware_scanner": "unavailable_fail_closed",
        "canonical_mutations_before_approval": 0,
        "first_value": "upload_parse_preview_do_not_satisfy_pilot_first_value_v1",
        "kpi_excluded_until_commit": True,
    }
