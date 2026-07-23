"""Recruiter Wave 2 — Hard LIVE evidence, decision memory, team invite dry-run, demo isolation."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Application,
    CommunicationOutbox,
    FeatureFlagState,
    HardLiveEvidenceRecord,
    Job,
    OrganizationTenant,
    RecruiterDecisionMemoryEntry,
    TenantMembership,
)
from app.services.pilot_stance import resolve_pilot_stance
from app.services.platform_foundations import enqueue_communication_draft, record_domain_event
from app.utils.slug import slugify_company

logger = logging.getLogger(__name__)

WAVE2_FLAG_DEFAULTS: tuple[tuple[str, bool, str], ...] = (
    ("RECRUITER_WAVE2_HARD_LIVE_REGISTRY", True, "Wave 2 Hard LIVE evidence rows seeded"),
    ("RECRUITER_WAVE2_DECISION_MEMORY_LIVE", True, "Live decision memory API (no demo fixtures)"),
    ("RECRUITER_WAVE2_TEAM_INVITE_DRY_RUN", True, "Team invite dry-run — no real email outbound"),
    ("RECRUITER_WAVE2_COMMS_DRAFT_ONLY", True, "Recruiter comms = outbox draft only; no smoke send"),
    ("RECRUITER_WAVE2_DEMO_ISOLATION", True, "Demo journeys forced DEMO_ONLY — never LIVE"),
    ("ATS_LIVE_SYNC", False, "Hard ban — ATS live-sync blocked"),
    ("MICROSOFT_CALENDAR_WRITE_ENABLED", False, "Hard ban — MS write blocked"),
    ("EXTERNAL_PILOT_ENROLLMENT_ENABLED", False, "Founder block — no real recruiter enrollment"),
)

# Promote only after authenticated prod smoke PASS on aligned SHA.
WAVE2_SMOKEABLE_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "recruiter_talent_radar", "owner": "recruiter-squad", "route": "/recruiter/talent-radar"},
    {
        "module_id": "recruiter_talent_radar_digest",
        "owner": "recruiter-squad",
        "route": "/recruiter/talent-radar/digest",
    },
    {
        "module_id": "recruiter_talent_pool_import",
        "owner": "recruiter-squad",
        "route": "/recruiter/talent-pool/import",
    },
    {"module_id": "rec_scorecards", "owner": "recruiter-squad", "route": "/recruiter/inbox"},
    {"module_id": "rec_notes", "owner": "recruiter-squad", "route": "/recruiter/inbox"},
    {"module_id": "rec_matching", "owner": "recruiter-squad", "route": "/recruiter/search"},
    {
        "module_id": "rec_hiring_funnel_analytics",
        "owner": "recruiter-squad",
        "route": "/recruiter/analytics",
    },
    {"module_id": "recruiter_jobs", "owner": "recruiter-squad", "route": "/recruiter/jobs"},
    {"module_id": "recruiter_inbox", "owner": "recruiter-squad", "route": "/recruiter/inbox"},
    {"module_id": "recruiter_pipeline", "owner": "recruiter-squad", "route": "/recruiter/pipeline"},
    {"module_id": "recruiter_search", "owner": "recruiter-squad", "route": "/recruiter/search"},
    {"module_id": "recruiter_talent_pool", "owner": "recruiter-squad", "route": "/recruiter/talent-pool"},
    {"module_id": "recruiter_analytics", "owner": "recruiter-squad", "route": "/recruiter/analytics"},
    {
        "module_id": "recruiter_notification_preferences",
        "owner": "recruiter-squad",
        "route": "/recruiter/notification-preferences",
    },
    {
        "module_id": "recruiter_activity_timeline",
        "owner": "recruiter-squad",
        "route": "/recruiter/activity-timeline",
    },
    {
        "module_id": "recruiter_trust_review_queue",
        "owner": "recruiter-squad",
        "route": "/recruiter/trust-review-queue",
    },
    {"module_id": "recruiter_saved_views", "owner": "recruiter-squad", "route": "/recruiter/inbox"},
    {"module_id": "rec_decisioning", "owner": "recruiter-squad", "route": "/recruiter/inbox"},
    {"module_id": "rec_shortlist", "owner": "recruiter-squad", "route": "/recruiter/inbox"},
    {"module_id": "recruiter_daily_cockpit", "owner": "recruiter-squad", "route": "/recruiter/daily-cockpit"},
)

WAVE2_HELD_MODULES: tuple[dict[str, str], ...] = (
    {
        "module_id": "rec_interview_scheduling",
        "blocker": "RECRUITER_CALENDAR_BLOCKED",
        "owner": "recruiter-squad",
    },
    {
        "module_id": "recruiter_calendar",
        "blocker": "MICROSOFT_WRITE_BLOCKED",
        "owner": "platform",
    },
    {
        "module_id": "recruiter_integrations",
        "blocker": "ATS_LIVE_SYNC_BLOCKED",
        "owner": "recruiter-squad",
    },
    {
        "module_id": "investor_sor_proof_ats",
        "blocker": "ATS_LIVE_SYNC_BLOCKED",
        "owner": "recruiter-squad",
    },
    {
        "module_id": "rec_recruiter_onboarding",
        "blocker": "EXTERNAL_ENROLLMENT_OFF",
        "owner": "recruiter-squad",
    },
    {"module_id": "rec_sla_tracking", "blocker": "NOT_BUILT", "owner": "recruiter-squad"},
)

WAVE2_DEMO_ONLY_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "rec_candidate_comms", "owner": "recruiter-squad"},
    {"module_id": "rec_collaboration", "owner": "recruiter-squad"},
    {"module_id": "recruiter_demo_collaboration", "owner": "recruiter-squad"},
    {"module_id": "recruiter_demo_communication", "owner": "recruiter-squad"},
    {"module_id": "recruiter_demo_decision_memory", "owner": "recruiter-squad"},
    {"module_id": "recruiter_demo_pipeline", "owner": "recruiter-squad"},
    {"module_id": "recruiter_demo_profile_360", "owner": "recruiter-squad"},
    {"module_id": "recruiter_demo_team", "owner": "recruiter-squad"},
    {"module_id": "recruiter_demo_trust", "owner": "recruiter-squad"},
    {"module_id": "investor_sor_proof_collaboration", "owner": "recruiter-squad"},
    {"module_id": "investor_sor_proof_pipeline", "owner": "recruiter-squad"},
)

DEMO_FIXTURE_ID_RE = re.compile(r"^demo-(candidate|role)-\d+$", re.IGNORECASE)
FORBIDDEN_DECISION_CODES = frozenset({"demo_accept", "demo_decline", "fixture"})


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


def seed_wave2_flags_and_evidence(db: Session) -> int:
    """Idempotent seed of Wave 2 flags + Hard LIVE rows."""
    created = 0
    for flag_key, enabled, notes in WAVE2_FLAG_DEFAULTS:
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
            "EXTERNAL_PILOT_ENROLLMENT_ENABLED",
        }:
            # Never flip policy holds even if a prior seed set True.
            if existing.enabled:
                existing.enabled = False
                existing.notes = notes
    for item in WAVE2_SMOKEABLE_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="recruiter",
                    wave="2",
                    status="PENDING_SMOKE",
                    criteria_json=json.dumps({"hard_live_30": "pending_authenticated_prod_smoke"}),
                    blocker="authenticated_prod_smoke_required",
                    owner=item["owner"],
                    notes="Do not mark LIVE until Hard LIVE 30 + Wave 2 module smoke PASS.",
                )
            )
            created += 1
    for item in WAVE2_HELD_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="recruiter",
                    wave="2",
                    status="HELD_POLICY",
                    criteria_json=json.dumps({"hard_live_30": "held"}),
                    blocker=item["blocker"],
                    owner=item["owner"],
                    notes="Policy/product hold — not Wave 2 engineering LIVE.",
                )
            )
            created += 1
    for item in WAVE2_DEMO_ONLY_MODULES:
        existing = (
            db.query(HardLiveEvidenceRecord)
            .filter(HardLiveEvidenceRecord.module_id == item["module_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="recruiter",
                    wave="2",
                    status="DEMO_ONLY",
                    criteria_json=json.dumps({"hard_live_30": "demo_isolation"}),
                    blocker="DEMO_JOURNEY_ISOLATION",
                    owner=item["owner"],
                    notes="Honest DEMO_ONLY — never claim LIVE.",
                )
            )
            created += 1
    if created:
        db.commit()
        logger.info("recruiter_wave2_seeded", extra={"created": created})
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
    persona: str | None = "recruiter",
    wave: str | None = "2",
) -> dict[str, Any]:
    seed_wave2_flags_and_evidence(db)
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
    # Never promote DEMO or policy-held via accidental PASS.
    held_ids = {m["module_id"] for m in WAVE2_HELD_MODULES}
    demo_ids = {m["module_id"] for m in WAVE2_DEMO_ONLY_MODULES}
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
        event_name="wave2.hard_live_evidence_updated",
        aggregate_type="hard_live_evidence",
        aggregate_id=module_id,
        payload={"status": status, "smoke_sha": smoke_sha},
    )
    return _serialize_evidence(row)


def wave2_status(db: Session) -> dict[str, Any]:
    seed_wave2_flags_and_evidence(db)
    evidence = list_hard_live_evidence(db)
    return {
        "wave": "2",
        "name": "recruiter_complete",
        "live_claim": False,
        "pilot_stance": resolve_pilot_stance(),
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "pmf_evidence": "INSUFFICIENT_DATA",
        "real_recruiter_enrollment": "NOT_STARTED",
        "external_pilot_enrollment_enabled": False,
        "auto_apply": "PAUSED",
        "stripe_public": "NOT_LIVE",
        "ats_live_sync": "BLOCKED",
        "microsoft_write": "BLOCKED",
        "authologic_kyc": "OFF",
        "demo_isolation": True,
        "evidence": evidence["counts"],
        "smokeable_module_ids": [m["module_id"] for m in WAVE2_SMOKEABLE_MODULES],
        "checked_at": _utcnow().isoformat(),
    }


def _serialize_decision(row: RecruiterDecisionMemoryEntry) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_slug": row.company_slug,
        "subject_type": row.subject_type,
        "subject_id": row.subject_id,
        "application_id": row.application_id,
        "decision_code": row.decision_code,
        "summary": row.summary,
        "rationale_code": row.rationale_code,
        "source": row.source,
        "demo_fixture": bool(row.demo_fixture),
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def list_decision_memory(
    db: Session,
    *,
    company_slug: str,
    subject_type: str | None = None,
    subject_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    q = db.query(RecruiterDecisionMemoryEntry).filter(
        RecruiterDecisionMemoryEntry.company_slug == slug,
        RecruiterDecisionMemoryEntry.demo_fixture.is_(False),
    )
    if subject_type:
        q = q.filter(RecruiterDecisionMemoryEntry.subject_type == subject_type[:32])
    if subject_id:
        assert_not_demo_fixture(subject_id)
        q = q.filter(RecruiterDecisionMemoryEntry.subject_id == subject_id[:64])
    rows = q.order_by(RecruiterDecisionMemoryEntry.created_at.desc()).limit(min(limit, 100)).all()
    return {
        "company_slug": slug,
        "source": "live",
        "demo_fixture": False,
        "items": [_serialize_decision(r) for r in rows],
        "total": len(rows),
    }


def create_decision_memory(
    db: Session,
    *,
    company_slug: str,
    subject_type: str,
    subject_id: str,
    decision_code: str,
    summary: str,
    rationale_code: str | None = None,
    application_id: int | None = None,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    assert_not_demo_fixture(subject_id)
    code = (decision_code or "").strip().lower()[:64]
    if not code or code in FORBIDDEN_DECISION_CODES:
        raise ValueError("invalid_decision_code")
    clean_summary = (summary or "").strip()[:500]
    if len(clean_summary) < 2:
        raise ValueError("summary_required")
    if application_id is not None:
        app = db.query(Application).filter(Application.id == application_id).one_or_none()
        if app is None:
            raise ValueError("application_not_found")
        job = db.query(Job).filter(Job.id == app.job_id).one_or_none()
        if job is None or slugify_company(job.company) != slug:
            raise ValueError("application_tenant_mismatch")
    row = RecruiterDecisionMemoryEntry(
        company_slug=slug,
        subject_type=(subject_type or "candidate").strip()[:32],
        subject_id=subject_id.strip()[:64],
        application_id=application_id,
        decision_code=code,
        summary=clean_summary,
        rationale_code=(rationale_code or "").strip()[:64] or None,
        source="live",
        demo_fixture=False,
        meta_json=json.dumps({"wave": "2"}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="recruiter.decision_memory_created",
        aggregate_type="recruiter_decision_memory",
        aggregate_id=str(row.id),
        payload={"company_slug": slug, "decision_code": code},
    )
    return _serialize_decision(row)


def dry_run_team_invite(
    db: Session,
    *,
    company_slug: str,
    invitee_email: str,
    role_key: str = "recruiter",
) -> dict[str, Any]:
    """Team invite smoke path — outbox draft only, never send, enrollment stays OFF."""
    slug = _require_company_slug(company_slug)
    email = (invitee_email or "").strip().lower()
    if "@" not in email or len(email) > 254:
        raise ValueError("invalid_invitee_email")
    if not email.endswith("@twin.internal") and "smoke" not in email:
        # Allow only synthetic/smoke addresses in dry-run product path.
        raise ValueError("invite_dry_run_requires_synthetic_email")
    role = (role_key or "recruiter").strip()[:64] or "recruiter"
    tenant = (
        db.query(OrganizationTenant)
        .filter(OrganizationTenant.slug == slug)
        .one_or_none()
    )
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
    dedupe = f"wave2-invite-dryrun-{slug}-{hashlib.sha256(email.encode()).hexdigest()[:16]}"
    existing = (
        db.query(CommunicationOutbox).filter(CommunicationOutbox.dedupe_key == dedupe).one_or_none()
    )
    if existing is not None:
        draft = existing
    else:
        draft = enqueue_communication_draft(
            db,
            template_key="recruiter.team_invite_dry_run",
            recipient_email=email,
            payload={
                "company_slug": slug,
                "role_key": role,
                "dry_run": True,
                "send_forbidden": True,
                "enrollment_enabled": False,
            },
            dedupe_key=dedupe,
        )
    # Do not create real membership for strangers — pending marker only via domain event.
    record_domain_event(
        db,
        event_name="recruiter.team_invite_dry_run",
        aggregate_type="organization_tenant",
        aggregate_id=str(tenant.id),
        payload={"role_key": role, "outbox_id": draft.id, "status": draft.status},
    )
    membership_count = (
        db.query(TenantMembership).filter(TenantMembership.tenant_id == tenant.id).count()
    )
    return {
        "company_slug": slug,
        "tenant_id": tenant.id,
        "role_key": role,
        "dry_run": True,
        "email_sent": False,
        "outbox_id": draft.id,
        "outbox_status": draft.status,
        "membership_count": membership_count,
        "enrollment_enabled": False,
    }


def draft_candidate_communication(
    db: Session,
    *,
    company_slug: str,
    template_key: str,
    subject_id: str,
    body_preview: str,
    send: bool = False,
) -> dict[str, Any]:
    """Explicit-send communications — smoke always forces draft (no real outbound)."""
    slug = _require_company_slug(company_slug)
    assert_not_demo_fixture(subject_id)
    if send:
        raise ValueError("real_outbound_forbidden_in_wave2_smoke")
    tpl = (template_key or "recruiter.candidate_note").strip()[:128]
    preview = (body_preview or "").strip()[:500]
    dedupe = (
        f"wave2-comms-{slug}-{subject_id[:32]}-"
        f"{hashlib.sha256(preview.encode()).hexdigest()[:12]}"
    )
    draft = enqueue_communication_draft(
        db,
        template_key=tpl,
        payload={
            "company_slug": slug,
            "subject_id": subject_id[:64],
            "body_preview": preview,
            "send": False,
            "demo_fixture": False,
        },
        dedupe_key=dedupe,
    )
    return {
        "company_slug": slug,
        "outbox_id": draft.id,
        "status": draft.status,
        "email_sent": False,
        "send": False,
        "demo_fixture": False,
    }
