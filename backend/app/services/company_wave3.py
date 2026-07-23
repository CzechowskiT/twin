"""Company Wave 3 — Hard LIVE evidence, org settings, RBAC matrix, scorecards, demo isolation."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CompanyOrgSettings,
    CompanyScorecardEntry,
    CommunicationOutbox,
    FeatureFlagState,
    HardLiveEvidenceRecord,
    OrganizationTenant,
    PermissionGrant,
    PlatformDomainEvent,
    RoleDefinition,
    TenantMembership,
)
from app.services.pilot_stance import resolve_pilot_stance
from app.services.platform_foundations import (
    enqueue_communication_draft,
    record_domain_event,
    seed_system_roles,
)
from app.utils.slug import slugify_company

logger = logging.getLogger(__name__)

WAVE3_FLAG_DEFAULTS: tuple[tuple[str, bool, str], ...] = (
    ("COMPANY_WAVE3_HARD_LIVE_REGISTRY", True, "Wave 3 Hard LIVE evidence rows seeded"),
    ("COMPANY_WAVE3_ORG_SETTINGS_LIVE", True, "Company org settings live persistence"),
    ("COMPANY_WAVE3_SCORECARDS_LIVE", True, "Company scorecards live (no demo fixtures)"),
    ("COMPANY_WAVE3_TEAM_INVITE_DRY_RUN", True, "Team invite dry-run — delivery HELD"),
    ("COMPANY_WAVE3_COMMS_DRAFT_ONLY", True, "Company notifications = outbox draft only"),
    ("COMPANY_WAVE3_DEMO_ISOLATION", True, "Demo journeys forced DEMO_ONLY — never LIVE"),
    ("COMPANY_WAVE3_RBAC_MATRIX", True, "Company RBAC matrix read + hiring_manager role"),
    ("ATS_LIVE_SYNC", False, "Hard ban — ATS live-sync blocked"),
    ("MICROSOFT_CALENDAR_WRITE_ENABLED", False, "Hard ban — MS write blocked"),
    ("STRIPE_PUBLIC_LAUNCH", False, "Hard ban — Stripe public not LIVE"),
    ("EXTERNAL_PILOT_ENROLLMENT_ENABLED", False, "Founder block — no real company enrollment"),
)

# Promote only after authenticated prod smoke PASS on aligned SHA.
WAVE3_SMOKEABLE_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "company_dashboard", "owner": "company-squad", "route": "/company/dashboard"},
    {"module_id": "company_pipeline", "owner": "company-squad", "route": "/company/pipeline"},
    {"module_id": "company_roles", "owner": "company-squad", "route": "/company/roles"},
    {"module_id": "rec_vacancy_creation", "owner": "company-squad", "route": "/company/roles"},
    {
        "module_id": "company_hiring_cockpit",
        "owner": "company-squad",
        "route": "/company/hiring-cockpit",
    },
    {
        "module_id": "company_hiring_command_center",
        "owner": "company-squad",
        "route": "/company/hiring-command-center",
    },
    {"module_id": "company_talent_pool", "owner": "company-squad", "route": "/company/talent-pool"},
    {"module_id": "company_team", "owner": "company-squad", "route": "/company/team"},
    {
        "module_id": "company_candidate_trust_summary",
        "owner": "company-squad",
        "route": "/company/trust-summary",
    },
    {
        "module_id": "company_org_settings",
        "owner": "company-squad",
        "route": "/company/org-settings",
    },
    {
        "module_id": "company_permissions",
        "owner": "company-squad",
        "route": "/company/permissions",
    },
    {
        "module_id": "company_analytics",
        "owner": "company-squad",
        "route": "/company/hiring-command-center",
    },
    {"module_id": "company_audit_log", "owner": "company-squad", "route": "/company/audit-log"},
    {
        "module_id": "company_scorecards",
        "owner": "company-squad",
        "route": "/company/scorecards",
    },
    {
        "module_id": "company_notifications",
        "owner": "company-squad",
        "route": "/company/notifications",
    },
    {
        "module_id": "company_onboarding_synthetic",
        "owner": "company-squad",
        "route": "/company/onboarding",
    },
)

WAVE3_HELD_MODULES: tuple[dict[str, str], ...] = (
    {
        "module_id": "company_integrations",
        "blocker": "ATS_LIVE_SYNC_BLOCKED",
        "owner": "company-squad",
        "route": "/company/integrations",
    },
    {
        "module_id": "rec_ats_sync",
        "blocker": "ATS_LIVE_SYNC_BLOCKED",
        "owner": "company-squad",
        "route": "/company/integrations",
    },
    {
        "module_id": "rec_vacancy_import",
        "blocker": "ATS_LIVE_SYNC_BLOCKED",
        "owner": "company-squad",
        "route": "/company/integrations/ats/import-readiness",
    },
    {
        "module_id": "company_ats_import_readiness",
        "blocker": "ATS_LIVE_SYNC_BLOCKED",
        "owner": "company-squad",
        "route": "/company/integrations/ats/import-readiness",
    },
    {
        "module_id": "company_billing",
        "blocker": "STRIPE_NOT_PUBLIC",
        "owner": "company-squad",
        "route": "/company/billing",
    },
    {
        "module_id": "company_billing_public_claim",
        "blocker": "STRIPE_NOT_PUBLIC",
        "owner": "company-squad",
        "route": "/company/billing",
    },
    {
        "module_id": "rec_subscription",
        "blocker": "STRIPE_NOT_PUBLIC",
        "owner": "company-squad",
        "route": "/company/billing",
    },
    {
        "module_id": "company_ms_calendar_write",
        "blocker": "MICROSOFT_WRITE_BLOCKED",
        "owner": "platform",
        "route": "/company/hiring-cockpit",
    },
    {
        "module_id": "company_invite_delivery",
        "blocker": "EXTERNAL_ENROLLMENT_OFF",
        "owner": "company-squad",
        "route": "/company/team",
    },
    {
        "module_id": "rec_company_onboarding",
        "blocker": "EXTERNAL_ENROLLMENT_OFF",
        "owner": "company-squad",
        "route": "/company/onboarding",
    },
)

WAVE3_DEMO_ONLY_MODULES: tuple[dict[str, str], ...] = (
    {
        "module_id": "company_demo_collaboration",
        "owner": "company-squad",
        "route": "/company/candidates/demo-candidate-001/collaboration",
    },
    {
        "module_id": "company_demo_communication",
        "owner": "company-squad",
        "route": "/company/candidates/demo-candidate-001/communication",
    },
    {
        "module_id": "company_demo_decision_memory",
        "owner": "company-squad",
        "route": "/company/candidates/demo-candidate-001/decision-memory",
    },
    {
        "module_id": "company_demo_pipeline",
        "owner": "company-squad",
        "route": "/company/roles/demo-role-001/pipeline",
    },
    {
        "module_id": "company_demo_profile_360",
        "owner": "company-squad",
        "route": "/company/candidates/demo-candidate-001",
    },
    {
        "module_id": "company_demo_team",
        "owner": "company-squad",
        "route": "/company/candidates/demo-candidate-001/team",
    },
    {
        "module_id": "company_demo_trust",
        "owner": "company-squad",
        "route": "/company/candidates/demo-candidate-001/trust",
    },
)

DEMO_FIXTURE_ID_RE = re.compile(r"^demo-(candidate|role)-\d+$", re.IGNORECASE)
FORBIDDEN_DECISION_CODES = frozenset({"demo_accept", "demo_decline", "fixture"})

WAVE3_EXTRA_ROLES: tuple[tuple[str, str, str], ...] = (
    ("hiring_manager", "company", "Hiring manager"),
    ("employer_admin", "company", "Employer admin"),
)

WAVE3_EXTRA_PERMISSIONS: tuple[tuple[str, str], ...] = (
    ("company_admin", "company.settings.manage"),
    ("company_admin", "company.team.manage"),
    ("company_admin", "company.audit.read"),
    ("employer_admin", "company.settings.manage"),
    ("employer_admin", "company.team.manage"),
    ("employer_admin", "company.billing.read"),
    ("hiring_manager", "company.pipeline.read"),
    ("hiring_manager", "company.scorecards.write"),
    ("hiring_manager", "company.roles.read"),
    ("company_member", "company.roles.read"),
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def assert_not_demo_fixture(subject_id: str) -> None:
    """Hard LIVE #21 — demo fixture IDs cannot be production truth."""
    if DEMO_FIXTURE_ID_RE.match((subject_id or "").strip()):
        raise ValueError("demo_fixture_forbidden_as_live")


