"""Candidate Wave 1 — live trust bundle + Hard LIVE evidence (no auto LIVE claims)."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, FeatureFlagState, HardLiveEvidenceRecord, User
from app.services.candidate_consent_service import list_consent_receipts, list_consents
from app.services.candidate_privacy_request_service import list_privacy_requests
from app.services.candidate_trust_audit_service import list_trust_audit_events
from app.services.candidate_trust_center_service import build_trust_center
from app.services.platform_foundations import record_domain_event

logger = logging.getLogger(__name__)

WAVE1_FLAG_DEFAULTS: tuple[tuple[str, bool, str], ...] = (
    ("CANDIDATE_WAVE1_TRUST_LIVE_PATH", True, "Wave 1 trust UIs use real APIs (LIVE badge still smoke-gated)"),
    ("CANDIDATE_WAVE1_HARD_LIVE_REGISTRY", True, "Hard LIVE evidence registry table seeded"),
    (
        "CANDIDATE_WAVE1_EXPORT_LIFECYCLE",
        True,
        "Export preview uses self-serve export.json + privacy-request intake (ops fulfillment separate)",
    ),
    (
        "CANDIDATE_WAVE1_MANUAL_IDENTITY_REVIEW",
        True,
        "Trust identity page = manual review status + KYC configured read; Authologic start stays policy-held",
    ),
    ("MICROSOFT_CALENDAR_WRITE_ENABLED", False, "Hard ban — MS write blocked"),
)

# Modules Wave 1 aims to promote — LIVE only after authenticated prod smoke PASS.
WAVE1_CANDIDATE_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "candidate_consent_receipt", "owner": "candidate-squad"},
    {"module_id": "candidate_control_center", "owner": "candidate-squad"},
    {"module_id": "candidate_correction_request", "owner": "candidate-squad"},
    {"module_id": "candidate_data_portability", "owner": "candidate-squad"},
    {"module_id": "candidate_export_preview", "owner": "candidate-squad"},
    {"module_id": "candidate_identity_verification", "owner": "candidate-squad"},
    {"module_id": "candidate_trust_audit_export", "owner": "candidate-squad"},
    {"module_id": "candidate_trust_overview", "owner": "candidate-squad"},
    {"module_id": "cand_notifications", "owner": "candidate-squad"},
    {"module_id": "cand_preferences", "owner": "candidate-squad"},
    {"module_id": "cand_cv_import", "owner": "candidate-squad"},
    {"module_id": "cand_cv_parsing", "owner": "candidate-squad"},
    {"module_id": "cand_feedback", "owner": "candidate-squad"},
    {"module_id": "cand_match_explanation", "owner": "candidate-squad"},
)

# Policy / provider held — never auto-LIVE in Wave 1.
WAVE1_HELD_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "auto_apply", "blocker": "AUTO_APPLY_PAUSED", "owner": "ops"},
    {"module_id": "cand_ms_calendar", "blocker": "MICROSOFT_WRITE_BLOCKED", "owner": "platform"},
    {"module_id": "plat_identity_kyc", "blocker": "AUTHOLOGIC_CONFIG_DEPENDENT", "owner": "candidate-squad"},
    {"module_id": "candidate_plan", "blocker": "STRIPE_NOT_PUBLIC", "owner": "candidate-squad"},
    {"module_id": "plan_payments", "blocker": "STRIPE_NOT_PUBLIC", "owner": "candidate-squad"},
    {"module_id": "cand_account_deletion", "blocker": "INTERNAL_DSR_PATH", "owner": "privacy"},
    {"module_id": "candidate_revoke_delete", "blocker": "INTERNAL_MODULE", "owner": "privacy"},
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def seed_wave1_flags_and_evidence(db: Session) -> int:
    """Idempotent seed of Wave 1 flags + pending Hard LIVE rows."""
    created = 0
    for flag_key, enabled, notes in WAVE1_FLAG_DEFAULTS:
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
    for item in WAVE1_CANDIDATE_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="candidate",
                    wave="1",
                    status="PENDING_SMOKE",
                    criteria_json=json.dumps({"hard_live_30": "pending_authenticated_prod_smoke"}),
                    blocker="authenticated_prod_smoke_required",
                    owner=item["owner"],
                    notes="Do not mark LIVE until Hard LIVE 30 + prod smoke PASS on aligned SHA.",
                )
            )
            created += 1
    for item in WAVE1_HELD_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="candidate",
                    wave="1",
                    status="HELD_POLICY",
                    criteria_json=json.dumps({"hard_live_30": "held"}),
                    blocker=item["blocker"],
                    owner=item["owner"],
                    notes="Policy/provider hold — not Wave 1 engineering LIVE.",
                )
            )
            created += 1
    if created:
        db.commit()
        logger.info("candidate_wave1_seeded", extra={"created": created})
    return created


def build_live_trust_bundle(db: Session, *, candidate: Candidate, user: User) -> dict[str, Any]:
    """Aggregated live trust payload for Wave 1 UIs — no demo fixtures."""
    trust = build_trust_center(db, candidate=candidate, user=user)
    consents = list_consents(db, candidate=candidate, user=user)
    receipts = list_consent_receipts(db, candidate_id=candidate.id, limit=50, offset=0)
    privacy = list_privacy_requests(db, candidate_id=candidate.id, limit=50, offset=0)
    audit = list_trust_audit_events(db, candidate_id=candidate.id, limit=50, offset=0)
    return {
        "candidate_id": candidate.id,
        "display_name": trust.get("display_name") or user.email.split("@")[0],
        "source": "live",
        "demo_fixture": False,
        "live_claim": False,
        "pilot_stance": "BLOCKED_BY_FOUNDER",
        "trust": trust,
        "consents": consents,
        "consent_receipts": receipts,
        "privacy_requests": privacy,
        "audit_events": audit,
        "communication_preferences": {
            "email_product_updates": bool(user.email_product_updates),
            "email_interview_reminders": bool(user.email_interview_reminders),
            "outbound_to_humans_in_smoke": False,
        },
        "identity": {
            "identity_verified_at": _iso(user.identity_verified_at),
            "fake_kyc_forbidden": True,
            "workflow": "manual_identity_review_status",
            "provider_module": "plat_identity_kyc",
            "provider_held": True,
            "manual_review_request_type": "identity_review",
        },
        "export_lifecycle": {
            "self_serve_path": "/api/v1/candidates/me/export.json",
            "intake_request_type": "export",
            "ops_fulfillment_auto": False,
            "deletion_held": True,
            "preview_demo_forbidden_as_live": True,
        },
        "calendar": {
            "google_path_approved": True,
            "microsoft_write_blocked": True,
            "microsoft_busy_read_default": False,
        },
        "auto_apply_paused": True,
        "manual_processing_notice": trust.get("manual_processing_notice"),
        "generated_at": _utcnow().isoformat(),
    }


def build_activity_timeline(db: Session, *, candidate_id: int, limit: int = 50, offset: int = 0) -> dict[str, Any]:
    """Alias over trust audit events — honest path for /trust/activity-timeline."""
    data = list_trust_audit_events(db, candidate_id=candidate_id, limit=limit, offset=offset)
    items = [
        {
            "id": str(row["id"]),
            "type": row["event_type"],
            "at": _iso(row["created_at"]) if not isinstance(row["created_at"], str) else row["created_at"],
            "summary": row["summary"],
            "actor": row.get("actor"),
        }
        for row in data["items"]
    ]
    return {
        "items": items,
        "total": data["total"],
        "source": "candidate_trust_audit_events",
        "api_alias_of": "/candidates/me/trust/audit-events",
        "live_claim": False,
    }


def list_hard_live_evidence(db: Session, *, persona: str | None = "candidate", wave: str | None = "1") -> dict[str, Any]:
    seed_wave1_flags_and_evidence(db)
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
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "items": [_serialize_evidence(r) for r in rows],
        "counts": {
            "total": len(rows),
            "pending_smoke": sum(1 for r in rows if r.status == "PENDING_SMOKE"),
            "held_policy": sum(1 for r in rows if r.status == "HELD_POLICY"),
            "pass": sum(1 for r in rows if r.status == "PASS"),
        },
    }


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


def mark_evidence_after_smoke(
    db: Session,
    *,
    module_id: str,
    status: str,
    smoke_sha: str | None,
    notes: str | None = None,
    criteria: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Ops-only helper — never auto-PASS Gate F / Launch."""
    if status not in {"PASS", "FAIL", "PENDING_SMOKE", "HELD_POLICY", "PARTIAL"}:
        raise ValueError(f"Invalid evidence status: {status}")
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
        event_name="wave1.hard_live_evidence_updated",
        aggregate_type="hard_live_evidence",
        aggregate_id=module_id,
        payload={"status": status, "smoke_sha": smoke_sha},
    )
    return _serialize_evidence(row)


def wave1_status(db: Session) -> dict[str, Any]:
    seed_wave1_flags_and_evidence(db)
    evidence = list_hard_live_evidence(db)
    return {
        "wave": "1",
        "name": "candidate_complete",
        "live_claim": False,
        "pilot_stance": "BLOCKED_BY_FOUNDER",
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "pmf_evidence": "INSUFFICIENT_DATA",
        "real_candidate_enrollment": "NOT_STARTED",
        "external_pilot_enrollment_enabled": False,
        "auto_apply": "PAUSED",
        "stripe_public": "NOT_LIVE",
        "ats_live_sync": "BLOCKED",
        "microsoft_write": "BLOCKED",
        "evidence": evidence["counts"],
        "checked_at": _utcnow().isoformat(),
    }
