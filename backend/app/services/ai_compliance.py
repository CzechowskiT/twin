"""Career Evidence Graph & AI Compliance Foundation (Phase A).

Production claim provenance, evidence links, AI registry/prompt/decision log,
explainability, human override, prohibited-use + protected-attribute guards.
AI must not silently create facts, auto hire/reject, fake verification, or
infer protected attributes. Readiness language only — not legal certification.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    AiDecisionRun,
    AiExplanation,
    AiHumanReview,
    AiInAppNotification,
    AiProhibitedUse,
    AiPromptTemplate,
    AiSystemRegistry,
    CareerClaim,
    CareerEvidenceObject,
    ClaimDispute,
    ClaimEvidenceLink,
    ClaimStatusHistory,
    FeatureFlagState,
    HardLiveEvidenceRecord,
    User,
)
from app.services.platform_foundations import record_domain_event

logger = logging.getLogger(__name__)

CLAIM_STATUSES = frozenset({
    "DECLARED", "EXTRACTED", "AI_INFERRED", "EVIDENCE_BACKED", "HUMAN_CONFIRMED",
    "EXTERNALLY_VERIFIED", "DISPUTED", "REJECTED", "EXPIRED", "REVOKED",
    "SUPERSEDED", "UNKNOWN",
})

ACTIVE_STATUSES = frozenset({
    "DECLARED", "EXTRACTED", "AI_INFERRED", "EVIDENCE_BACKED", "HUMAN_CONFIRMED",
    "EXTERNALLY_VERIFIED", "DISPUTED", "UNKNOWN",
})

# Allowed transitions (from -> frozenset(to)). SUPERSEDED/REVOKED always allowed from active.
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "DECLARED": frozenset({"EVIDENCE_BACKED", "DISPUTED", "REJECTED", "HUMAN_CONFIRMED", "EXTRACTED"}),
    "EXTRACTED": frozenset({"HUMAN_CONFIRMED", "DISPUTED", "REJECTED", "EVIDENCE_BACKED", "AI_INFERRED"}),
    "AI_INFERRED": frozenset({"HUMAN_CONFIRMED", "REJECTED", "DISPUTED", "EVIDENCE_BACKED"}),
    "EVIDENCE_BACKED": frozenset({"EXTERNALLY_VERIFIED", "DISPUTED", "HUMAN_CONFIRMED", "EXPIRED"}),
    "HUMAN_CONFIRMED": frozenset({"DISPUTED", "EXPIRED", "EVIDENCE_BACKED", "EXTERNALLY_VERIFIED"}),
    "EXTERNALLY_VERIFIED": frozenset({"EXPIRED", "DISPUTED", "REVOKED"}),
    "DISPUTED": frozenset({"REJECTED", "HUMAN_CONFIRMED", "EVIDENCE_BACKED", "REVOKED"}),
    "REJECTED": frozenset({"DISPUTED"}),  # re-open only via dispute path, not direct confirm
    "EXPIRED": frozenset({}),  # renewal requires new claim + evidence
    "REVOKED": frozenset({}),
    "SUPERSEDED": frozenset({}),
    "UNKNOWN": frozenset({"DECLARED", "EXTRACTED", "AI_INFERRED", "REJECTED", "DISPUTED"}),
}

FORBIDDEN_DIRECT = frozenset({
    ("AI_INFERRED", "EXTERNALLY_VERIFIED"),
    ("EXTRACTED", "EXTERNALLY_VERIFIED"),
    ("DECLARED", "EXTERNALLY_VERIFIED"),
    ("REJECTED", "HUMAN_CONFIRMED"),
    ("DISPUTED", "EXTERNALLY_VERIFIED"),
    ("EXPIRED", "DECLARED"),
    ("EXPIRED", "HUMAN_CONFIRMED"),
    ("EXPIRED", "EVIDENCE_BACKED"),
})

PROTECTED_ATTRIBUTES = frozenset({
    "gender", "age", "nationality", "ethnicity", "disability", "religion",
    "sexual_orientation", "health", "union_membership",
})

PROTECTED_INFERENCE_SOURCES = frozenset({
    "photo", "face", "name", "voice", "accent", "address", "school",
    "birthplace", "text_biometrics", "image",
})

PROHIBITED_USE_SEED: tuple[tuple[str, str], ...] = (
    ("emotion_recognition_workplace", "Emotion recognition in workplace"),
    ("personality_inference_face_voice", "Personality inference from face or voice"),
    ("attitude_inference_face_voice", "Attitude inference from face or voice"),
    ("protected_attribute_inference", "Protected attribute inference"),
    ("social_scoring", "Social scoring"),
    ("manipulation", "Manipulative AI use"),
    ("hidden_biometric_categorization", "Hidden biometric categorization"),
    ("automatic_employment_rejection", "Automatic employment rejection without meaningful human review"),
    ("automatic_hiring_decision", "Automatic hiring decision"),
    ("unverifiable_claim_generation", "Unverifiable claim generation presented as fact"),
    ("fake_employment_verification", "Fake employment verification"),
    ("fake_credential_verification", "Fake credential verification"),
    ("confidence_as_certainty", "Confidence presented as certainty"),
)

FLAG_DEFAULTS: tuple[tuple[str, bool, str], ...] = (
    ("CAREER_EVIDENCE_GRAPH_ENABLED", True, "Career Evidence Graph persistence"),
    ("CLAIM_PROVENANCE_ENABLED", True, "Claim provenance statuses and UI"),
    ("CLAIM_DISPUTE_ENABLED", True, "Claim dispute/correction/appeal"),
    ("AI_REGISTRY_ENABLED", True, "AI system registry"),
    ("AI_DECISION_LOG_ENABLED", True, "AI decision run log"),
    ("AI_EXPLAINABILITY_ENABLED", True, "Explainability records"),
    ("AI_HUMAN_OVERRIDE_ENABLED", True, "Human review/override"),
    ("AI_BIAS_MONITORING_ENABLED", True, "Bias/quality monitoring foundation (non-protected)"),
    ("AI_PROTECTED_ATTRIBUTE_MONITORING_ENABLED", False, "Protected attr monitoring — legal hold OFF"),
    ("AI_PROHIBITED_USE_GUARD_ENABLED", True, "Prohibited-use hard blocks"),
    ("AI_PROMPT_REGISTRY_ENABLED", True, "Versioned prompt registry"),
    ("AI_MODEL_LIFECYCLE_ENABLED", True, "Model lifecycle / rollback audit"),
    ("AI_EXTERNAL_VERIFICATION_ENABLED", False, "External verification providers — default OFF"),
    ("AI_AUTONOMOUS_EMPLOYMENT_DECISIONS", False, "Hard ban — never autonomous hire/reject"),
    ("EXTERNAL_PILOT_ENROLLMENT_ENABLED", False, "Founder block — no real enrollment"),
    ("ATS_LIVE_SYNC", False, "Hard ban — ATS live-sync blocked"),
    ("MICROSOFT_CALENDAR_WRITE_ENABLED", False, "Hard ban — MS write blocked"),
    ("STRIPE_PUBLIC_LAUNCH", False, "Hard ban — Stripe public not LIVE"),
    ("AUTOLOGIC_AUTO_KYC", False, "Hard ban — Authologic auto KYC OFF"),
)

SMOKEABLE_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "ai_claim_declared", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "claim_create"},
    {"module_id": "ai_claim_extracted", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "claim_extract"},
    {"module_id": "ai_claim_inferred", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "claim_infer"},
    {"module_id": "ai_claim_provenance", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "provenance"},
    {"module_id": "ai_claim_human_confirm", "owner": "platform", "route": "/recruiter/evidence/claims", "capability": "human_confirm"},
    {"module_id": "ai_claim_evidence_link", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "evidence_link"},
    {"module_id": "ai_claim_evidence_backed", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "lifecycle"},
    {"module_id": "ai_claim_dispute", "owner": "platform", "route": "/dashboard/evidence/disputes", "capability": "dispute"},
    {"module_id": "ai_claim_dispute_resolve", "owner": "platform", "route": "/recruiter/evidence/disputes", "capability": "dispute_resolve"},
    {"module_id": "ai_claim_supersede", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "correction"},
    {"module_id": "ai_claim_history", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "audit_history"},
    {"module_id": "ai_decision_log", "owner": "platform", "route": "/dashboard/evidence/ai-runs", "capability": "decision_log"},
    {"module_id": "ai_explainability", "owner": "platform", "route": "/dashboard/evidence/ai-runs", "capability": "explainability"},
    {"module_id": "ai_human_override", "owner": "platform", "route": "/recruiter/evidence/reviews", "capability": "human_override"},
    {"module_id": "ai_override_audit", "owner": "platform", "route": "/company/evidence/audit", "capability": "override_audit"},
    {"module_id": "ai_tenant_isolation_claim", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "tenancy"},
    {"module_id": "ai_tenant_isolation_evidence", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "tenancy"},
    {"module_id": "ai_prompt_injection_guard", "owner": "platform", "route": "/dashboard/evidence/security", "capability": "security"},
    {"module_id": "ai_protected_attr_ban", "owner": "platform", "route": "/dashboard/evidence/security", "capability": "protected_attr"},
    {"module_id": "ai_prohibited_use_guard", "owner": "platform", "route": "/dashboard/evidence/security", "capability": "prohibited_use"},
    {"module_id": "ai_registry", "owner": "platform", "route": "/board/ai-compliance", "capability": "registry"},
    {"module_id": "ai_prompt_registry", "owner": "platform", "route": "/board/ai-compliance", "capability": "prompt_registry"},
    {"module_id": "ai_model_rollback_audit", "owner": "platform", "route": "/board/ai-compliance", "capability": "model_lifecycle"},
    {"module_id": "ai_compliance_status", "owner": "platform", "route": "/board/ai-compliance", "capability": "status"},
    {"module_id": "ai_smoke_metrics_exclusion", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "smoke_safety"},
    {"module_id": "ai_no_outbound", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "smoke_safety"},
    {"module_id": "ai_consent_visibility", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "privacy"},
    {"module_id": "ai_claim_cleanup", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "cleanup"},
)

HELD_MODULES: tuple[dict[str, str], ...] = (
    {"module_id": "ai_external_verification", "blocker": "EXTERNAL_VERIFICATION_OFF", "owner": "platform", "route": "/dashboard/evidence/claims", "capability": "external_verify"},
    {"module_id": "ai_protected_attr_monitoring", "blocker": "PROTECTED_ATTR_MONITORING_LEGAL_HOLD", "owner": "platform", "route": "/board/ai-compliance", "capability": "bias_protected"},
    {"module_id": "ai_autonomous_employment", "blocker": "AUTONOMOUS_EMPLOYMENT_HARD_BAN", "owner": "platform", "route": "/recruiter/evidence/reviews", "capability": "auto_decide"},
    {"module_id": "ai_act_certified_claim", "blocker": "NO_LEGAL_CERTIFICATION", "owner": "platform", "route": "/board/ai-compliance", "capability": "legal"},
    {"module_id": "ai_wave6_dsr_delete_export", "blocker": "WAVE6_NOT_STARTED", "owner": "privacy", "route": "/dashboard/trust/revoke-delete", "capability": "dsr"},
)

INJECTION_PATTERNS = (
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.I),
    re.compile(r"system\s*:\s*you\s+are", re.I),
    re.compile(r"<\s*/?\s*system\s*>", re.I),
    re.compile(r"exfiltrat(e|ion)|exfil\b", re.I),
    re.compile(r"reveal\s+(your\s+)?(system\s+)?prompt", re.I),
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


def _hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def assert_smoke_user_safe(user: User) -> None:
    if not getattr(user, "exclude_from_product_metrics", False):
        raise ValueError("metrics_exclusion_required_for_ai_compliance_smoke")


def flag_enabled(db: Session, flag_key: str, default: bool = False) -> bool:
    row = (
        db.query(FeatureFlagState)
        .filter(
            FeatureFlagState.flag_key == flag_key,
            FeatureFlagState.scope == "global",
            FeatureFlagState.tenant_id.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        for k, enabled, _notes in FLAG_DEFAULTS:
            if k == flag_key:
                return enabled
        return default
    return bool(row.enabled)


def seed_flags_registry_and_evidence(db: Session) -> int:
    created = 0
    hard_ban = {
        "AI_PROTECTED_ATTRIBUTE_MONITORING_ENABLED",
        "AI_EXTERNAL_VERIFICATION_ENABLED",
        "AI_AUTONOMOUS_EMPLOYMENT_DECISIONS",
        "EXTERNAL_PILOT_ENROLLMENT_ENABLED",
        "ATS_LIVE_SYNC",
        "MICROSOFT_CALENDAR_WRITE_ENABLED",
        "STRIPE_PUBLIC_LAUNCH",
        "AUTOLOGIC_AUTO_KYC",
    }
    for flag_key, enabled, notes in FLAG_DEFAULTS:
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
            db.add(FeatureFlagState(flag_key=flag_key, enabled=enabled, scope="global", notes=notes))
            created += 1
        elif flag_key in hard_ban and existing.enabled:
            existing.enabled = False
            existing.notes = notes

    for use_key, description in PROHIBITED_USE_SEED:
        if db.query(AiProhibitedUse).filter(AiProhibitedUse.use_key == use_key).one_or_none() is None:
            db.add(AiProhibitedUse(use_key=use_key, description=description, severity="PROHIBITED", block_provider_call=True, active=True))
            created += 1

    if db.query(AiSystemRegistry).filter(AiSystemRegistry.ai_system_id == "twin_match_ranker_v1").one_or_none() is None:
        db.add(
            AiSystemRegistry(
                ai_system_id="twin_match_ranker_v1",
                name="Twin Match Ranker",
                description="Suggests match scores — never binding employment decision",
                use_case="matching_recommendation",
                provider="twin_internal",
                model_name="match-ranker",
                model_version="1.0.0",
                deployment_id="prod-match-1",
                environment="production",
                owner="platform",
                business_owner="product",
                technical_owner="platform",
                risk_owner="compliance",
                status="ACTIVE",
                risk_classification="ELEVATED",
                high_risk_candidate=True,
                decision_impact="advisory_only",
                human_oversight_required=True,
                allowed_personas_json=json.dumps(["candidate", "recruiter", "company"]),
                protected_attribute_policy="never_infer",
                prohibited_uses_json=json.dumps(["automatic_hiring_decision", "automatic_employment_rejection"]),
                retention_policy="ai_logs_90d",
                introduced_at=_utcnow(),
                last_reviewed_at=_utcnow(),
            )
        )
        created += 1

    if db.query(AiPromptTemplate).filter(AiPromptTemplate.prompt_template_id == "match_explain_v1", AiPromptTemplate.version == "1.0.0").one_or_none() is None:
        system_prompt = "Explain match factors without protected attributes. Never invent facts."
        db.add(
            AiPromptTemplate(
                prompt_template_id="match_explain_v1",
                use_case="match_explanation",
                version="1.0.0",
                status="ACTIVE",
                owner="platform",
                system_prompt_hash=_hash_text(system_prompt),
                user_prompt_schema=json.dumps({"claim_ids": "list[str]", "job_id": "str"}),
                expected_output_schema=json.dumps({"why": "str", "key_factors": "list[str]"}),
                safety_instructions="No protected attribute inference. No hire/reject language.",
                prohibited_behavior="Do not auto-approve, auto-reject, or invent verification.",
                human_review_requirement=True,
                test_suite="tests/test_ai_compliance.py",
                introduced_at=_utcnow(),
            )
        )
        created += 1

    for item in SMOKEABLE_MODULES:
        if db.query(HardLiveEvidenceRecord).filter(HardLiveEvidenceRecord.module_id == item["module_id"]).one_or_none() is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="platform",
                    wave="ai_compliance",
                    status="PENDING_SMOKE",
                    criteria_json=json.dumps({"hard_live_30": "pending_authenticated_prod_smoke", "capability": item["capability"]}),
                    blocker="authenticated_prod_smoke_required",
                    owner=item["owner"],
                    notes="Do not mark LIVE until Hard LIVE 30 + AI compliance module smoke PASS.",
                )
            )
            created += 1

    for item in HELD_MODULES:
        if db.query(HardLiveEvidenceRecord).filter(HardLiveEvidenceRecord.module_id == item["module_id"]).one_or_none() is None:
            db.add(
                HardLiveEvidenceRecord(
                    module_id=item["module_id"],
                    persona="platform",
                    wave="ai_compliance",
                    status="HELD_POLICY",
                    criteria_json=json.dumps({"hard_live_30": "held", "capability": item["capability"]}),
                    blocker=item["blocker"],
                    owner=item["owner"],
                    notes="Policy/legal/Wave 6 hold — not Phase A engineering LIVE.",
                )
            )
            created += 1

    if created:
        db.commit()
        logger.info("ai_compliance_seeded", extra={"created": created})
    return created


def _serialize_claim(row: CareerClaim) -> dict[str, Any]:
    return {
        "claim_id": row.claim_id,
        "tenant_id": row.tenant_id,
        "subject_type": row.subject_type,
        "subject_id": row.subject_id,
        "claim_type": row.claim_type,
        "claim_key": row.claim_key,
        "claim_value": row.claim_value,
        "normalized_value": row.normalized_value,
        "value_schema_version": row.value_schema_version,
        "status": row.status,
        "confidence": row.confidence,
        "confidence_method": row.confidence_method,
        "source_type": row.source_type,
        "source_id": row.source_id,
        "source_uri_or_reference": row.source_uri_or_reference,
        "source_hash": row.source_hash,
        "created_by_actor_type": row.created_by_actor_type,
        "created_by_actor_id": row.created_by_actor_id,
        "valid_from": _iso(row.valid_from),
        "valid_until": _iso(row.valid_until),
        "verified_at": _iso(row.verified_at),
        "verified_by": row.verified_by,
        "disputed_at": _iso(row.disputed_at),
        "disputed_by": row.disputed_by,
        "expired_at": _iso(row.expired_at),
        "superseded_by_claim_id": row.superseded_by_claim_id,
        "model_run_id": row.model_run_id,
        "prompt_version_id": row.prompt_version_id,
        "evidence_count": row.evidence_count,
        "human_confirmation_required": row.human_confirmation_required,
        "human_confirmation_status": row.human_confirmation_status,
        "visibility_scope": row.visibility_scope,
        "retention_policy": row.retention_policy,
        "legal_basis_reference": row.legal_basis_reference,
        "audit_correlation_id": row.audit_correlation_id,
        "owner_user_id": row.owner_user_id,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
        "is_verified_boolean_forbidden": True,
        "display_provenance": row.status,
    }


def _append_history(
    db: Session,
    *,
    claim_id: str,
    from_status: str | None,
    to_status: str,
    actor_type: str,
    actor_id: str | None,
    reason_code: str | None = None,
    notes: str | None = None,
    audit_correlation_id: str | None = None,
) -> None:
    db.add(
        ClaimStatusHistory(
            claim_id=claim_id,
            from_status=from_status,
            to_status=to_status,
            actor_type=actor_type,
            actor_id=actor_id,
            reason_code=reason_code,
            notes=(notes or "")[:500] or None,
            audit_correlation_id=audit_correlation_id,
        )
    )


def validate_transition(from_status: str, to_status: str, *, has_evidence: bool = False, dispute_resolved: bool = False) -> None:
    if from_status == to_status:
        return
    if (from_status, to_status) in FORBIDDEN_DIRECT:
        raise ValueError(f"forbidden_transition:{from_status}->{to_status}")
    if to_status == "SUPERSEDED" or to_status == "REVOKED":
        if from_status not in ACTIVE_STATUSES and from_status not in {"REJECTED", "DISPUTED", "EXTERNALLY_VERIFIED"}:
            if from_status in {"SUPERSEDED", "REVOKED", "EXPIRED"}:
                raise ValueError(f"terminal_status_cannot_transition:{from_status}")
        return
    if to_status == "EXTERNALLY_VERIFIED" and not has_evidence:
        raise ValueError("externally_verified_requires_evidence")
    if from_status == "DISPUTED" and to_status in {"HUMAN_CONFIRMED", "EVIDENCE_BACKED"} and not dispute_resolved:
        raise ValueError("dispute_requires_resolution_event")
    allowed = ALLOWED_TRANSITIONS.get(from_status, frozenset())
    if to_status not in allowed and to_status not in {"SUPERSEDED", "REVOKED"}:
        raise ValueError(f"invalid_transition:{from_status}->{to_status}")


def scan_prompt_injection(text: str) -> dict[str, Any]:
    hits = [p.pattern for p in INJECTION_PATTERNS if p.search(text or "")]
    return {"blocked": bool(hits), "patterns": hits, "neutralized": bool(hits)}


def assert_not_protected_inference(*, attribute: str | None = None, source: str | None = None, use_key: str | None = None) -> None:
    attr = (attribute or "").strip().lower()
    src = (source or "").strip().lower()
    if attr in PROTECTED_ATTRIBUTES or use_key == "protected_attribute_inference":
        raise ValueError("protected_attribute_inference_forbidden")
    if src in PROTECTED_INFERENCE_SOURCES:
        raise ValueError("protected_attribute_inference_source_forbidden")


def assert_not_prohibited(db: Session, use_key: str) -> None:
    seed_flags_registry_and_evidence(db)
    if not flag_enabled(db, "AI_PROHIBITED_USE_GUARD_ENABLED", True):
        return
    row = db.query(AiProhibitedUse).filter(AiProhibitedUse.use_key == use_key, AiProhibitedUse.active.is_(True)).one_or_none()
    if row is not None:
        record_domain_event(
            db,
            event_name="ai.prohibited_use_blocked",
            aggregate_type="ai_prohibited_use",
            aggregate_id=use_key,
            payload={"use_key": use_key, "provider_call": False},
        )
        raise ValueError(f"prohibited_use_blocked:{use_key}")


def assert_no_autonomous_employment(db: Session, *, action: str) -> None:
    if flag_enabled(db, "AI_AUTONOMOUS_EMPLOYMENT_DECISIONS", False):
        # Even if somehow flipped, hard-ban in code.
        pass
    if action in {"auto_hire", "auto_reject", "binding_employment_decision"}:
        raise ValueError("autonomous_employment_decision_forbidden")


def create_claim(
    db: Session,
    *,
    user: User,
    subject_type: str,
    subject_id: str,
    claim_type: str,
    claim_key: str,
    claim_value: str,
    status: str,
    source_type: str,
    actor_type: str,
    tenant_id: int | None = None,
    source_id: str | None = None,
    source_uri: str | None = None,
    confidence: float | None = None,
    confidence_method: str | None = None,
    model_run_id: str | None = None,
    prompt_version_id: str | None = None,
    visibility_scope: str = "subject",
    human_confirmation_required: bool | None = None,
) -> dict[str, Any]:
    seed_flags_registry_and_evidence(db)
    if not flag_enabled(db, "CAREER_EVIDENCE_GRAPH_ENABLED", True):
        raise ValueError("career_evidence_graph_disabled")
    if status not in CLAIM_STATUSES:
        raise ValueError(f"invalid_claim_status:{status}")
    if status == "AI_INFERRED" and (not model_run_id or not prompt_version_id):
        raise ValueError("ai_inferred_requires_model_and_prompt_provenance")
    if status == "EXTERNALLY_VERIFIED":
        raise ValueError("cannot_create_as_externally_verified")
    if claim_type.lower() in PROTECTED_ATTRIBUTES or claim_key.lower() in PROTECTED_ATTRIBUTES:
        raise ValueError("protected_attribute_claim_forbidden")

    require_human = human_confirmation_required
    if require_human is None:
        require_human = status in {"AI_INFERRED", "EXTRACTED"}

    claim_id = _new_id("clm")
    source_hash = _hash_text(f"{claim_type}:{claim_key}:{claim_value}:{source_type}:{source_id or ''}")
    row = CareerClaim(
        claim_id=claim_id,
        tenant_id=tenant_id,
        subject_type=subject_type,
        subject_id=subject_id,
        claim_type=claim_type,
        claim_key=claim_key,
        claim_value=claim_value,
        normalized_value=claim_value.strip().lower(),
        value_schema_version="1",
        status=status,
        confidence=confidence,
        confidence_method=confidence_method,
        source_type=source_type,
        source_id=source_id,
        source_uri_or_reference=source_uri,
        source_hash=source_hash,
        created_by_actor_type=actor_type,
        created_by_actor_id=str(user.id),
        human_confirmation_required=bool(require_human),
        human_confirmation_status="PENDING" if require_human else None,
        visibility_scope=visibility_scope,
        retention_policy="standard",
        audit_correlation_id=_new_id("aud"),
        owner_user_id=user.id,
        model_run_id=model_run_id,
        prompt_version_id=prompt_version_id,
    )
    db.add(row)
    _append_history(
        db,
        claim_id=claim_id,
        from_status=None,
        to_status=status,
        actor_type=actor_type,
        actor_id=str(user.id),
        reason_code="created",
        audit_correlation_id=row.audit_correlation_id,
    )
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="career_claim.created",
        aggregate_type="career_claim",
        aggregate_id=claim_id,
        actor_user_id=user.id,
        tenant_id=tenant_id,
        payload={"status": status, "claim_type": claim_type},
    )
    return _serialize_claim(row)


def get_claim(db: Session, claim_id: str, *, user: User, tenant_id: int | None = None) -> dict[str, Any]:
    row = db.query(CareerClaim).filter(CareerClaim.claim_id == claim_id).one_or_none()
    if row is None:
        raise ValueError("claim_not_found")
    if row.tenant_id is not None and tenant_id is not None and row.tenant_id != tenant_id:
        raise ValueError("cross_tenant_claim_denied")
    if row.owner_user_id not in (None, user.id) and row.visibility_scope == "subject":
        # allow owner; recruiters use shared visibility scopes
        if row.visibility_scope == "subject" and row.owner_user_id != user.id:
            raise ValueError("claim_visibility_denied")
    return _serialize_claim(row)


def list_claims_for_user(db: Session, user: User, *, limit: int = 50) -> dict[str, Any]:
    seed_flags_registry_and_evidence(db)
    rows = (
        db.query(CareerClaim)
        .filter(CareerClaim.owner_user_id == user.id)
        .order_by(CareerClaim.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"items": [_serialize_claim(r) for r in rows], "count": len(rows)}


def transition_claim(
    db: Session,
    *,
    user: User,
    claim_id: str,
    to_status: str,
    reason_code: str | None = None,
    notes: str | None = None,
    tenant_id: int | None = None,
    dispute_resolved: bool = False,
    actor_type: str = "human",
) -> dict[str, Any]:
    row = db.query(CareerClaim).filter(CareerClaim.claim_id == claim_id).one_or_none()
    if row is None:
        raise ValueError("claim_not_found")
    if row.tenant_id is not None and tenant_id is not None and row.tenant_id != tenant_id:
        raise ValueError("cross_tenant_claim_denied")
    has_evidence = row.evidence_count > 0
    validate_transition(row.status, to_status, has_evidence=has_evidence, dispute_resolved=dispute_resolved)
    if to_status == "EXTERNALLY_VERIFIED":
        if not flag_enabled(db, "AI_EXTERNAL_VERIFICATION_ENABLED", False):
            raise ValueError("external_verification_disabled")
        if not has_evidence:
            raise ValueError("externally_verified_requires_evidence")
    from_status = row.status
    row.status = to_status
    row.updated_at = _utcnow()
    if to_status == "HUMAN_CONFIRMED":
        row.human_confirmation_status = "CONFIRMED"
        row.verified_at = _utcnow()
        row.verified_by = str(user.id)
    if to_status == "DISPUTED":
        row.disputed_at = _utcnow()
        row.disputed_by = str(user.id)
    if to_status == "EXPIRED":
        row.expired_at = _utcnow()
    _append_history(
        db,
        claim_id=claim_id,
        from_status=from_status,
        to_status=to_status,
        actor_type=actor_type,
        actor_id=str(user.id),
        reason_code=reason_code,
        notes=notes,
        audit_correlation_id=row.audit_correlation_id,
    )
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="career_claim.transitioned",
        aggregate_type="career_claim",
        aggregate_id=claim_id,
        actor_user_id=user.id,
        tenant_id=row.tenant_id,
        payload={"from": from_status, "to": to_status},
    )
    return _serialize_claim(row)


def create_evidence(
    db: Session,
    *,
    user: User,
    evidence_type: str,
    source_type: str,
    tenant_id: int | None = None,
    source_reference: str | None = None,
    structured_payload: dict[str, Any] | None = None,
    visibility_scope: str = "subject",
) -> dict[str, Any]:
    inj = scan_prompt_injection(json.dumps(structured_payload or {}) + (source_reference or ""))
    if inj["blocked"]:
        record_domain_event(
            db,
            event_name="ai.prompt_injection_blocked",
            aggregate_type="career_evidence",
            aggregate_id=_new_id("blk"),
            actor_user_id=user.id,
            payload=inj,
        )
        raise ValueError("prompt_injection_blocked")
    evidence_id = _new_id("evd")
    redacted = None
    if structured_payload:
        redacted = {k: ("[REDACTED]" if k.lower() in {"ssn", "password", "secret", "token"} else v) for k, v in structured_payload.items()}
    row = CareerEvidenceObject(
        evidence_id=evidence_id,
        tenant_id=tenant_id,
        evidence_type=evidence_type,
        source_type=source_type,
        source_reference=source_reference,
        source_hash=_hash_text(source_reference or evidence_id),
        received_at=_utcnow(),
        verification_status="unverified",
        structured_payload=json.dumps(structured_payload) if structured_payload else None,
        redacted_payload=json.dumps(redacted) if redacted else None,
        sensitivity="standard",
        visibility_scope=visibility_scope,
        retention_policy="standard",
        audit_correlation_id=_new_id("aud"),
        owner_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "evidence_id": row.evidence_id,
        "evidence_type": row.evidence_type,
        "verification_status": row.verification_status,
        "auto_truth": False,
        "tenant_id": row.tenant_id,
        "owner_user_id": row.owner_user_id,
        "created_at": _iso(row.created_at),
    }


def link_evidence(
    db: Session,
    *,
    user: User,
    claim_id: str,
    evidence_id: str,
    link_role: str = "supports",
    explicit_multi_link: bool = False,
    tenant_id: int | None = None,
) -> dict[str, Any]:
    claim = db.query(CareerClaim).filter(CareerClaim.claim_id == claim_id).one_or_none()
    evidence = db.query(CareerEvidenceObject).filter(CareerEvidenceObject.evidence_id == evidence_id).one_or_none()
    if claim is None or evidence is None:
        raise ValueError("claim_or_evidence_not_found")
    if claim.tenant_id is not None and evidence.tenant_id is not None and claim.tenant_id != evidence.tenant_id:
        raise ValueError("cross_tenant_evidence_link_denied")
    if tenant_id is not None and claim.tenant_id is not None and claim.tenant_id != tenant_id:
        raise ValueError("cross_tenant_claim_denied")
    existing_links = db.query(ClaimEvidenceLink).filter(ClaimEvidenceLink.evidence_id == evidence_id).count()
    if existing_links > 0 and not explicit_multi_link:
        raise ValueError("evidence_multi_link_requires_explicit_flag")
    db.add(
        ClaimEvidenceLink(
            claim_id=claim_id,
            evidence_id=evidence_id,
            link_role=link_role,
            explicit_multi_link=explicit_multi_link,
            created_by_actor_id=str(user.id),
        )
    )
    claim.evidence_count = int(claim.evidence_count or 0) + 1
    db.commit()
    return {"claim_id": claim_id, "evidence_id": evidence_id, "link_role": link_role, "evidence_count": claim.evidence_count}


def raise_dispute(
    db: Session,
    *,
    user: User,
    claim_id: str,
    reason_code: str,
    free_text: str | None = None,
    evidence_ids: list[str] | None = None,
) -> dict[str, Any]:
    if not flag_enabled(db, "CLAIM_DISPUTE_ENABLED", True):
        raise ValueError("claim_dispute_disabled")
    claim = db.query(CareerClaim).filter(CareerClaim.claim_id == claim_id).one_or_none()
    if claim is None:
        raise ValueError("claim_not_found")
    dispute_id = _new_id("dsp")
    row = ClaimDispute(
        dispute_id=dispute_id,
        claim_id=claim_id,
        raised_by=str(user.id),
        reason_code=reason_code,
        free_text=free_text,
        evidence_ids_json=json.dumps(evidence_ids or []),
        status="OPEN",
        audit_correlation_id=_new_id("aud"),
        tenant_id=claim.tenant_id,
    )
    db.add(row)
    transition_claim(db, user=user, claim_id=claim_id, to_status="DISPUTED", reason_code=reason_code, notes=free_text, actor_type="subject")
    db.add(
        AiInAppNotification(
            notification_id=_new_id("ntf"),
            user_id=user.id,
            kind="claim_dispute_opened",
            payload_json=json.dumps({"dispute_id": dispute_id, "claim_id": claim_id}),
        )
    )
    db.commit()
    db.refresh(row)
    return {
        "dispute_id": row.dispute_id,
        "claim_id": claim_id,
        "status": row.status,
        "email_sent": False,
        "in_app_only": True,
    }


def resolve_dispute(
    db: Session,
    *,
    user: User,
    dispute_id: str,
    resolution: str,
    resolution_reason: str,
    to_claim_status: str,
) -> dict[str, Any]:
    row = db.query(ClaimDispute).filter(ClaimDispute.dispute_id == dispute_id).one_or_none()
    if row is None:
        raise ValueError("dispute_not_found")
    row.status = "RESOLVED"
    row.resolution = resolution
    row.resolution_reason = resolution_reason
    row.resolved_at = _utcnow()
    row.resolved_by = str(user.id)
    db.commit()
    transition_claim(
        db,
        user=user,
        claim_id=row.claim_id,
        to_status=to_claim_status,
        reason_code=f"dispute_{resolution}",
        notes=resolution_reason,
        dispute_resolved=True,
        actor_type="reviewer",
    )
    return {"dispute_id": dispute_id, "status": "RESOLVED", "resolution": resolution, "claim_id": row.claim_id}


def supersede_claim(
    db: Session,
    *,
    user: User,
    claim_id: str,
    new_value: str,
    reason_code: str = "correction",
) -> dict[str, Any]:
    old = db.query(CareerClaim).filter(CareerClaim.claim_id == claim_id).one_or_none()
    if old is None:
        raise ValueError("claim_not_found")
    new = create_claim(
        db,
        user=user,
        subject_type=old.subject_type,
        subject_id=old.subject_id,
        claim_type=old.claim_type,
        claim_key=old.claim_key,
        claim_value=new_value,
        status="DECLARED",
        source_type="human_correction",
        actor_type="human",
        tenant_id=old.tenant_id,
        visibility_scope=old.visibility_scope,
        human_confirmation_required=False,
    )
    old.superseded_by_claim_id = new["claim_id"]
    transition_claim(db, user=user, claim_id=claim_id, to_status="SUPERSEDED", reason_code=reason_code, actor_type="human")
    history = (
        db.query(ClaimStatusHistory)
        .filter(ClaimStatusHistory.claim_id == claim_id)
        .order_by(ClaimStatusHistory.created_at.asc())
        .all()
    )
    return {
        "original_claim_id": claim_id,
        "new_claim_id": new["claim_id"],
        "original_history_immutable": True,
        "history_count": len(history),
        "new_claim": new,
    }


def record_ai_run(
    db: Session,
    *,
    user: User,
    ai_system_id: str,
    prompt_template_id: str,
    prompt_version: str,
    model_version: str,
    output_type: str,
    redacted_input: dict[str, Any] | None = None,
    redacted_output: dict[str, Any] | None = None,
    confidence: float | None = None,
    decision_impact: str = "advisory_only",
    created_claim_ids: list[str] | None = None,
) -> dict[str, Any]:
    seed_flags_registry_and_evidence(db)
    if not flag_enabled(db, "AI_DECISION_LOG_ENABLED", True):
        raise ValueError("ai_decision_log_disabled")
    assert_no_autonomous_employment(db, action="binding_employment_decision" if decision_impact == "binding" else "advisory")
    if decision_impact == "binding":
        raise ValueError("binding_ai_employment_decision_forbidden")
    run_id = _new_id("run")
    row = AiDecisionRun(
        ai_run_id=run_id,
        ai_system_id=ai_system_id,
        model_version=model_version,
        prompt_template_id=prompt_template_id,
        prompt_version=prompt_version,
        input_hash=_hash_text(json.dumps(redacted_input or {}, sort_keys=True)),
        output_hash=_hash_text(json.dumps(redacted_output or {}, sort_keys=True)),
        output_type=output_type,
        redacted_input_json=json.dumps(redacted_input or {}),
        redacted_output_json=json.dumps(redacted_output or {}),
        confidence=confidence,
        confidence_method="model_score",
        human_review_required=True,
        human_review_status="PENDING",
        decision_impact=decision_impact,
        created_claim_ids_json=json.dumps(created_claim_ids or []),
        retention_policy="ai_logs_90d",
        audit_correlation_id=_new_id("aud"),
        owner_user_id=user.id,
        protected_attribute_used=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ai_run_id": row.ai_run_id,
        "ai_system_id": row.ai_system_id,
        "model_version": row.model_version,
        "prompt_template_id": row.prompt_template_id,
        "prompt_version": row.prompt_version,
        "human_review_required": row.human_review_required,
        "decision_impact": row.decision_impact,
        "protected_attribute_used": False,
        "created_at": _iso(row.created_at),
    }


def create_explanation(
    db: Session,
    *,
    ai_run_id: str,
    why: str,
    based_on: list[str] | None = None,
    data_used: list[str] | None = None,
    data_not_used: list[str] | None = None,
    key_factors: list[str] | None = None,
    limitations: str | None = None,
    confidence: float | None = None,
    completeness: str = "PARTIAL",
) -> dict[str, Any]:
    run = db.query(AiDecisionRun).filter(AiDecisionRun.ai_run_id == ai_run_id).one_or_none()
    if run is None:
        raise ValueError("ai_run_not_found")
    explanation_id = _new_id("exp")
    row = AiExplanation(
        explanation_id=explanation_id,
        ai_run_id=ai_run_id,
        why=why,
        based_on_json=json.dumps(based_on or []),
        data_used_json=json.dumps(data_used or []),
        data_not_used_json=json.dumps(data_not_used or ["protected_attributes"]),
        key_factors_json=json.dumps(key_factors or []),
        limitations=limitations or "Explanation may be incomplete; human review required.",
        confidence=confidence,
        uncertainty="Scores are advisory, not certainty.",
        human_action_required=True,
        prohibited_interpretation="Do not treat as hire/reject decision or verified fact.",
        model_and_prompt_version=f"{run.model_version}/{run.prompt_template_id}@{run.prompt_version}",
        completeness=completeness,
    )
    db.add(row)
    run.explanation_reference = explanation_id
    db.commit()
    return {
        "explanation_id": explanation_id,
        "ai_run_id": ai_run_id,
        "why": why,
        "completeness": completeness,
        "human_action_required": True,
        "data_not_used": data_not_used or ["protected_attributes"],
    }


def human_review(
    db: Session,
    *,
    user: User,
    ai_run_id: str,
    final_outcome: str,
    reason_code: str,
    justification: str,
    claim_id: str | None = None,
) -> dict[str, Any]:
    if not flag_enabled(db, "AI_HUMAN_OVERRIDE_ENABLED", True):
        raise ValueError("human_override_disabled")
    assert_no_autonomous_employment(db, action="auto_hire" if final_outcome == "hire" else "advisory")
    if final_outcome in {"hire", "reject_binding", "auto_reject"}:
        raise ValueError("binding_employment_outcome_via_ai_path_forbidden")
    run = db.query(AiDecisionRun).filter(AiDecisionRun.ai_run_id == ai_run_id).one_or_none()
    if run is None:
        raise ValueError("ai_run_not_found")
    review_id = _new_id("rev")
    row = AiHumanReview(
        review_id=review_id,
        ai_run_id=ai_run_id,
        claim_id=claim_id,
        status="COMPLETED",
        actor=str(user.id),
        actor_role="reviewer",
        original_output_ref=run.output_hash,
        final_outcome=final_outcome,
        reason_code=reason_code,
        justification=justification,
        audit_correlation_id=_new_id("aud"),
        resolved_at=_utcnow(),
    )
    db.add(row)
    run.human_review_status = "COMPLETED"
    run.human_reviewer = str(user.id)
    run.human_override = True
    run.override_reason = justification
    run.accepted = final_outcome == "accept_advisory"
    run.rejected = final_outcome in {"reject_advisory", "reject"}
    db.commit()
    record_domain_event(
        db,
        event_name="ai.human_override",
        aggregate_type="ai_decision_run",
        aggregate_id=ai_run_id,
        actor_user_id=user.id,
        payload={"review_id": review_id, "final_outcome": final_outcome},
    )
    return {
        "review_id": review_id,
        "ai_run_id": ai_run_id,
        "final_outcome": final_outcome,
        "human_override": True,
        "audited": True,
    }


def claim_history(db: Session, claim_id: str) -> dict[str, Any]:
    rows = (
        db.query(ClaimStatusHistory)
        .filter(ClaimStatusHistory.claim_id == claim_id)
        .order_by(ClaimStatusHistory.created_at.asc())
        .all()
    )
    return {
        "claim_id": claim_id,
        "immutable": True,
        "items": [
            {
                "from_status": r.from_status,
                "to_status": r.to_status,
                "actor_type": r.actor_type,
                "actor_id": r.actor_id,
                "reason_code": r.reason_code,
                "created_at": _iso(r.created_at),
            }
            for r in rows
        ],
    }


def list_hard_live_evidence(db: Session) -> dict[str, Any]:
    seed_flags_registry_and_evidence(db)
    rows = (
        db.query(HardLiveEvidenceRecord)
        .filter(HardLiveEvidenceRecord.wave == "ai_compliance")
        .order_by(HardLiveEvidenceRecord.module_id.asc())
        .all()
    )
    return {
        "wave": "ai_compliance",
        "live_claim_forbidden_until_smoke": True,
        "pilot": "BLOCKED_BY_FOUNDER",
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "items": [
            {
                "module_id": r.module_id,
                "status": r.status,
                "blocker": r.blocker,
                "owner": r.owner,
                "smoke_sha": r.smoke_sha,
                "smoke_at": _iso(r.smoke_at),
                "notes": r.notes,
            }
            for r in rows
        ],
        "counts": {
            "total": len(rows),
            "pending_smoke": sum(1 for r in rows if r.status == "PENDING_SMOKE"),
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
) -> dict[str, Any]:
    held_ids = {m["module_id"] for m in HELD_MODULES}
    if module_id in held_ids and status == "PASS":
        raise ValueError("policy_held_module_cannot_pass")
    row = db.query(HardLiveEvidenceRecord).filter(HardLiveEvidenceRecord.module_id == module_id).one_or_none()
    if row is None:
        raise ValueError(f"Unknown module_id: {module_id}")
    row.status = status
    row.smoke_sha = smoke_sha
    row.smoke_at = _utcnow() if status in {"PASS", "FAIL", "PARTIAL"} else None
    if notes:
        row.notes = notes[:2000]
    if status == "PASS":
        row.blocker = None
    db.commit()
    db.refresh(row)
    return {"module_id": row.module_id, "status": row.status, "smoke_sha": row.smoke_sha, "smoke_at": _iso(row.smoke_at)}


def compliance_status(db: Session) -> dict[str, Any]:
    seed_flags_registry_and_evidence(db)
    evidence = list_hard_live_evidence(db)
    return {
        "name": "career_evidence_ai_compliance",
        "phase": "A",
        "live_claim": False,
        "pilot_stance": "BLOCKED_BY_FOUNDER",
        "gate_f": "PENDING",
        "launch": "NO-GO",
        "phase_3b": "UNCHANGED",
        "wave4": "NOT_IMPLEMENTED",
        "wave6": "NOT_STARTED",
        "external_pilot_enrollment_enabled": False,
        "ai_autonomous_employment_decisions": False,
        "ai_external_verification_enabled": False,
        "ai_protected_attribute_monitoring_enabled": False,
        "ai_act_certified": False,
        "compliance_language": "readiness_and_control_coverage_only",
        "smokeable_module_ids": [m["module_id"] for m in SMOKEABLE_MODULES],
        "held_module_ids": [m["module_id"] for m in HELD_MODULES],
        "evidence": evidence["counts"],
        "flags": {k: flag_enabled(db, k, d) for k, d, _n in FLAG_DEFAULTS},
        "checked_at": _utcnow().isoformat(),
    }


def ai_inventory(db: Session) -> dict[str, Any]:
    seed_flags_registry_and_evidence(db)
    systems = db.query(AiSystemRegistry).all()
    prompts = db.query(AiPromptTemplate).all()
    prohibited = db.query(AiProhibitedUse).filter(AiProhibitedUse.active.is_(True)).all()
    return {
        "systems": [
            {
                "ai_system_id": s.ai_system_id,
                "name": s.name,
                "model_name": s.model_name,
                "model_version": s.model_version,
                "status": s.status,
                "risk_classification": s.risk_classification,
                "decision_impact": s.decision_impact,
                "human_oversight_required": s.human_oversight_required,
            }
            for s in systems
        ],
        "prompts": [
            {
                "prompt_template_id": p.prompt_template_id,
                "version": p.version,
                "status": p.status,
                "system_prompt_hash": p.system_prompt_hash,
                "human_review_requirement": p.human_review_requirement,
            }
            for p in prompts
        ],
        "prohibited_uses": [{"use_key": p.use_key, "description": p.description} for p in prohibited],
        "protected_attributes_default": "OFF_never_infer",
        "legal_certification_claimed": False,
    }


def observability_metrics(db: Session) -> dict[str, Any]:
    seed_flags_registry_and_evidence(db)
    return {
        "metrics": [
            "twin_ai_claims_total",
            "twin_ai_claim_transitions_total",
            "twin_ai_disputes_total",
            "twin_ai_decision_runs_total",
            "twin_ai_human_overrides_total",
            "twin_ai_prohibited_use_blocked_total",
            "twin_ai_prompt_injection_blocked_total",
            "twin_ai_protected_attr_blocked_total",
            "twin_ai_compliance_smoke_fail_closed_total",
        ],
        "claims": db.query(CareerClaim).count(),
        "decision_runs": db.query(AiDecisionRun).count(),
        "disputes_open": db.query(ClaimDispute).filter(ClaimDispute.status == "OPEN").count(),
        "pending_smoke": list_hard_live_evidence(db)["counts"]["pending_smoke"],
    }


def security_review() -> dict[str, Any]:
    return {
        "prompt_injection_guards": True,
        "cross_tenant_deny": True,
        "idor_owner_visibility": True,
        "evidence_access_scoped": True,
        "pii_redaction_on_evidence": True,
        "secrets_not_in_prompt_registry": True,
        "audit_append_only_claim_history": True,
        "autonomous_employment_hard_ban": True,
        "protected_attribute_hard_ban": True,
        "notes": "Phase A foundation — continuous review required; not a security certification.",
    }


def bias_monitoring_foundation(db: Session) -> dict[str, Any]:
    return {
        "enabled": flag_enabled(db, "AI_BIAS_MONITORING_ENABLED", True),
        "protected_attribute_monitoring": False,
        "legal_hold": "AI_PROTECTED_ATTRIBUTE_MONITORING_ENABLED remains false pending legal basis",
        "proxy_metrics": [
            "outcome_distribution",
            "ranking_distribution",
            "override_rate",
            "disagreement_rate",
            "confidence_calibration",
            "missing_data_rate",
        ],
        "individual_protected_attr_visibility": False,
    }


def rollback_prompt_version(db: Session, *, prompt_template_id: str, to_version: str) -> dict[str, Any]:
    row = (
        db.query(AiPromptTemplate)
        .filter(AiPromptTemplate.prompt_template_id == prompt_template_id, AiPromptTemplate.version == to_version)
        .one_or_none()
    )
    if row is None:
        raise ValueError("prompt_version_not_found")
    # Deprecate other active versions; keep hashes for audit.
    others = (
        db.query(AiPromptTemplate)
        .filter(AiPromptTemplate.prompt_template_id == prompt_template_id, AiPromptTemplate.version != to_version)
        .all()
    )
    for other in others:
        if other.status == "ACTIVE":
            other.status = "DEPRECATED"
            other.deprecated_at = _utcnow()
            other.superseded_by = to_version
    row.status = "ACTIVE"
    db.commit()
    record_domain_event(
        db,
        event_name="ai.prompt_rollback",
        aggregate_type="ai_prompt_template",
        aggregate_id=prompt_template_id,
        payload={"to_version": to_version, "audit_preserved": True},
    )
    return {"prompt_template_id": prompt_template_id, "active_version": to_version, "audit_preserved": True}
