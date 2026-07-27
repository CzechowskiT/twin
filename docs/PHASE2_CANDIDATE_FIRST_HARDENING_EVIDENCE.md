# Phase 2 — Candidate-First production hardening evidence

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Phase:** Phase 2 production hardening only (not Activation re-run, not Phase 3 Career Agent)  
**Primary product:** candidate  
**Org-first:** `SECONDARY_B2B_PILOT_PATH — NOT PRIMARY PRODUCT VALIDATION`  
**ALTEN pack:** NOT_PREPARED  

## Verdict target

`CANDIDATE-FIRST PILOT PRODUCTION-HARDENED — READY FOR FOUNDER COHORT INTAKE`

Activation readiness_state remains `READY_FOR_COHORT_INPUT` until Founder named intake.  
`phase2_status=PRODUCTION_HARDENED` means reliability gaps closed; cohort intake is the only external gate.

## Closed Cursor-fixable gaps (summary)

| ID | Sev | Area | Fix |
|----|-----|------|-----|
| CF-H01 | P0 | Invite→register bridge | DB allowlist + invite token on register |
| CF-H02 | P0 | Candidate send API | POST send with dry_run default; execute only with Founder ref |
| CF-H03 | P0 | AI kill switch on CV | `AI_INTEL_KILL_SWITCH` → rules_v1 fallback |
| CF-H04 | P1 | Invite token lifecycle | mint/expiry/revoke/rate-limit/consume |
| CF-H05 | P1 | Onboarding durability | PUT/GET `/auth/onboarding/progress` |
| CF-H06 | P1 | Onboarding gate | fail-closed after retries |
| CF-H07 | P1 | CV MIME magic | `assert_cv_content_matches_extension` |
| CF-H08 | P1 | CV worker retries | Celery max_retries + time limits |
| CF-H09 | P1 | CV failed status | pipeline except → `extraction_status=failed` |
| CF-H10 | P1 | AI schema guard | allowlist keys + drop protected attrs |
| CF-H14 | P1 | Register i18n | map `registration_invite_only` PL/EN |
| CF-H15–16 | P1 | Pilot OS | hardening panel; company not top blocker |
| CF-H18 | P1 | Global invite dedup | cross-cohort + allowlist |
| CF-H20–22 | P2 | Metrics/runbooks | hardening metrics + support ops expanded |

## Remaining (external only)

- Founder named cohort intake (5–20 real candidates) — not Cursor-inventable

## Frozen stance

Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · Gate F PASS · invite-only · no invented candidates · invites unsent until Founder dual auth · synthetic ≠ real · Phase 3 not started

## Alembic

`106_candidate_first_phase2_hardening`

## APIs

- `GET /api/v1/admin/pilot-os/candidate-first` — includes `hardening` + `phase2_status`
- `GET /api/v1/admin/pilot-os/candidate-first/hardening`
- `POST /api/v1/admin/pilot-os/candidate-first/invitation-packs/{id}/send` (`dry_run` default true)
- `POST /api/v1/admin/pilot-os/candidate-first/invite-tokens/{id}/revoke`
- `PUT/GET /api/v1/auth/onboarding/progress`