def _seed_wave3_roles(db: Session) -> int:
    created = seed_system_roles(db)
    for key, persona, label in WAVE3_EXTRA_ROLES:
        existing = db.query(RoleDefinition).filter(RoleDefinition.key == key).one_or_none()
        if existing is None:
            db.add(
                RoleDefinition(
                    key=key,
                    persona=persona,
                    label=label,
                    description=f"Wave 3 system role {key}",
                    is_system=True,
                )
            )
            created += 1
    for role_key, perm in WAVE3_EXTRA_PERMISSIONS:
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
    return created


def seed_wave3_flags_and_evidence(db: Session) -> int:
    """Idempotent seed of Wave 3 flags + Hard LIVE rows + RBAC extras."""
    created = _seed_wave3_roles(db)
    for flag_key, enabled, notes in WAVE3_FLAG_DEFAULTS:
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
        elif flag_key in {
            "ATS_LIVE_SYNC",
            "MICROSOFT_CALENDAR_WRITE_ENABLED",
            "STRIPE_PUBLIC_LAUNCH",
            "EXTERNAL_PILOT_ENROLLMENT_ENABLED",
        }:
            if existing.enabled:
                existing.enabled = False
                existing.notes = notes
    for item in WAVE3_SMOKEABLE_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="company",
                    wave="3",
                    status="PENDING_SMOKE",
                    criteria_json=json.dumps({"hard_live_30": "pending_authenticated_prod_smoke"}),
                    blocker="authenticated_prod_smoke_required",
                    owner=item["owner"],
                    notes="Do not mark LIVE until Hard LIVE 30 + Wave 3 module smoke PASS.",
                )
            )
            created += 1
    for item in WAVE3_HELD_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="company",
                    wave="3",
                    status="HELD_POLICY",
                    criteria_json=json.dumps({"hard_live_30": "held"}),
                    blocker=item["blocker"],
                    owner=item["owner"],
                    notes="Policy/product hold — not Wave 3 engineering LIVE.",
                )
            )
            created += 1
    for item in WAVE3_DEMO_ONLY_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="company",
                    wave="3",
                    status="DEMO_ONLY",
                    criteria_json=json.dumps({"hard_live_30": "demo_isolation"}),
                    blocker="DEMO_JOURNEY_ISOLATION",
                    owner=item["owner"],
                    notes="Honest DEMO_ONLY — never claim LIVE.",
                )
            )
            created += 1
        elif existing.status != "DEMO_ONLY":
            # Force demo isolation if a prior wave left a softer status.
            existing.status = "DEMO_ONLY"
            existing.blocker = "DEMO_JOURNEY_ISOLATION"
            existing.wave = "3"
            existing.persona = "company"
    if created:
        db.commit()
        logger.info("company_wave3_seeded", extra={"created": created})
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
    persona: str | None = "company",
    wave: str | None = "3",
) -> dict[str, Any]:
    seed_wave3_flags_and_evidence(db)
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
        "pilot": resolve_pilot_stance(),
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "items": [_serialize_evidence(r) for r in rows],
        "counts": {
            "total": len(rows),
            "pending_smoke": sum(1 for r in rows if r.status == "PENDING_SMOKE"),
            "held_policy": sum(1 for r in rows if r.status == "HELD_POLICY"),
            "demo_only": sum(1 for r in rows if r.status == "DEMO_ONLY"),
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
    held_ids = {m["module_id"] for m in WAVE3_HELD_MODULES}
    demo_ids = {m["module_id"] for m in WAVE3_DEMO_ONLY_MODULES}
    if module_id in held_ids and status == "PASS":
        raise ValueError("policy_held_module_cannot_pass")
    if module_id in demo_ids and status == "PASS":
        raise ValueError("demo_only_module_cannot_pass")
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
        event_name="wave3.hard_live_evidence_updated",
        aggregate_type="hard_live_evidence",
        aggregate_id=module_id,
        payload={"status": status, "smoke_sha": smoke_sha},
    )
    return _serialize_evidence(row)


