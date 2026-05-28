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

Logic lives in `app/services/candidate_readiness.py` (`compute_verified_candidate_gate`).

### Status transitions (no migration)

1. Missing profile → `profile_incomplete`
2. Missing GDPR consent → `consent_missing`
3. Missing CV material → `cv_missing`
4. Missing career compass blob → `career_brief_missing`
5. Missing `cv_insights` blob → `skill_evidence_missing`
6. Inactive user → `suspended`
7. All checklist items present, no verification marker → `ready_for_review`
8. All checklist items present + `verified_gateway.basic_verified_at` / `review_passed` in `profile_signals_json`, or `user.identity_verified_at` set → `verified_basic`

Current behavior is intentionally conservative:

- `delegated_apply_allowed=false` unless explicit delegated consent model is implemented (see `docs/DELEGATED_APPLY_CONSENT_MODEL_2026-05-28.md`).
- `can_prepare_application_package=true` for `ready_for_review` and `verified_basic`.
- `can_submit_delegated_application=false` in all current states.

### Frontend (planned)

Read-only dashboard card: checklist + `verification_status` + link to profile/CV/consent fixes.
No submit CTA until delegated consent ships.
