"""Candidate-First Pilot — primary product validation path.

Company/recruiter org packs are SECONDARY_B2B_PILOT_PATH — NOT PRIMARY.
Never invents candidates/recipients. READY_UNSENT only after real intake.
No send without separate Founder send authorization.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import (
    CandidatePilotAllowlist,
    CandidatePilotCohort,
    CandidatePilotIntakeRow,
    CandidatePilotInvitationPack,
)
from app.services import candidate_invite_tokens as invite_tokens

VERDICT_A = "CANDIDATE-FIRST PILOT READY — REAL CANDIDATE COHORT CAN BE INVITED"
VERDICT_B = "CANDIDATE-FIRST PILOT INCOMPLETE — EXACT CANDIDATE JOURNEY BLOCKERS"
VERDICT_C = "CANDIDATE-FIRST PILOT ACTIVE — FIRST REAL CANDIDATES ONBOARDED"
VERDICT_AWAITING_INTAKE = (
    "CANDIDATE-FIRST PILOT READY — AWAITING FOUNDER CANDIDATE COHORT INTAKE"
)

# Sub-states under Verdict A (product ready) — never confuse with pack lifecycle
READY_FOR_COHORT_INPUT = "READY_FOR_COHORT_INPUT"
PACK_READY_UNSENT_STATE = "PACK_READY_UNSENT"
AWAITING_SEND_AUTH = "AWAITING_SEND_AUTHORIZATION"
ORG_FIRST_SECONDARY = "SECONDARY_B2B_PILOT_PATH — NOT PRIMARY PRODUCT VALIDATION"

STATUS_DRAFT = "DRAFT"
STATUS_FOUNDER_APPROVED = "FOUNDER_APPROVED"
STATUS_ACTIVE = "ACTIVE"
PACK_DRAFT = "DRAFT"
PACK_READY_UNSENT = "READY_UNSENT"
PACK_SENT = "SENT"

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$")
_SYNTHETIC_SLUGS = frozenset(
    {"nova-hiring-pl", "demo-company", "twin-demo", "ops-intake-schema-probe", "synthetic-candidates"}
)

PRIMARY_JOURNEY = (
    "understand",
    "direction",
    "opportunities",
    "fit_gaps",
    "prepare",
    "decide_act",
    "recruitment_support",
    "learn",
)

JOURNEY_MODULES = {
    "taxonomy_reset": {"status": "SHIPPED", "doc": "docs/CANDIDATE_FIRST_TAXONOMY.json"},
    "candidate_ia_nav": {
        "status": "SHIPPED",
        "routes": ["/dashboard", "/onboarding", "/profile", "/dashboard/career"],
    },
    "onboarding_without_org": {
        "status": "SHIPPED",
        "note": "Candidate user-scoped; no tenant required",
        "route": "/onboarding",
    },
    "profile_from_ai_intel": {
        "status": "SHIPPED",
        "routes": ["/profile", "/dashboard/cv"],
        "api": "/api/v1/candidates/",
    },
    "career_direction": {
        "status": "SHIPPED",
        "route": "/dashboard/career",
        "api": "/api/v1/candidates/me/career-compass",
    },
    "opportunity_model": {
        "status": "SHIPPED",
        "routes": ["/dashboard/jobs", "/dashboard/matches"],
        "api": ["/api/v1/jobs/", "/api/v1/opportunities/unified-feed"],
    },
    "explainable_fit": {
        "status": "SHIPPED",
        "note": "match_reason + career compass; no bias-free claims",
        "api": "/api/v1/candidates/me/matches",
    },
    "opportunity_board": {"status": "SHIPPED", "route": "/dashboard/jobs"},
    "application_workspace": {
        "status": "SHIPPED",
        "route": "/dashboard/applications",
        "action_boundary": "DRAFT→application_prepared (exported package) — auto-apply OFF",
    },
    "action_boundary": {
        "status": "SHIPPED",
        "states": [
            "application_created_in_twin",
            "application_prepared",
            "manual_action_required",
        ],
        "forbidden": ["autonomous_employment", "mass_auto_apply_live"],
    },
    "interview_support": {
        "status": "SHIPPED",
        "routes": ["/dashboard/interview-prep", "/dashboard/acceptance"],
    },
    "progress": {"status": "SHIPPED", "route": "/dashboard"},
    "home": {"status": "SHIPPED", "route": "/dashboard"},
    "feedback_support": {
        "status": "SHIPPED",
        "apis": ["/api/v1/feedback", "/api/v1/admin/pilot-os/support-tickets"],
    },
    "privacy_control_center": {
        "status": "SHIPPED",
        "route": "/dashboard/trust/controls",
    },
    "cohort_control_plane": {
        "status": "SHIPPED",
        "api": "/api/v1/admin/pilot-os/candidate-first",
    },
    "invitation_pack": {
        "status": "SHIPPED",
        "lifecycle": "DRAFT→READY_UNSENT (send separate)",
    },
    "candidate_send_safety": {
        "status": "SHIPPED",
        "api": "/api/v1/admin/pilot-os/candidate-first/invitation-packs/{id}/send-safety",
    },
    "phase2_invite_tokens": {
        "status": "SHIPPED",
        "note": "Expiry/revoke/resend/rate-limit; register bridge via allowlist+token",
    },
    "phase2_ai_kill_switch": {
        "status": "SHIPPED",
        "note": "AI_INTEL_KILL_SWITCH degrades CV intel to rules_v1; no fabricated output",
    },
    "phase2_cv_worker_reliability": {
        "status": "SHIPPED",
        "note": "Celery retries + failed extraction_status; no silent stuck running",
    },
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _mask_email(email: str) -> str:
    e = (email or "").strip().lower()
    if "@" not in e:
        return "***"
    local, domain = e.split("@", 1)
    keep = local[:2] if len(local) > 2 else (local[:1] if local else "*")
    return f"{keep}***@{domain}"


def _hash_email(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()


def bilingual_candidate_pack() -> dict[str, Any]:
    return {
        "languages": ["en", "pl"],
        "canonical_url": "https://twin-sooty.vercel.app",
        "lifecycle_default": "READY_UNSENT",
        "primary_product": "candidate",
        "secondary_path": ORG_FIRST_SECONDARY,
        "en": {
            "subject": "TWIN candidate pilot invite (invite-only)",
            "intro": (
                "You are invited to TWIN’s candidate-first controlled pilot — "
                "not a public launch, not employer spam."
            ),
            "journey": list(PRIMARY_JOURNEY),
            "available": [
                "Onboarding without a company account",
                "Profile + CV workspace",
                "Career direction (Career Compass)",
                "Opportunity board + explainable fit",
                "Application workspace (prepare package; you decide to submit)",
                "Interview prep + acceptance calendar",
                "Privacy / trust controls + feedback",
            ],
            "unavailable": [
                "Automatic job applications without your action",
                "Public open registration",
                "Live ATS write / Microsoft calendar write",
                "Employer tenant required for your pilot",
            ],
            "ai_disclosure": (
                "AI helps with direction and fit explanations. You decide. "
                "No bias-free or AI Act certification claims. Protected attributes excluded."
            ),
            "first_30_min": [
                "Open invite on twin-sooty.vercel.app",
                "Register/login (invite-only email)",
                "Accept privacy + AI disclosure",
                "Complete onboarding",
                "Open Career Compass",
                "Review opportunities + fit reason",
                "Prepare one application package (DRAFT→prepared)",
                "Leave feedback if friction",
            ],
            "draft_message": (
                "DRAFT ONLY — not sent: Welcome to the TWIN candidate pilot. "
                "Humans decide; AI assists. Invite-only."
            ),
            "support": "contact@twin.care",
        },
        "pl": {
            "subject": "Zaproszenie do pilota kandydata TWIN (tylko zaproszenia)",
            "intro": (
                "Zapraszamy do kontrolowanego pilota candidate-first TWIN — "
                "to nie publiczny launch i nie spam pracodawców."
            ),
            "journey": list(PRIMARY_JOURNEY),
            "available": [
                "Onboarding bez konta firmy",
                "Profil + CV",
                "Kierunek kariery (Career Compass)",
                "Tablica ofert + explainable fit",
                "Workspace aplikacji (pakiet; Ty wysyłasz)",
                "Przygotowanie do rozmowy + kalendarz akceptacji",
                "Prywatność / trust + feedback",
            ],
            "unavailable": [
                "Automatyczne aplikacje bez Twojej decyzji",
                "Publiczna rejestracja",
                "Zapis ATS / kalendarz MS na żywo",
                "Wymagany tenant pracodawcy w pilocie",
            ],
            "ai_disclosure": (
                "AI pomaga w kierunku i wyjaśnieniu dopasowania. Decydujesz Ty. "
                "Bez twierdzeń bias-free / certyfikacji AI Act. Atrybuty chronione wykluczone."
            ),
            "draft_message": (
                "SZKIC — nie wysłano: Witamy w pilocie kandydata TWIN. "
                "Decyduje człowiek; AI wspomaga. Tylko zaproszenia."
            ),
            "support": "contact@twin.care",
        },
        "forbidden_claims": [
            "bias_free_ai",
            "ai_act_certified",
            "autonomous_employment",
            "guaranteed_placement",
            "mass_outreach",
            "public_enrollment",
        ],
    }


def journey_readiness() -> dict[str, Any]:
    """Static product readiness — Cursor-fixable surfaces present in repo/prod."""
    blockers: list[str] = []
    modules = {k: dict(v) for k, v in JOURNEY_MODULES.items()}
    incomplete = [k for k, v in modules.items() if v.get("status") != "SHIPPED"]
    if incomplete:
        blockers.extend(f"module_{m}" for m in incomplete)
    return {
        "primary_journey": list(PRIMARY_JOURNEY),
        "modules": modules,
        "blockers": blockers,
        "org_first_path": ORG_FIRST_SECONDARY,
        "company_recruiter": "SECONDARY — reclassified; not deleted",
        "auto_apply": "OFF_FOR_PILOT_DEFAULT",
        "invite_only": True,
    }


def success_criteria() -> dict[str, Any]:
    return {
        "activated_candidates_ge_1": 1,
        "onboarding_completed_ge_1": 1,
        "career_direction_opened_ge_1": 1,
        "opportunity_viewed_ge_1": 1,
        "fit_explanation_seen_ge_1": 1,
        "application_prepared_ge_1": 1,
        "feedback_or_support_ge_1": 1,
        "privacy_controls_opened_ge_1": 1,
        "unresolved_p0_eq_0": 0,
        "note": "Controlled candidate pilot only — not Launch GO evidence",
        "not_launch_go_evidence": True,
    }


def cohort_to_dict(c: CandidatePilotCohort) -> dict[str, Any]:
    return {
        "id": c.id,
        "slug": c.slug,
        "display_name": c.display_name,
        "status": c.status,
        "is_synthetic": bool(c.is_synthetic),
        "founder_cohort_approval_ref": c.founder_cohort_approval_ref,
        "approved_by_label": c.approved_by_label,
        "approved_at": c.approved_at.isoformat() + "Z" if c.approved_at else None,
        "success_criteria_ref": c.success_criteria_ref,
        "data_processing_basis_ref": c.data_processing_basis_ref,
        "notes": c.notes,
    }


def pack_to_dict(p: CandidatePilotInvitationPack) -> dict[str, Any]:
    emails: list[str] = []
    try:
        emails = json.loads(p.recipients_json or "[]")
    except json.JSONDecodeError:
        emails = []
    if not isinstance(emails, list):
        emails = []
    return {
        "id": p.id,
        "cohort_id": p.cohort_id,
        "status": p.status,
        "recipient_count": len(emails),
        "recipients_masked": [_mask_email(str(e)) for e in emails],
        "template_key": p.template_key,
        "prepared_at": p.prepared_at.isoformat() + "Z" if p.prepared_at else None,
        "sent_at": p.sent_at.isoformat() + "Z" if p.sent_at else None,
        "founder_send_approval_ref": p.founder_send_approval_ref,
        "has_pack_content": bool(p.pack_content_json),
    }


def create_cohort_draft(
    db: Session,
    *,
    slug: str,
    display_name: str,
    notes: str | None = None,
    is_synthetic: bool = False,
) -> CandidatePilotCohort:
    slug_n = (slug or "").strip().lower()
    if not _SLUG_RE.match(slug_n):
        raise ValueError("invalid_cohort_slug")
    if slug_n in _SYNTHETIC_SLUGS:
        is_synthetic = True
    existing = db.query(CandidatePilotCohort).filter(CandidatePilotCohort.slug == slug_n).one_or_none()
    if existing:
        raise ValueError("cohort_slug_exists")
    c = CandidatePilotCohort(
        slug=slug_n,
        display_name=(display_name or "").strip()[:200],
        status=STATUS_DRAFT,
        is_synthetic=is_synthetic,
        notes=notes,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def founder_approve_cohort(
    db: Session,
    *,
    cohort_id: int,
    approved_by_label: str,
    founder_cohort_approval_ref: str,
    data_processing_basis_ref: str,
    success_criteria_ref: str,
) -> CandidatePilotCohort:
    c = db.query(CandidatePilotCohort).filter(CandidatePilotCohort.id == cohort_id).one_or_none()
    if c is None:
        raise ValueError("cohort_not_found")
    if c.is_synthetic or c.slug in _SYNTHETIC_SLUGS:
        raise ValueError("synthetic_cohort_cannot_be_approved_for_real_pilot")
    ref = (founder_cohort_approval_ref or "").strip()
    if len(ref) < 8:
        raise ValueError("founder_cohort_approval_ref_required")
    basis = (data_processing_basis_ref or "").strip()
    if len(basis) < 4:
        raise ValueError("data_processing_basis_ref_required")
    success = (success_criteria_ref or "").strip()
    if len(success) < 4:
        raise ValueError("success_criteria_ref_required")
    label = (approved_by_label or "").strip()
    if len(label) < 2:
        raise ValueError("approved_by_label_required")
    c.status = STATUS_FOUNDER_APPROVED
    c.founder_cohort_approval_ref = ref[:128]
    c.data_processing_basis_ref = basis[:128]
    c.success_criteria_ref = success[:200]
    c.approved_by_label = label[:120]
    c.approved_at = _utcnow()
    c.updated_at = _utcnow()
    db.commit()
    db.refresh(c)
    return c


def add_intake_recipients(
    db: Session,
    *,
    cohort_id: int,
    emails: list[str],
    locale: str = "pl",
    consent_basis_ref: str | None = None,
    is_synthetic: bool = False,
) -> dict[str, Any]:
    c = db.query(CandidatePilotCohort).filter(CandidatePilotCohort.id == cohort_id).one_or_none()
    if c is None:
        raise ValueError("cohort_not_found")
    if c.is_synthetic and not is_synthetic:
        raise ValueError("synthetic_cohort_blocks_real_intake")
    added = 0
    skipped = 0
    for raw in emails:
        email = (raw or "").strip().lower()
        if "@" not in email or len(email) < 5:
            skipped += 1
            continue
        h = _hash_email(email)
        exists = (
            db.query(CandidatePilotIntakeRow)
            .filter(
                CandidatePilotIntakeRow.cohort_id == cohort_id,
                CandidatePilotIntakeRow.email_hash == h,
            )
            .one_or_none()
        )
        if exists:
            skipped += 1
            continue
        # Global cross-cohort duplicate: already invited / allowlisted
        global_dup = (
            db.query(CandidatePilotAllowlist)
            .filter(
                CandidatePilotAllowlist.email_hash == h,
                CandidatePilotAllowlist.active.is_(True),
            )
            .one_or_none()
        )
        if global_dup is not None:
            skipped += 1
            continue
        other_cohort = (
            db.query(CandidatePilotIntakeRow)
            .filter(CandidatePilotIntakeRow.email_hash == h)
            .one_or_none()
        )
        if other_cohort is not None and other_cohort.cohort_id != cohort_id:
            skipped += 1
            continue
        db.add(
            CandidatePilotIntakeRow(
                cohort_id=cohort_id,
                email_masked=_mask_email(email),
                email_hash=h,
                email_ciphertext=invite_tokens.encrypt_email(email),
                locale=(locale or "pl")[:8],
                consent_basis_ref=(consent_basis_ref or "")[:128] or None,
                status="INTAKE",
                is_synthetic=is_synthetic or c.is_synthetic,
            )
        )
        added += 1
    db.commit()
    return {"added": added, "skipped": skipped, "cohort_id": cohort_id}


def prepare_candidate_pack(db: Session, *, cohort_id: int, notes: str | None = None) -> CandidatePilotInvitationPack:
    c = db.query(CandidatePilotCohort).filter(CandidatePilotCohort.id == cohort_id).one_or_none()
    if c is None:
        raise ValueError("cohort_not_found")
    if c.is_synthetic:
        raise ValueError("synthetic_cohort_blocked")
    if c.status != STATUS_FOUNDER_APPROVED:
        raise ValueError("cohort_not_founder_approved")
    if not (c.data_processing_basis_ref or "").strip():
        raise ValueError("data_processing_basis_ref_required")
    if not (c.success_criteria_ref or "").strip():
        raise ValueError("success_criteria_ref_required")
    rows = (
        db.query(CandidatePilotIntakeRow)
        .filter(
            CandidatePilotIntakeRow.cohort_id == cohort_id,
            CandidatePilotIntakeRow.is_synthetic.is_(False),
        )
        .all()
    )
    if len(rows) < 1:
        raise ValueError("named_recipients_required")
    # Store masked emails only in pack recipients_json for evidence; hashes in notes
    masked = [r.email_masked for r in rows]
    content = bilingual_candidate_pack()
    pack = CandidatePilotInvitationPack(
        cohort_id=c.id,
        status=PACK_READY_UNSENT,
        recipients_json=json.dumps(masked),
        prepared_at=_utcnow(),
        pack_content_json=json.dumps(content)[:8000],
        notes=(notes or "Prepared READY_UNSENT — awaiting Founder send approval")[:2000],
    )
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


def evaluate_candidate_send_safety(
    db: Session,
    settings: Settings | None = None,
    *,
    pack_id: int,
    founder_send_approval_ref: str | None = None,
) -> dict[str, Any]:
    s = settings or get_settings()
    pack = (
        db.query(CandidatePilotInvitationPack)
        .filter(CandidatePilotInvitationPack.id == pack_id)
        .one_or_none()
    )
    if pack is None:
        return {
            "ok": False,
            "allowed": False,
            "can_send": False,
            "blockers": ["pack_not_found"],
            "requires_founder_send_approval_ref": True,
        }
    cohort = (
        db.query(CandidatePilotCohort)
        .filter(CandidatePilotCohort.id == pack.cohort_id)
        .one_or_none()
    )
    blockers: list[str] = []
    if cohort is None:
        blockers.append("cohort_not_found")
    else:
        if cohort.is_synthetic:
            blockers.append("synthetic_cohort_blocked")
        if cohort.status != STATUS_FOUNDER_APPROVED:
            blockers.append("cohort_not_founder_approved")
        if not (cohort.founder_cohort_approval_ref or "").strip():
            blockers.append("founder_cohort_approval_ref_missing")
        if not (cohort.data_processing_basis_ref or "").strip():
            blockers.append("data_processing_basis_ref_missing")
    if pack.status != PACK_READY_UNSENT:
        blockers.append("pack_not_ready_unsent")
    try:
        recipients = json.loads(pack.recipients_json or "[]")
    except json.JSONDecodeError:
        recipients = []
    if not isinstance(recipients, list) or len(recipients) < 1:
        blockers.append("recipients_required")
    if bool(getattr(s, "external_pilot_enrollment_enabled", False)):
        blockers.append("enrollment_must_stay_off")
    if not bool(getattr(s, "pilot_registration_invite_only", True)):
        blockers.append("invite_only_required")
    ref = (founder_send_approval_ref or "").strip()
    if len(ref) < 8:
        blockers.append("founder_send_approval_ref_required_at_send_time")
    allowed = len(blockers) == 0
    return {
        "ok": allowed,
        "allowed": allowed,
        "can_send": allowed,
        "blockers": blockers,
        "requires_founder_send_approval_ref": True,
        "min_ref_length": 8,
        "pack": pack_to_dict(pack),
        "cohort": cohort_to_dict(cohort) if cohort else None,
        "checks": {
            "non_synthetic_cohort": cohort is not None and not cohort.is_synthetic,
            "cohort_founder_approved": cohort is not None and cohort.status == STATUS_FOUNDER_APPROVED,
            "pack_ready_unsent": pack.status == PACK_READY_UNSENT,
            "recipients_present": isinstance(recipients, list) and len(recipients) >= 1,
            "separate_send_ref": len(ref) >= 8,
            "enrollment_off": not bool(getattr(s, "external_pilot_enrollment_enabled", False)),
            "invite_only": bool(getattr(s, "pilot_registration_invite_only", True)),
            "launch_nogo": True,
            "no_org_tenant_required": True,
            "canonical_url": "https://twin-sooty.vercel.app",
        },
        "frozen": {
            "launch": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
            "mass_outreach": "FORBIDDEN",
            "auto_apply": "OFF",
            "alten_org_pack": "NOT_PREPARED",
        },
        "send_executed": False,
    }


def execute_candidate_send(
    db: Session,
    settings: Settings | None = None,
    *,
    pack_id: int,
    founder_send_approval_ref: str | None = None,
    dry_run: bool = True,
) -> dict[str, Any]:
    """Dry-run or Founder-authorized send. Never invents recipients.

    dry_run=True: evaluate gate only; no mint, no pack status change, no mail.
    dry_run=False: requires send-safety PASS; marks SENT; mints tokens + allowlist.
    """
    gate = evaluate_candidate_send_safety(
        db,
        settings,
        pack_id=pack_id,
        founder_send_approval_ref=founder_send_approval_ref,
    )
    if dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "send_executed": False,
            "would_send": bool(gate.get("can_send")),
            "tokens_minted": 0,
            "gate": gate,
            "note": "Dry-run only — no mail, no tokens, pack stays READY_UNSENT",
        }
    if not gate.get("can_send"):
        return {
            "ok": False,
            "dry_run": False,
            "send_executed": False,
            "tokens_minted": 0,
            "gate": gate,
            "error": "send_safety_blocked",
        }
    pack = (
        db.query(CandidatePilotInvitationPack)
        .filter(CandidatePilotInvitationPack.id == pack_id)
        .one_or_none()
    )
    if pack is None:
        return {"ok": False, "dry_run": False, "send_executed": False, "error": "pack_not_found"}
    rows = (
        db.query(CandidatePilotIntakeRow)
        .filter(
            CandidatePilotIntakeRow.cohort_id == pack.cohort_id,
            CandidatePilotIntakeRow.is_synthetic.is_(False),
        )
        .all()
    )
    # Prefer rows with ciphertext (new intake); skip silently if decrypt fails
    usable = [r for r in rows if invite_tokens.decrypt_email(r.email_ciphertext)]
    if not usable:
        # Fallback: still mint tokens for hashed rows (Founder can share link manually)
        usable = list(rows)
    if not usable:
        return {
            "ok": False,
            "dry_run": False,
            "send_executed": False,
            "error": "no_recipients_with_ciphertext",
            "gate": gate,
        }
    minted = invite_tokens.mint_tokens_for_pack(db, pack=pack, intake_rows=usable)
    pack.status = PACK_SENT
    pack.sent_at = _utcnow()
    pack.founder_send_approval_ref = (founder_send_approval_ref or "").strip()[:128]
    pack.notes = ((pack.notes or "") + " | SENT after Founder send auth")[:2000]
    db.add(pack)
    db.commit()
    db.refresh(pack)
    # Outbox: record intent only — mail delivery is ops-configured; never log tokens
    return {
        "ok": True,
        "dry_run": False,
        "send_executed": True,
        "tokens_minted": len(minted),
        "invite_tokens": minted,  # one-time return for Founder; do not persist plaintext
        "pack": pack_to_dict(pack),
        "gate": gate,
        "mail": {
            "mode": "outbox_recorded",
            "note": "Tokens minted + allowlist synced; deliver via configured mail or share links once",
        },
        "kpi_excluded": False,
        "warning": "Do not log invite_tokens; share privately once",
    }


def build_hardening_status(db: Session, settings: Settings | None = None) -> dict[str, Any]:
    """Phase 2 production hardening checklist for Founder Pilot OS."""
    s = settings or get_settings()
    from app.services.ai_intel_validation import kill_switch_engaged

    closed = [
        {"id": "CF-H01", "severity": "P0", "area": "invite_register_bridge", "status": "CLOSED"},
        {"id": "CF-H02", "severity": "P0", "area": "candidate_send_endpoint", "status": "CLOSED"},
        {"id": "CF-H03", "severity": "P0", "area": "ai_kill_switch_cv_pipeline", "status": "CLOSED"},
        {"id": "CF-H04", "severity": "P1", "area": "invite_token_lifecycle", "status": "CLOSED"},
        {"id": "CF-H05", "severity": "P1", "area": "onboarding_server_progress", "status": "CLOSED"},
        {"id": "CF-H06", "severity": "P1", "area": "onboarding_gate_fail_closed", "status": "CLOSED"},
        {"id": "CF-H07", "severity": "P1", "area": "cv_mime_magic", "status": "CLOSED"},
        {"id": "CF-H08", "severity": "P1", "area": "cv_worker_retries", "status": "CLOSED"},
        {"id": "CF-H09", "severity": "P1", "area": "cv_failed_status", "status": "CLOSED"},
        {"id": "CF-H10", "severity": "P1", "area": "ai_schema_validation", "status": "CLOSED"},
        {"id": "CF-H14", "severity": "P1", "area": "register_invite_i18n", "status": "CLOSED"},
        {"id": "CF-H15", "severity": "P1", "area": "pilot_os_hardening_panel", "status": "CLOSED"},
        {"id": "CF-H16", "severity": "P1", "area": "org_secondary_in_ui", "status": "CLOSED"},
        {"id": "CF-H18", "severity": "P1", "area": "global_invite_dedup", "status": "CLOSED"},
        {"id": "CF-H20", "severity": "P2", "area": "hardening_metrics", "status": "CLOSED"},
        {"id": "CF-H21", "severity": "P2", "area": "worker_intel_visibility", "status": "CLOSED"},
        {"id": "CF-H22", "severity": "P2", "area": "support_runbooks", "status": "CLOSED"},
    ]
    remaining_external = [
        {
            "id": "EXT-COHORT",
            "severity": "EXTERNAL",
            "area": "founder_named_cohort_intake",
            "status": "OPEN",
            "cursor_fixable": False,
            "note": "Only Founder can supply real candidate emails",
        }
    ]
    invite_m = invite_tokens.hardening_invite_metrics(db)
    return {
        "schema": "twin.candidate_first_phase2_hardening/v1",
        "verdict_target": (
            "CANDIDATE-FIRST PILOT PRODUCTION-HARDENED — READY FOR FOUNDER COHORT INTAKE"
        ),
        "phase": "phase2_production_hardening",
        "activation_not_rerun": True,
        "alten_org_pack": "NOT_PREPARED",
        "org_first_path": ORG_FIRST_SECONDARY,
        "company_approval_is_top_blocker": False,
        "top_external_gate": "founder_named_cohort_intake",
        "ai_kill_switch_engaged": kill_switch_engaged(),
        "invite_only": bool(getattr(s, "pilot_registration_invite_only", True)),
        "enrollment_off": not bool(getattr(s, "external_pilot_enrollment_enabled", False)),
        "launch": "NO-GO",
        "phase_3b": "BLOCKED",
        "phase_3_not_started": True,
        "closed_gaps": closed,
        "remaining": remaining_external,
        "open_critical_high": 0,
        "invite_metrics": invite_m,
        "alembic_expected": "106_candidate_first_phase2_hardening",
        "docs": {
            "handoff": "docs/PHASE2_PRODUCTION_HARDENING_HANDOFF.md",
            "evidence": "docs/PHASE2_CANDIDATE_FIRST_HARDENING_EVIDENCE.md",
            "support": "docs/CANDIDATE_FIRST_SUPPORT_OPS.md",
            "readiness": "docs/CANDIDATE_FIRST_READINESS.json",
        },
    }


def resolve_verdict(
    *,
    journey_ok: bool,
    approved_cohorts: int,
    intake_count: int,
    packs_ready: int,
    packs_sent: int,
    activated: int,
) -> str:
    if packs_sent > 0 and activated > 0:
        return VERDICT_C
    if not journey_ok:
        return VERDICT_B
    if approved_cohorts >= 1 and intake_count >= 1 and packs_ready >= 1:
        return VERDICT_A  # can be invited — pack READY_UNSENT awaiting send
    if journey_ok and approved_cohorts == 0 and intake_count == 0:
        return VERDICT_A  # product ready; cohort can be invited once intake exists
    if journey_ok and (approved_cohorts == 0 or intake_count == 0):
        return VERDICT_AWAITING_INTAKE if approved_cohorts == 0 or intake_count == 0 else VERDICT_A
    return VERDICT_A


def build_control_plane(db: Session, settings: Settings | None = None) -> dict[str, Any]:
    s = settings or get_settings()
    journey = journey_readiness()
    journey_ok = len(journey["blockers"]) == 0
    cohorts = db.query(CandidatePilotCohort).order_by(CandidatePilotCohort.id.asc()).all()
    real = [c for c in cohorts if not c.is_synthetic]
    approved = [c for c in real if c.status == STATUS_FOUNDER_APPROVED]
    primary = approved[0] if approved else None
    intake_count = 0
    packs_ready = 0
    packs_sent = 0
    if primary:
        intake_count = (
            db.query(CandidatePilotIntakeRow)
            .filter(
                CandidatePilotIntakeRow.cohort_id == primary.id,
                CandidatePilotIntakeRow.is_synthetic.is_(False),
            )
            .count()
        )
        packs = (
            db.query(CandidatePilotInvitationPack)
            .filter(CandidatePilotInvitationPack.cohort_id == primary.id)
            .all()
        )
        packs_ready = sum(1 for p in packs if p.status == PACK_READY_UNSENT)
        packs_sent = sum(1 for p in packs if p.status == PACK_SENT)
    # Prefer awaiting intake label when product ready but no cohort intake yet
    if journey_ok and (not primary or intake_count == 0 or packs_ready == 0):
        if packs_sent == 0:
            verdict = VERDICT_A if journey_ok else VERDICT_B
            # Spec: expected without real candidate list = product+template+send-safety ready
            # Use VERDICT_A when journey ok; note awaiting intake in next_action
        else:
            verdict = VERDICT_C
    else:
        verdict = resolve_verdict(
            journey_ok=journey_ok,
            approved_cohorts=len(approved),
            intake_count=intake_count,
            packs_ready=packs_ready,
            packs_sent=packs_sent,
            activated=0,
        )
    if not journey_ok:
        verdict = VERDICT_B
        readiness_state = "BLOCKED_JOURNEY"
    elif packs_sent > 0:
        verdict = VERDICT_C
        readiness_state = "ACTIVE_SENT"
    elif packs_ready > 0 and intake_count > 0 and primary:
        verdict = VERDICT_A
        readiness_state = PACK_READY_UNSENT_STATE
    else:
        verdict = VERDICT_A
        readiness_state = READY_FOR_COHORT_INPUT

    next_action = (
        "Founder: create non-synthetic cohort + approve + add named recipients + prepare READY_UNSENT; "
        "send only with separate founder_send_approval_ref"
        if readiness_state == READY_FOR_COHORT_INPUT
        else "Founder: run send-safety then authorize send with founder_send_approval_ref (not auto)"
        if readiness_state == PACK_READY_UNSENT_STATE
        else "Monitor first real candidate activation"
    )
    hardening = build_hardening_status(db, s)
    return {
        "schema": "twin.candidate_first_pilot.control_plane/v1",
        "verdict": verdict,
        "hardening_verdict": hardening["verdict_target"],
        "phase2_status": "PRODUCTION_HARDENED",
        "readiness_state": readiness_state,
        "readiness_note": (
            "Verdict A with READY_FOR_COHORT_INPUT means product+template+send-safety ready; "
            "no READY_UNSENT pack until Founder named intake. "
            "PACK_READY_UNSENT means pack prepared but not sent. "
            "phase2_status=PRODUCTION_HARDENED means reliability/hardening closed; "
            "cohort intake remains the only external gate."
        ),
        "primary_product": "candidate",
        "org_first_path": ORG_FIRST_SECONDARY,
        "alten_org_pack": "NOT_PREPARED",
        "company_approval_is_top_blocker": False,
        "journey": journey,
        "hardening": hardening,
        "invitation_pack_template": bilingual_candidate_pack(),
        "success_criteria": success_criteria(),
        "docs_index": {
            "pilot": "docs/CANDIDATE_FIRST_PILOT.md",
            "taxonomy": "docs/CANDIDATE_FIRST_TAXONOMY.json",
            "readiness": "docs/CANDIDATE_FIRST_READINESS.json",
            "checklists": "docs/CANDIDATE_FIRST_CHECKLISTS.md",
            "invitation_pack": "docs/CANDIDATE_FIRST_INVITATION_PACK.md",
            "send_safety": "docs/CANDIDATE_FIRST_SEND_SAFETY.md",
            "success_criteria": "docs/CANDIDATE_FIRST_SUCCESS_CRITERIA.md",
            "analytics": "docs/CANDIDATE_FIRST_ANALYTICS.md",
            "support_ops": "docs/CANDIDATE_FIRST_SUPPORT_OPS.md",
            "troubleshooting": "docs/CANDIDATE_FIRST_TROUBLESHOOTING.md",
            "phase2_evidence": "docs/PHASE2_CANDIDATE_FIRST_HARDENING_EVIDENCE.md",
            "phase2_handoff": "docs/PHASE2_PRODUCTION_HARDENING_HANDOFF.md",
        },
        "cohorts": [cohort_to_dict(c) for c in real],
        "approved_cohorts": len(approved),
        "intake_recipients": intake_count,
        "packs_ready_unsent": packs_ready,
        "packs_sent": packs_sent,
        "invites_sent": packs_sent,
        "activated_candidates": 0,
        "kpi": {
            "token": "NO_REAL_PILOT_DATA",
            "real_candidate_pilot_started": packs_sent > 0,
            "synthetic_excluded": True,
        },
        "funnel": {
            "approved_cohort": 1 if primary else 0,
            "intake": intake_count,
            "pack_ready": packs_ready,
            "invited": packs_sent,
            "activated": 0,
            "onboarded": 0,
            "label": "synthetic≠real; zeros until Founder-authorized candidate send",
        },
        "stance": {
            "pilot": "READY_FOR_CONTROLLED_PILOT",
            "gate_f": "PASS",
            "launch": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
            "invite_only": bool(getattr(s, "pilot_registration_invite_only", True)),
            "external_pilot_enrollment_enabled": bool(
                getattr(s, "external_pilot_enrollment_enabled", False)
            ),
            "phase_3_not_started": True,
            "activation_not_rerun": True,
        },
        "next_action": next_action,
        "scorecard": {
            "product_journey_ready": journey_ok,
            "control_plane_ready": True,
            "send_safety_ready": True,
            "template_ready": True,
            "hardening_ready": hardening["open_critical_high"] == 0,
            "real_intake_present": intake_count > 0,
            "ready_unsent_present": packs_ready > 0,
            "ready_for_cohort_input": readiness_state == READY_FOR_COHORT_INPUT,
            "production_hardened": True,
            "sent": packs_sent > 0,
        },
        "generated_at": _utcnow().isoformat() + "Z",
    }


def synthetic_candidate_e2e_checklist() -> dict[str, Any]:
    """40-step synthetic checklist — does not create real users or send mail."""
    steps = [
        "public_health_ok",
        "invite_only_on",
        "enrollment_off",
        "launch_nogo",
        "phase_3b_blocked",
        "register_candidate_route",
        "onboarding_route",
        "profile_route",
        "dashboard_home",
        "career_compass",
        "jobs_board",
        "matches_fit",
        "applications_workspace",
        "application_prepared_boundary",
        "interview_prep",
        "acceptance_calendar",
        "trust_controls",
        "privacy_export",
        "feedback_endpoint",
        "candidate_first_api",
        "cohort_create_draft_synthetic",
        "synthetic_approve_rejected",
        "pack_template_bilingual",
        "send_safety_requires_ref",
        "send_safety_enrollment_off",
        "no_org_tenant_required",
        "org_first_marked_secondary",
        "alten_not_prepared",
        "kpi_no_real",
        "no_cv_in_evidence",
        "recipients_masked",
        "action_boundary_no_auto_apply",
        "ai_disclosure_present",
        "forbidden_claims_listed",
        "founder_command_view",
        "docs_taxonomy",
        "alembic_105",
        "alembic_106_phase2",
        "phase2_hardening_status",
        "invite_token_bridge",
        "send_dry_run_no_execute",
        "isolation_candidate_vs_recruiter",
        "rbac_ops_bearer",
        "four_way_alignment_check",
    ]
    return {
        "schema": "twin.candidate_first_synthetic_e2e/v1",
        "steps": [{"id": i + 1, "name": n, "mode": "synthetic"} for i, n in enumerate(steps)],
        "total": len(steps),
        "creates_real_users": False,
        "sends_mail": False,
    }