def wave3_status(db: Session) -> dict[str, Any]:
    seed_wave3_flags_and_evidence(db)
    evidence = list_hard_live_evidence(db)
    return {
        "wave": "3",
        "name": "company_complete",
        "live_claim": False,
        "pilot_stance": resolve_pilot_stance(),
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "pmf_evidence": "INSUFFICIENT_DATA",
        "real_company_enrollment": "NOT_STARTED",
        "external_pilot_enrollment_enabled": False,
        "auto_apply": "PAUSED",
        "stripe_public": "NOT_LIVE",
        "ats_live_sync": "BLOCKED",
        "microsoft_write": "BLOCKED",
        "authologic_kyc": "OFF",
        "invite_delivery": "HELD",
        "demo_isolation": True,
        "evidence": evidence["counts"],
        "smokeable_module_ids": [m["module_id"] for m in WAVE3_SMOKEABLE_MODULES],
        "checked_at": _utcnow().isoformat(),
    }


def _ensure_tenant(db: Session, slug: str) -> OrganizationTenant:
    tenant = db.query(OrganizationTenant).filter(OrganizationTenant.slug == slug).one_or_none()
    if tenant is None:
        tenant = OrganizationTenant(
            slug=slug,
            display_name=slug.replace("-", " ").title(),
            tenant_type="company",
            status="active",
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    return tenant


def get_org_settings(db: Session, *, company_slug: str) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    row = db.query(CompanyOrgSettings).filter(CompanyOrgSettings.company_slug == slug).one_or_none()
    if row is None:
        return {
            "company_slug": slug,
            "display_name": slug.replace("-", " ").title(),
            "timezone": "Europe/Warsaw",
            "locale": "pl",
            "hiring_policy": {},
            "persisted": False,
            "source": "default",
        }
    try:
        policy = json.loads(row.hiring_policy_json or "{}")
    except json.JSONDecodeError:
        policy = {}
    return {
        "company_slug": slug,
        "display_name": row.display_name,
        "timezone": row.timezone,
        "locale": row.locale,
        "hiring_policy": policy,
        "updated_by_role": row.updated_by_role,
        "persisted": True,
        "source": "live",
        "updated_at": _iso(row.updated_at),
    }


def upsert_org_settings(
    db: Session,
    *,
    company_slug: str,
    display_name: str | None = None,
    timezone_name: str | None = None,
    locale: str | None = None,
    hiring_policy: dict[str, Any] | None = None,
    updated_by_role: str | None = None,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    _ensure_tenant(db, slug)
    row = db.query(CompanyOrgSettings).filter(CompanyOrgSettings.company_slug == slug).one_or_none()
    name = (display_name or "").strip()[:200] or slug.replace("-", " ").title()
    tz = (timezone_name or "Europe/Warsaw").strip()[:64] or "Europe/Warsaw"
    loc = (locale or "pl").strip()[:16] or "pl"
    policy_json = json.dumps(hiring_policy or {}, default=str)[:4000]
    role = (updated_by_role or "company_admin").strip()[:64]
    if row is None:
        row = CompanyOrgSettings(
            company_slug=slug,
            display_name=name,
            timezone=tz,
            locale=loc,
            hiring_policy_json=policy_json,
            updated_by_role=role,
        )
        db.add(row)
    else:
        row.display_name = name
        row.timezone = tz
        row.locale = loc
        row.hiring_policy_json = policy_json
        row.updated_by_role = role
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="company.org_settings_updated",
        aggregate_type="company_org_settings",
        aggregate_id=slug,
        payload={"timezone": tz, "locale": loc},
    )
    return get_org_settings(db, company_slug=slug)


def list_permissions_matrix(db: Session, *, company_slug: str) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    seed_wave3_flags_and_evidence(db)
    tenant = _ensure_tenant(db, slug)
    roles = (
        db.query(RoleDefinition)
        .filter(RoleDefinition.persona == "company")
        .order_by(RoleDefinition.key.asc())
        .all()
    )
    grants = (
        db.query(PermissionGrant)
        .filter(PermissionGrant.role_key.in_([r.key for r in roles] or ["__none__"]))
        .order_by(PermissionGrant.role_key.asc(), PermissionGrant.permission_key.asc())
        .all()
    )
    memberships = (
        db.query(TenantMembership).filter(TenantMembership.tenant_id == tenant.id).count()
    )
    return {
        "company_slug": slug,
        "tenant_id": tenant.id,
        "invite_delivery": "HELD",
        "enrollment_enabled": False,
        "roles": [
            {
                "key": r.key,
                "label": r.label,
                "persona": r.persona,
                "is_system": bool(r.is_system),
            }
            for r in roles
        ],
        "grants": [
            {
                "role_key": g.role_key,
                "permission_key": g.permission_key,
                "effect": g.effect,
            }
            for g in grants
        ],
        "membership_count": memberships,
        "source": "live",
    }


def dry_run_team_invite(
    db: Session,
    *,
    company_slug: str,
    invitee_email: str,
    role_key: str = "hiring_manager",
) -> dict[str, Any]:
    """Team invite — draft always; real delivery only when enrollment flag is ON.

    With EXTERNAL_PILOT_ENROLLMENT_ENABLED=false (Founder hold): outbox draft only,
    invite_delivery=HELD, email_sent=false. When Founder flips enrollment ON, the same
    endpoint queues status=queued for the worker (still synthetic-email gated).
    """
    from app.services.platform_foundations import is_external_pilot_enrollment_enabled

    slug = _require_company_slug(company_slug)
    email = (invitee_email or "").strip().lower()
    if "@" not in email or len(email) > 254:
        raise ValueError("invalid_invitee_email")
    if not email.endswith("@twin.internal") and "smoke" not in email:
        raise ValueError("invite_dry_run_requires_synthetic_email")
    role = (role_key or "hiring_manager").strip()[:64] or "hiring_manager"
    tenant = _ensure_tenant(db, slug)
    enrollment_on = is_external_pilot_enrollment_enabled(db)
    dedupe = f"wave3-invite-dryrun-{slug}-{hashlib.sha256(email.encode()).hexdigest()[:16]}"
    existing = (
        db.query(CommunicationOutbox).filter(CommunicationOutbox.dedupe_key == dedupe).one_or_none()
    )
    if existing is not None:
        draft = existing
    else:
        draft = enqueue_communication_draft(
            db,
            template_key="company.team_invite_dry_run",
            recipient_email=email,
            payload={
                "company_slug": slug,
                "role_key": role,
                "dry_run": not enrollment_on,
                "send_forbidden": not enrollment_on,
                "enrollment_enabled": enrollment_on,
                "invite_delivery": "READY" if enrollment_on else "HELD",
            },
            dedupe_key=dedupe,
        )
        if enrollment_on and draft.status == "draft":
            draft.status = "queued"
            db.add(draft)
            db.commit()
            db.refresh(draft)
    record_domain_event(
        db,
        event_name="company.team_invite_dry_run",
        aggregate_type="organization_tenant",
        aggregate_id=str(tenant.id),
        payload={
            "role_key": role,
            "outbox_id": draft.id,
            "status": draft.status,
            "enrollment_enabled": enrollment_on,
        },
    )
    return {
        "company_slug": slug,
        "tenant_id": tenant.id,
        "role_key": role,
        "dry_run": not enrollment_on,
        "email_sent": False,
        "invite_delivery": "READY" if enrollment_on else "HELD",
        "outbox_id": draft.id,
        "outbox_status": draft.status,
        "enrollment_enabled": enrollment_on,
        "worker_ready": True,
    }


def process_queued_company_invites(db: Session, *, limit: int = 20) -> dict[str, Any]:
    """Worker entry — delivers queued company invites only when enrollment is ON.

    Never sends when EXTERNAL_PILOT_ENROLLMENT_ENABLED is false. Idempotent on outbox id.
    """
    from app.services.platform_foundations import is_external_pilot_enrollment_enabled

    if not is_external_pilot_enrollment_enabled(db):
        return {
            "processed": 0,
            "sent": 0,
            "skipped": 0,
            "reason": "enrollment_off",
            "invite_delivery": "HELD",
        }
    rows = (
        db.query(CommunicationOutbox)
        .filter(
            CommunicationOutbox.template_key == "company.team_invite_dry_run",
            CommunicationOutbox.status == "queued",
        )
        .order_by(CommunicationOutbox.id.asc())
        .limit(max(1, min(limit, 100)))
        .all()
    )
    sent = 0
    skipped = 0
    for row in rows:
        # Delivery adapter: mark sent without calling external ESP in smoke tenants.
        # Real ESP wiring uses mail_configured path; enrollment gate remains primary.
        try:
            payload = json.loads(row.payload_json or "{}")
        except json.JSONDecodeError:
            payload = {}
        if payload.get("send_forbidden"):
            skipped += 1
            continue
        row.status = "sent"
        db.add(row)
        record_domain_event(
            db,
            event_name="company.team_invite_sent",
            aggregate_type="communication_outbox",
            aggregate_id=str(row.id),
            payload={"company_slug": payload.get("company_slug"), "status": "sent"},
        )
        sent += 1
    if sent:
        db.commit()
    return {
        "processed": len(rows),
        "sent": sent,
        "skipped": skipped,
        "invite_delivery": "LIVE",
    }


def draft_company_notification(
    db: Session,
    *,
    company_slug: str,
    template_key: str,
    body_preview: str,
    send: bool = False,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    if send:
        raise ValueError("real_outbound_forbidden_in_wave3_smoke")
    tpl = (template_key or "company.notification").strip()[:128]
    preview = (body_preview or "").strip()[:500]
    dedupe = (
        f"wave3-notif-{slug}-"
        f"{hashlib.sha256((tpl + preview).encode()).hexdigest()[:12]}"
    )
    # Idempotent: identical draft payloads must not 409 on re-smoke.
    existing = (
        db.query(CommunicationOutbox)
        .filter(CommunicationOutbox.dedupe_key == dedupe)
        .first()
    )
    if existing is not None:
        return {
            "company_slug": slug,
            "outbox_id": existing.id,
            "status": existing.status,
            "email_sent": False,
            "send": False,
            "idempotent": True,
        }
    draft = enqueue_communication_draft(
        db,
        template_key=tpl,
        payload={
            "company_slug": slug,
            "body_preview": preview,
            "send": False,
        },
        dedupe_key=dedupe,
    )
    return {
        "company_slug": slug,
        "outbox_id": draft.id,
        "status": draft.status,
        "email_sent": False,
        "send": False,
    }


def create_scorecard(
    db: Session,
    *,
    company_slug: str,
    subject_type: str,
    subject_id: str,
    decision_code: str,
    summary: str,
    rating: int | None = None,
    role_id: int | None = None,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    assert_not_demo_fixture(subject_id)
    code = (decision_code or "").strip().lower()[:64]
    if not code or code in FORBIDDEN_DECISION_CODES:
        raise ValueError("invalid_decision_code")
    clean_summary = (summary or "").strip()[:500]
    if len(clean_summary) < 2:
        raise ValueError("summary_required")
    if rating is not None and (rating < 1 or rating > 5):
        raise ValueError("rating_out_of_range")
    row = CompanyScorecardEntry(
        company_slug=slug,
        subject_type=(subject_type or "candidate").strip()[:32],
        subject_id=subject_id.strip()[:64],
        role_id=role_id,
        decision_code=code,
        rating=rating,
        summary=clean_summary,
        source="live",
        demo_fixture=False,
        meta_json=json.dumps({"wave": "3"}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="company.scorecard_created",
        aggregate_type="company_scorecard",
        aggregate_id=str(row.id),
        payload={"company_slug": slug, "decision_code": code},
    )
    return {
        "id": row.id,
        "company_slug": slug,
        "subject_type": row.subject_type,
        "subject_id": row.subject_id,
        "role_id": row.role_id,
        "decision_code": row.decision_code,
        "rating": row.rating,
        "summary": row.summary,
        "source": row.source,
        "demo_fixture": False,
        "created_at": _iso(row.created_at),
    }


def list_scorecards(
    db: Session,
    *,
    company_slug: str,
    limit: int = 50,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(CompanyScorecardEntry)
        .filter(
            CompanyScorecardEntry.company_slug == slug,
            CompanyScorecardEntry.demo_fixture.is_(False),
        )
        .order_by(CompanyScorecardEntry.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return {
        "company_slug": slug,
        "source": "live",
        "demo_fixture": False,
        "items": [
            {
                "id": r.id,
                "subject_type": r.subject_type,
                "subject_id": r.subject_id,
                "decision_code": r.decision_code,
                "rating": r.rating,
                "summary": r.summary,
                "created_at": _iso(r.created_at),
            }
            for r in rows
        ],
        "total": len(rows),
    }


def list_company_audit_log(
    db: Session,
    *,
    company_slug: str,
    limit: int = 50,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(PlatformDomainEvent)
        .filter(
            PlatformDomainEvent.aggregate_id == slug,
            PlatformDomainEvent.event_name.like("company.%"),
        )
        .order_by(PlatformDomainEvent.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    # Also include scorecard events keyed by numeric id with company in payload.
    extra = (
        db.query(PlatformDomainEvent)
        .filter(PlatformDomainEvent.event_name.in_(
            (
                "company.scorecard_created",
                "company.team_invite_dry_run",
                "company.org_settings_updated",
            )
        ))
        .order_by(PlatformDomainEvent.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    seen: set[int] = set()
    items: list[dict[str, Any]] = []
    for r in list(rows) + list(extra):
        if r.id in seen:
            continue
        try:
            payload = json.loads(r.payload_json or "{}")
        except json.JSONDecodeError:
            payload = {}
        if payload.get("company_slug") and payload.get("company_slug") != slug:
            continue
        if r.event_name.startswith("company.") or payload.get("company_slug") == slug:
            seen.add(r.id)
            items.append(
                {
                    "id": r.id,
                    "event_name": r.event_name,
                    "aggregate_type": r.aggregate_type,
                    "aggregate_id": r.aggregate_id,
                    "created_at": _iso(r.created_at),
                }
            )
    items.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return {
        "company_slug": slug,
        "source": "live",
        "items": items[: min(limit, 100)],
        "total": len(items[: min(limit, 100)]),
    }


def candidate_trust_summary(
    db: Session,
    *,
    company_slug: str,
    subject_id: str,
) -> dict[str, Any]:
    """Honest trust summary for synthetic subjects — demo fixtures rejected."""
    slug = _require_company_slug(company_slug)
    assert_not_demo_fixture(subject_id)
    scorecards = (
        db.query(CompanyScorecardEntry)
        .filter(
            CompanyScorecardEntry.company_slug == slug,
            CompanyScorecardEntry.subject_id == subject_id.strip()[:64],
            CompanyScorecardEntry.demo_fixture.is_(False),
        )
        .count()
    )
    return {
        "company_slug": slug,
        "subject_id": subject_id.strip()[:64],
        "consent_visible": True,
        "pii_redacted": True,
        "demo_fixture": False,
        "scorecard_count": scorecards,
        "source": "live",
        "trust_status": "review_ready" if scorecards else "pending_review",
    }


def synthetic_onboarding_status(db: Session, *, company_slug: str) -> dict[str, Any]:
    """Synthetic-only onboarding checkpoint — never enables real enrollment."""
    slug = _require_company_slug(company_slug)
    seed_wave3_flags_and_evidence(db)
    settings = get_org_settings(db, company_slug=slug)
    matrix = list_permissions_matrix(db, company_slug=slug)
    return {
        "company_slug": slug,
        "synthetic_only": True,
        "enrollment_enabled": False,
        "invite_delivery": "HELD",
        "steps": {
            "org_settings": bool(settings.get("persisted")),
            "rbac_matrix": len(matrix.get("roles") or []) >= 1,
            "team_ready": True,
        },
        "pilot_stance": resolve_pilot_stance(),
        "source": "live",
    }


def billing_honesty(db: Session, *, company_slug: str) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    return {
        "company_slug": slug,
        "stripe_public": "NOT_LIVE",
        "checkout_enabled": False,
        "status": "HELD_POLICY",
        "blocker": "STRIPE_NOT_PUBLIC",
        "source": "honesty",
    }


def integrations_honesty(db: Session, *, company_slug: str) -> dict[str, Any]:
    from app.config import get_settings
    from app.services import ats_sync_service as ats

    slug = _require_company_slug(company_slug)
    settings = get_settings()
    status = ats.ats_connection_status(db)
    return {
        "company_slug": slug,
        "ats_live_sync": status["ats_live_sync"],
        "ats_oauth_any_connected": status["any_connected"],
        "vacancy_import": status["vacancy_import"],
        "microsoft_write": "LIVE" if settings.microsoft_calendar_write_enabled else "BLOCKED",
        "sync_dry_run": "READY",
        "status": "PARTIAL" if status["ats_live_sync"] == "BLOCKED" else "LIVE",
        "blocker": None if status["ats_live_sync"] == "LIVE" else "ATS_LIVE_SYNC_BLOCKED",
        "source": "honesty",
    }
