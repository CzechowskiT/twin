# Verified Candidate Gateway — 2026-05-28

## Purpose

TWIN's Verified Candidate Gateway is the trust boundary between a candidate profile and any delegated application capability.
It exists to prevent spam automation and ensure every delegated action is consented, evidence-backed, and auditable.

## Product principles

- Candidate-first truth model: no fake claims, no inferred facts presented as verified.
- Consent-first operation: no delegated apply without explicit candidate authorization.
- Evidence-over-volume: prioritize acceptance-ready signals over raw application count.
- Guardrail-first automation: prepare package before any external submit capability.
- Honest status language: "ready", "missing", and "blocked" are explicit and explainable.

## Gateway status model (MVP)

- `unverified`: default fallback.
- `profile_incomplete`: missing core candidate profile data.
- `consent_missing`: required candidate consent not present.
- `cv_missing`: CV material unavailable.
- `career_brief_missing`: structured candidate intent unavailable.
- `skill_evidence_missing`: no skill-evidence baseline.
- `ready_for_review`: optional ops/reviewer queue state before basic verification.
- `verified_basic`: profile passes baseline checks.
- `delegated_apply_enabled`: delegated-apply consent present and active.
- `suspended`: account or trust state blocked.

## Gateway output contract

Read-only readiness responses should include:

- `verification_status`
- `checklist`
- `missing_items`
- `blocked_reasons`
- `delegated_apply_allowed`
- `can_prepare_application_package`
- `can_submit_delegated_application`

## Safety constraints for this slice

- No real apply execution.
- No live auto-apply execution.
- No scraping.
- No production migration/deploy/env changes.
- No KYC document workflow implementation.

## Current implementation note

Backend now exposes a read-only gate endpoint:

- `GET /api/v1/candidates/me/verified-readiness`

Current behavior is intentionally conservative:

- `delegated_apply_allowed=false` unless explicit delegated consent model is implemented.
- `can_submit_delegated_application=false` in all current states.
