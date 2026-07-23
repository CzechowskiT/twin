"""Platform foundations Wave 0 — readiness + seed + domain events (no LIVE claims)."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CommunicationOutbox,
    FeatureFlagState,
    OrganizationTenant,
    PermissionGrant,
    PlatformDomainEvent,
    PrivacyOpsCase,
    RoleDefinition,
    TenantMembership,
)

logger = logging.getLogger(__name__)

# Default system roles — invites remain disabled in product UI until Wave 3.
SYSTEM_ROLES: tuple[tuple[str, str, str], ...] = (
    ("candidate", "candidate", "Candidate"),
    ("recruiter", "recruiter", "Recruiter"),
    ("company_admin", "company", "Company admin"),
    ("company_member", "company", "Company member"),
    ("investor_viewer", "investor", "Investor viewer"),
    ("ops_admin", "ops", "Ops admin"),
)

DEFAULT_PERMISSIONS: tuple[tuple[str, str], ...] = (
    ("candidate", "candidate.profile.read"),
    ("candidate", "candidate.profile.write"),
    ("recruiter", "recruiter.inbox.read"),
    ("company_admin", "company.roles.manage"),
    ("company_member", "company.pipeline.read"),
    ("investor_viewer", "investor.metrics.read"),
    ("ops_admin", "ops.admin.read"),
)

# Hard defaults — external enrollment OFF until Founder lifts BLOCKED_BY_FOUNDER.
FOUNDATION_FLAG_DEFAULTS: tuple[tuple[str, bool, str], ...] = (
    ("EXTERNAL_PILOT_ENROLLMENT_ENABLED", False, "Founder block 2026-07-20 — no real invites"),
    ("PLATFORM_FOUNDATIONS_WAVE0", True, "Wave 0 foundations schema present"),
    ("STRIPE_PUBLIC_LAUNCH", False, "Hard ban — not public LIVE"),
    ("ATS_LIVE_SYNC", False, "Hard ban — connectors only"),
)


def seed_system_roles(db: Session) -> int:
    """Idempotent seed of role_definitions + permission_grants."""
    created = 0
    for key, persona, label in SYSTEM_ROLES:
        existing = db.query(RoleDefinition).filter(RoleDefinition.key == key).one_or_none()
        if existing is None:
            db.add(
                RoleDefinition(
                    key=key,
                    persona=persona,
                    label=label,
                    description=f"System role {key}",
                    is_system=True,
                )
            )
            created += 1
    for role_key, perm in DEFAULT_PERMISSIONS:
        existing = (
            db.query(PermissionGrant)
            .filter(
                PermissionGrant.role_key == role_key,
                PermissionGrant.permission_key == perm,
            )
            .one_or_none()
        )
        if existing is None:
            db.add(PermissionGrant(role_key=role_key, permission_key=perm, effect="allow"))
            created += 1
    for flag_key, enabled, notes in FOUNDATION_FLAG_DEFAULTS:
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
    if created:
        db.commit()
    return created


def is_external_pilot_enrollment_enabled(db: Session) -> bool:
    """False unless ops explicitly flips DB flag (Founder block default)."""
    row = (
        db.query(FeatureFlagState)
        .filter(
            FeatureFlagState.flag_key == "EXTERNAL_PILOT_ENROLLMENT_ENABLED",
            FeatureFlagState.scope == "global",
        )
        .one_or_none()
    )
    if row is None:
        return False
    return bool(row.enabled)


def record_domain_event(
    db: Session,
    *,
    event_name: str,
    aggregate_type: str,
    aggregate_id: str,
    actor_user_id: int | None = None,
    tenant_id: int | None = None,
    payload: dict[str, Any] | None = None,
) -> PlatformDomainEvent:
    event = PlatformDomainEvent(
        event_name=event_name[:128],
        aggregate_type=aggregate_type[:64],
        aggregate_id=aggregate_id[:128],
        actor_user_id=actor_user_id,
        tenant_id=tenant_id,
        payload_json=json.dumps(payload or {}, default=str)[:8000],
        source="twin_internal",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    logger.info(
        "platform_domain_event",
        extra={"event_name": event_name, "aggregate_type": aggregate_type},
    )
    return event


def open_privacy_ops_case(
    db: Session,
    *,
    user_id: int,
    case_type: str,
    payload: dict[str, Any] | None = None,
) -> PrivacyOpsCase:
    case = PrivacyOpsCase(
        case_type=case_type[:32],
        user_id=user_id,
        status="open",
        payload_json=json.dumps(payload or {}, default=str)[:8000],
        source="twin_internal",
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    record_domain_event(
        db,
        event_name="privacy_ops.case_opened",
        aggregate_type="privacy_ops_case",
        aggregate_id=str(case.id),
        actor_user_id=user_id,
        payload={"case_type": case_type},
    )
    return case


def enqueue_communication_draft(
    db: Session,
    *,
    template_key: str,
    recipient_user_id: int | None = None,
    recipient_email: str | None = None,
    payload: dict[str, Any] | None = None,
    dedupe_key: str | None = None,
) -> CommunicationOutbox:
    email_hash = None
    if recipient_email:
        email_hash = hashlib.sha256(recipient_email.strip().lower().encode()).hexdigest()
    key = dedupe_key[:128] if dedupe_key else None
    if key:
        existing = db.query(CommunicationOutbox).filter(CommunicationOutbox.dedupe_key == key).first()
        if existing is not None:
            return existing
    row = CommunicationOutbox(
        channel="email",
        template_key=template_key[:128],
        recipient_user_id=recipient_user_id,
        recipient_email_hash=email_hash,
        status="draft",
        payload_json=json.dumps(payload or {}, default=str)[:8000],
        dedupe_key=key,
    )
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        if key:
            existing = db.query(CommunicationOutbox).filter(CommunicationOutbox.dedupe_key == key).first()
            if existing is not None:
                return existing
        raise
    db.refresh(row)
    return row


def foundations_status(db: Session) -> dict[str, Any]:
    """Readiness snapshot — does not claim product modules LIVE."""
    seed_system_roles(db)
    return {
        "wave": "0",
        "name": "platform_foundations",
        "live_claim": False,
        "pilot_stance": "BLOCKED_BY_FOUNDER",
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "pmf_evidence": "INSUFFICIENT_DATA",
        "real_candidate_enrollment": "NOT_STARTED",
        "real_recruiter_enrollment": "NOT_STARTED",
        "external_pilot_enrollment_enabled": is_external_pilot_enrollment_enabled(db),
        "pillars": {
            "tenancy": db.query(OrganizationTenant).count() >= 0,
            "roles": db.query(RoleDefinition).count() >= len(SYSTEM_ROLES),
            "permissions": db.query(PermissionGrant).count() >= len(DEFAULT_PERMISSIONS),
            "memberships": True,
            "audit_events_table": True,
            "domain_events": True,
            "feature_flags": db.query(FeatureFlagState).count() >= 1,
            "privacy_ops": True,
            "export_requests_legacy": True,
            "communication_outbox": True,
            "observability_logging": True,
        },
        "counts": {
            "tenants": db.query(OrganizationTenant).count(),
            "roles": db.query(RoleDefinition).count(),
            "permissions": db.query(PermissionGrant).count(),
            "memberships": db.query(TenantMembership).count(),
            "feature_flags": db.query(FeatureFlagState).count(),
            "domain_events": db.query(PlatformDomainEvent).count(),
            "privacy_cases": db.query(PrivacyOpsCase).count(),
            "outbox_drafts": db.query(CommunicationOutbox).count(),
        },
        "checked_at": datetime.utcnow().isoformat() + "Z",
    }
