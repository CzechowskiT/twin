"""Investor Wave 4 — NDA gate, data room metadata, placement/trust readonly, board readiness.

CORE secure download LIVE via Postgres blob. Wave 4 policy holds cleared after founder reclass.
Smoke must never flip Launch / Gate F / Pilot stance / enrollment.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    DataRoomDocumentMetadata,
    FeatureFlagState,
    HardLiveEvidenceRecord,
    InvestorExternalAttestation,
    InvestorNdaAcceptance,
    User,
)
from app.services.data_room_upload import object_storage_configured
from app.services.platform_foundations import enqueue_communication_draft, record_domain_event

ATTESTATION_STATUSES = frozenset(
    {"PENDING_FOUNDER_SIGNATURE", "SIGNED", "REJECTED"}
)

logger = logging.getLogger(__name__)

CURRENT_NDA_VERSION = "2026-07-22"

WAVE4_FLAG_DEFAULTS: tuple[tuple[str, bool, str], ...] = (
    ("INVESTOR_WAVE4_HARD_LIVE_REGISTRY", True, "Wave 4 Hard LIVE evidence rows seeded"),
    ("INVESTOR_WAVE4_NDA_ACCEPTANCE", True, "NDA accept POST + status GET"),
    ("INVESTOR_WAVE4_DATA_ROOM_METADATA", True, "Data room metadata list — S3 optional"),
    ("INVESTOR_WAVE4_PLACEMENT_READONLY", True, "Read-only placement aggregates"),
    ("INVESTOR_WAVE4_TRUST_READONLY", True, "Read-only trust counters"),
    ("INVESTOR_WAVE4_BOARD_READINESS", True, "Board readiness aggregation"),
    ("ATS_LIVE_SYNC", False, "Hard ban — ATS live-sync blocked"),
    ("MICROSOFT_CALENDAR_WRITE_ENABLED", False, "Hard ban — MS write blocked"),
    ("STRIPE_PUBLIC_LAUNCH", False, "Hard ban — Stripe public not LIVE"),
    ("EXTERNAL_PILOT_ENROLLMENT_ENABLED", False, "Founder block — no real enrollment"),
    ("AUTOLOGIC_AUTO_KYC", False, "Hard ban — Authologic auto KYC OFF"),
)

WAVE4_SMOKEABLE_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "investor_data_room", "owner": "investor-squad", "route": "/investor/data-room"},
    {"module_id": "investor_nda_acceptance", "owner": "investor-squad", "route": "/investor/data-room"},
    {"module_id": "investor_data_room_list", "owner": "investor-squad", "route": "/investor/data-room"},
    {"module_id": "investor_placement_readonly", "owner": "investor-squad", "route": "/investor/placement"},
    {"module_id": "investor_trust_proof_readonly", "owner": "investor-squad", "route": "/investor/trust-proof"},
    {"module_id": "investor_login_gate", "owner": "investor-squad", "route": "/login/investor"},
    {"module_id": "board_implementation_tracker", "owner": "investor-squad", "route": "/board/implementation-tracker"},
    {"module_id": "investor_metrics_wave4", "owner": "investor-squad", "route": "/investor/metrics"},
    {"module_id": "investor_roadmap_wave4", "owner": "investor-squad", "route": "/investor/roadmap"},
    {"module_id": "investor_calculator_wave4", "owner": "investor-squad", "route": "/investor/calculator"},
    {"module_id": "investor_contact_wave4", "owner": "investor-squad", "route": "mailto:contact"},
    {
        "module_id": "investor_product_proof_boundary",
        "owner": "investor-squad",
        "route": "/investor/product-proof",
    },
    {
        "module_id": "investor_external_attestations",
        "owner": "investor-squad",
        "route": "/investor/trust-proof",
    },
    {
        "module_id": "investor_s3_required_download",
        "owner": "investor-squad",
        "route": "/investor/data-room",
    },
    {
        "module_id": "investor_self_serve_enrollment",
        "owner": "investor-squad",
        "route": "/register/investor",
    },
)

# Former policy holds promoted in FE Hard LIVE registry (attestations HITL, secure download,
# enrollment capability with kill-switch OFF). Keep empty so smoke can mark PASS.
WAVE4_HELD_MODULES: tuple[dict[str, str], ...] = ()

WAVE4_FORMER_HELD_MODULE_IDS: frozenset[str] = frozenset(
    {
        "investor_external_attestations",
        "investor_s3_required_download",
        "investor_self_serve_enrollment",
    }
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def seed_flags_and_evidence(db: Session) -> int:
    """Idempotent seed of Wave 4 flags + Hard LIVE rows."""
    created = 0
    hard_ban_keys = {
        "ATS_LIVE_SYNC",
        "MICROSOFT_CALENDAR_WRITE_ENABLED",
        "STRIPE_PUBLIC_LAUNCH",
        "EXTERNAL_PILOT_ENROLLMENT_ENABLED",
        "AUTOLOGIC_AUTO_KYC",
    }
    for flag_key, enabled, notes in WAVE4_FLAG_DEFAULTS:
        existing = (
            db.query(FeatureFlagState)
            .filter(
                FeatureFlagState.flag_key == flag_key,
                FeatureFlagState.scope == "global",
                FeatureFlagState.tenant_id.is_(None),
            )
            .one_or_none()
        )
        if existing is None:
            db.add(
                FeatureFlagState(
                    flag_key=flag_key,
                    enabled=enabled,
                    scope="global",
                    notes=notes,
                )
            )
            created += 1
        elif flag_key in hard_ban_keys and existing.enabled:
            existing.enabled = False
            existing.notes = notes

    for item in WAVE4_SMOKEABLE_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="platform",
                    wave="4",
                    status="PARTIAL",
                    criteria_json=json.dumps(
                        {"hard_live_30": "pending_authenticated_prod_smoke", "route": item["route"]}
                    ),
                    blocker="authenticated_prod_smoke_required",
                    owner=item["owner"],
                    notes="Engineering shipped PARTIAL — do not PASS until authenticated prod smoke.",
                )
            )
            created += 1

    for item in WAVE4_HELD_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="platform",
                    wave="4",
                    status="HELD_POLICY",
                    criteria_json=json.dumps({"hard_live_30": "held", "route": item["route"]}),
                    blocker=item["blocker"],
                    owner=item["owner"],
                    notes="Policy/product hold — not Wave 4 engineering LIVE.",
                )
            )
            created += 1

    # Reconcile former holds → smokeable PASS/PARTIAL (do not invent PASS without smoke_sha).
    for module_id in WAVE4_FORMER_HELD_MODULE_IDS:
        row = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == module_id)
            .one_or_none()
        )
        if row is not None and row.status == "HELD_POLICY":
            row.status = "PARTIAL"
            row.blocker = "authenticated_prod_smoke_required"
            row.notes = (
                "Former policy hold cleared — PARTIAL until authenticated prod smoke marks PASS."
            )
            created += 1

    if created:
        db.commit()
        logger.info("investor_wave4_seeded", extra={"created": created})
    return created


def _serialize_evidence(row: HardLiveEvidenceRecord) -> dict[str, Any]:
    try:
        criteria = json.loads(row.criteria_json or "{}")
    except json.JSONDecodeError:
        criteria = {}
    return {
        "module_id": row.module_id,
        "persona": row.persona,
        "wave": row.wave,
        "status": row.status,
        "criteria": criteria,
        "blocker": row.blocker,
        "owner": row.owner,
        "smoke_sha": row.smoke_sha,
        "smoke_at": _iso(row.smoke_at),
        "notes": row.notes,
        "updated_at": _iso(row.updated_at),
    }


def list_hard_live_evidence(
    db: Session,
    *,
    persona: str | None = "platform",
    wave: str | None = "4",
) -> dict[str, Any]:
    seed_flags_and_evidence(db)
    q = db.query(HardLiveEvidenceRecord)
    if persona:
        q = q.filter(HardLiveEvidenceRecord.persona == persona)
    if wave:
        q = q.filter(HardLiveEvidenceRecord.wave == wave)
    rows = q.order_by(HardLiveEvidenceRecord.module_id.asc()).all()
    return {
        "wave": wave or "all",
        "persona": persona or "all",
        "live_claim_forbidden_until_smoke": True,
        "pilot": "BLOCKED_BY_FOUNDER",
        "gate_f": "PASS",
        "launch": "NO-GO",
        "items": [_serialize_evidence(r) for r in rows],
        "counts": {
            "total": len(rows),
            "partial": sum(1 for r in rows if r.status == "PARTIAL"),
            "held_policy": sum(1 for r in rows if r.status == "HELD_POLICY"),
            "pass": sum(1 for r in rows if r.status == "PASS"),
        },
    }


def mark_evidence_after_smoke(
    db: Session,
    *,
    module_id: str,
    status: str,
    smoke_sha: str | None,
    notes: str | None = None,
    criteria: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if status not in {"PASS", "FAIL", "PENDING_SMOKE", "HELD_POLICY", "PARTIAL", "DEMO_ONLY"}:
        raise ValueError(f"Invalid evidence status: {status}")
    held_ids = {m["module_id"] for m in WAVE4_HELD_MODULES}
    if module_id in held_ids and status == "PASS":
        raise ValueError("policy_held_module_cannot_pass")
    row = (
        db.query(HardLiveEvidenceRecord)
        .filter(HardLiveEvidenceRecord.module_id == module_id)
        .one_or_none()
    )
    if row is None:
        raise ValueError(f"Unknown module_id: {module_id}")
    row.status = status
    row.smoke_sha = smoke_sha
    row.smoke_at = _utcnow() if status in {"PASS", "FAIL", "PARTIAL"} else None
    if notes:
        row.notes = notes[:2000]
    if criteria is not None:
        row.criteria_json = json.dumps(criteria, default=str)[:8000]
    if status == "PASS":
        row.blocker = None
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="wave4.hard_live_evidence_updated",
        aggregate_type="hard_live_evidence",
        aggregate_id=module_id,
        payload={"status": status, "smoke_sha": smoke_sha},
    )
    return _serialize_evidence(row)


def wave4_status(db: Session) -> dict[str, Any]:
    from app.config import get_settings

    seed_flags_and_evidence(db)
    evidence = list_hard_live_evidence(db)
    settings = get_settings()
    signed = _signed_attestation_count(db)
    return {
        "wave": "4",
        "name": "investor_complete",
        "live_claim": False,
        "pilot_stance": "BLOCKED_BY_FOUNDER",
        "gate_f": "PASS",
        "launch": "NO-GO",
        "pmf_evidence": "INSUFFICIENT_DATA",
        "real_enrollment": "NOT_STARTED",
        "external_pilot_enrollment_enabled": False,
        "auto_apply": "PAUSED",
        "stripe_public": "NOT_LIVE",
        "ats_live_sync": "BLOCKED",
        "microsoft_write": "BLOCKED",
        "microsoft_calendar_write_enabled": False,
        "microsoft_busy_read_enabled": bool(settings.microsoft_busy_read_enabled),
        "microsoft_busy_read": (
            "LIVE" if settings.microsoft_busy_read_enabled else "READY_FLAG_OFF"
        ),
        "authologic_kyc": "OFF",
        "nda_version_current": CURRENT_NDA_VERSION,
        "s3_configured": object_storage_configured(),
        "secure_download": "METADATA_ONLY_UNLESS_S3",
        "verified_customer_claims": signed >= 1,
        "signed_attestation_count": signed,
        "evidence": evidence["counts"],
        "smokeable_module_ids": [m["module_id"] for m in WAVE4_SMOKEABLE_MODULES],
        "held_module_ids": [m["module_id"] for m in WAVE4_HELD_MODULES],
        "checked_at": _utcnow().isoformat(),
    }


def policy_holds() -> dict[str, Any]:
    return {
        "auto_apply": "PAUSED",
        "stripe_public": "NOT_LIVE",
        "ats_live_sync": "BLOCKED",
        "microsoft_calendar_write": "BLOCKED",
        "microsoft_busy_read_separate_from_write": True,
        "authologic_auto_kyc": "OFF",
        "external_pilot_enrollment": False,
        "external_attestations": "HITL_FOUNDER_SIGNATURE_REQUIRED",
        "self_serve_investor_enrollment": "NOT_STARTED",
        "pilot": "BLOCKED_BY_FOUNDER",
        "gate_f": "PASS",
        "launch": "NO-GO",
        "founder_command": "NOT_USED",
        "product_agent": "NOT_USED",
        "real_invites": "FORBIDDEN",
    }


def _signed_attestation_count(db: Session) -> int:
    return (
        db.query(InvestorExternalAttestation)
        .filter(InvestorExternalAttestation.status == "SIGNED")
        .count()
    )


def _serialize_attestation(row: InvestorExternalAttestation) -> dict[str, Any]:
    return {
        "id": row.id,
        "subject_label": row.subject_label,
        "claim_text": row.claim_text,
        "status": row.status,
        "evidence_ref": row.evidence_ref,
        "signed_by": row.signed_by,
        "signed_at": _iso(row.signed_at),
        "created_by_user_id": row.created_by_user_id,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def create_external_attestation(
    db: Session,
    *,
    user: User,
    subject_label: str,
    claim_text: str,
    evidence_ref: str | None = None,
) -> dict[str, Any]:
    """Queue a founder-signature attestation — never auto-marks verified claims."""
    label = (subject_label or "").strip()
    claim = (claim_text or "").strip()
    if not label:
        raise ValueError("subject_label_required")
    if not claim:
        raise ValueError("claim_text_required")
    row = InvestorExternalAttestation(
        subject_label=label[:255],
        claim_text=claim[:8000],
        status="PENDING_FOUNDER_SIGNATURE",
        evidence_ref=(evidence_ref or "").strip()[:512] or None,
        created_by_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="wave4.external_attestation_created",
        aggregate_type="investor_external_attestation",
        aggregate_id=str(row.id),
        actor_user_id=user.id,
        payload={"status": row.status, "subject_label": row.subject_label},
    )
    enqueue_communication_draft(
        db,
        template_key="investor.external_attestation.pending_founder",
        recipient_user_id=user.id,
        payload={"attestation_id": row.id, "status": row.status},
        dedupe_key=f"investor_attestation_pending:{row.id}",
    )
    return _serialize_attestation(row)


def list_external_attestations(
    db: Session,
    *,
    status: str | None = None,
) -> dict[str, Any]:
    seed_flags_and_evidence(db)
    q = db.query(InvestorExternalAttestation)
    if status:
        if status not in ATTESTATION_STATUSES:
            raise ValueError("invalid_attestation_status")
        q = q.filter(InvestorExternalAttestation.status == status)
    rows = q.order_by(InvestorExternalAttestation.id.desc()).all()
    signed = _signed_attestation_count(db)
    return {
        "items": [_serialize_attestation(r) for r in rows],
        "count": len(rows),
        "signed_count": signed,
        "verified_customer_claims": signed >= 1,
        "module_status": "HELD_POLICY",
        "blocker": "NO_VERIFIED_CUSTOMER_CLAIMS" if signed < 1 else None,
        "honesty": "founder_signature_required_no_fake_claims",
    }


def sign_external_attestation(
    db: Session,
    *,
    user: User,
    attestation_id: int,
    signed_by: str,
) -> dict[str, Any]:
    signer = (signed_by or "").strip()
    if not signer:
        raise ValueError("signed_by_required")
    row = (
        db.query(InvestorExternalAttestation)
        .filter(InvestorExternalAttestation.id == attestation_id)
        .one_or_none()
    )
    if row is None:
        raise ValueError("attestation_not_found")
    if row.status == "REJECTED":
        raise ValueError("attestation_already_rejected")
    if row.status == "SIGNED":
        return _serialize_attestation(row)
    if row.status != "PENDING_FOUNDER_SIGNATURE":
        raise ValueError("attestation_not_pending")
    row.status = "SIGNED"
    row.signed_by = signer[:255]
    row.signed_at = _utcnow()
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="wave4.external_attestation_signed",
        aggregate_type="investor_external_attestation",
        aggregate_id=str(row.id),
        actor_user_id=user.id,
        payload={"signed_by": row.signed_by, "status": row.status},
    )
    enqueue_communication_draft(
        db,
        template_key="investor.external_attestation.signed",
        recipient_user_id=user.id,
        payload={"attestation_id": row.id, "signed_by": row.signed_by},
        dedupe_key=f"investor_attestation_signed:{row.id}",
    )
    return _serialize_attestation(row)


def reject_external_attestation(
    db: Session,
    *,
    user: User,
    attestation_id: int,
) -> dict[str, Any]:
    row = (
        db.query(InvestorExternalAttestation)
        .filter(InvestorExternalAttestation.id == attestation_id)
        .one_or_none()
    )
    if row is None:
        raise ValueError("attestation_not_found")
    if row.status == "SIGNED":
        raise ValueError("attestation_already_signed")
    if row.status == "REJECTED":
        return _serialize_attestation(row)
    row.status = "REJECTED"
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="wave4.external_attestation_rejected",
        aggregate_type="investor_external_attestation",
        aggregate_id=str(row.id),
        actor_user_id=user.id,
        payload={"status": row.status},
    )
    return _serialize_attestation(row)


def record_nda_acceptance(
    db: Session,
    *,
    user: User,
    nda_version: str,
    ip_hint: str | None = None,
    user_agent_hint: str | None = None,
) -> dict[str, Any]:
    version = (nda_version or "").strip()
    if not version:
        raise ValueError("nda_version_required")
    if version != CURRENT_NDA_VERSION:
        raise ValueError("nda_version_mismatch")
    ip_hash = hashlib.sha256((ip_hint or "").encode()).hexdigest() if ip_hint else None
    ua_hash = hashlib.sha256((user_agent_hint or "").encode()).hexdigest() if user_agent_hint else None
    existing = (
        db.query(InvestorNdaAcceptance)
        .filter(
            InvestorNdaAcceptance.user_id == user.id,
            InvestorNdaAcceptance.nda_version == version,
        )
        .one_or_none()
    )
    if existing is None:
        row = InvestorNdaAcceptance(
            user_id=user.id,
            nda_version=version,
            ip_hash=ip_hash,
            user_agent_hash=ua_hash,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    else:
        row = existing
    record_domain_event(
        db,
        event_name="wave4.nda_accepted",
        aggregate_type="investor_nda",
        aggregate_id=str(user.id),
        payload={"nda_version": version},
    )
    return {
        "accepted": True,
        "nda_version": row.nda_version,
        "accepted_at": _iso(row.accepted_at),
        "user_id": user.id,
    }


def nda_status(db: Session, *, user: User) -> dict[str, Any]:
    seed_flags_and_evidence(db)
    row = (
        db.query(InvestorNdaAcceptance)
        .filter(
            InvestorNdaAcceptance.user_id == user.id,
            InvestorNdaAcceptance.nda_version == CURRENT_NDA_VERSION,
        )
        .one_or_none()
    )
    return {
        "nda_version_current": CURRENT_NDA_VERSION,
        "accepted": row is not None,
        "accepted_at": _iso(row.accepted_at) if row else None,
        "required_before_data_room_upload": True,
    }


def list_data_room_documents(db: Session, *, user: User) -> dict[str, Any]:
    seed_flags_and_evidence(db)
    from app.services import data_room_upload as dr_upload

    rows = (
        db.query(DataRoomDocumentMetadata)
        .filter(DataRoomDocumentMetadata.user_id == user.id)
        .order_by(DataRoomDocumentMetadata.created_at.desc())
        .all()
    )
    s3 = object_storage_configured()
    backend = dr_upload.storage_backend_status()
    return {
        "items": [
            {
                "id": r.id,
                "category": r.category,
                "filename": r.filename,
                "content_type": r.content_type,
                "size_bytes": r.size_bytes,
                "status": r.status,
                "storage_key_present": bool(r.storage_key),
                "download_available": dr_upload.document_download_available(db, row=r),
                "download_path": f"/api/v1/investor/data-room/documents/{r.id}/download",
                "created_at": _iso(r.created_at),
            }
            for r in rows
        ],
        "count": len(rows),
        "s3_configured": s3,
        "s3_optional_integration": True,
        "secure_download_held": False,
        "secure_download_live": True,
        "persistent_storage": backend,
        "metadata_only_honesty": False,
        "honesty": (
            "CORE_PILOT secure download via authenticated GET + Postgres blob "
            "(optional S3 when configured). Not ephemeral-only."
        ),
    }


def placement_readonly_summary(db: Session) -> dict[str, Any]:
    seed_flags_and_evidence(db)
    try:
        from app.database.models import PlacementEvent

        total = db.query(PlacementEvent).count()
        by_type: dict[str, int] = {}
        for event_type, in db.query(PlacementEvent.event_type).distinct().all():
            if event_type:
                by_type[event_type] = (
                    db.query(PlacementEvent).filter(PlacementEvent.event_type == event_type).count()
                )
        return {
            "total_events": total,
            "by_event_type": by_type,
            "write_forbidden": True,
            "source": "placement_events",
        }
    except Exception:
        return {
            "total_events": 0,
            "by_event_type": {},
            "write_forbidden": True,
            "source": "unavailable",
        }


def trust_proof_readonly_summary(db: Session) -> dict[str, Any]:
    seed_flags_and_evidence(db)
    signed = _signed_attestation_count(db)
    pending = (
        db.query(InvestorExternalAttestation)
        .filter(InvestorExternalAttestation.status == "PENDING_FOUNDER_SIGNATURE")
        .count()
    )
    counters: dict[str, int | str | bool] = {
        "external_attestations": "HITL_QUEUE",
        "verified_customer_claims": signed >= 1,
        "signed_attestation_count": signed,
        "pending_founder_signature_count": pending,
    }
    try:
        from app.database.models import AuditEvent

        counters["audit_events"] = db.query(AuditEvent).count()
    except Exception:
        counters["audit_events"] = 0
    try:
        from app.database.models import CandidateConsentReceipt

        counters["consent_receipts"] = db.query(CandidateConsentReceipt).count()
    except Exception:
        counters["consent_receipts"] = 0
    return {
        "counters": counters,
        "verified_customer_claims": signed >= 1,
        "readonly": True,
        "launch": "NO-GO",
        "pilot": "BLOCKED_BY_FOUNDER",
        "honesty": "no_fake_customer_claims_without_signed_attestation",
    }


def board_readiness_snapshot(db: Session) -> dict[str, Any]:
    seed_flags_and_evidence(db)
    evidence = list_hard_live_evidence(db)
    return {
        "implementation_tracker_route": "/board/implementation-tracker",
        "hub_hidden_from_investor_default": True,
        "wave4_partial_modules": evidence["counts"]["partial"],
        "wave4_held_modules": evidence["counts"]["held_policy"],
        "policy_holds": policy_holds(),
        "launch": "NO-GO",
        "gate_f": "PASS",
        "live_claim": False,
    }
