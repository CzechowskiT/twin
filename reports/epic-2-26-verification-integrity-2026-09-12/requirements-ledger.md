# Epic 2.26 — Verification Integrity Repair ledger (2026-09-12)

## Baseline verified
- Deployed tip before this batch: `7baed0bd` ALIGNED
- Remediation tip at start: `c13abe40` / after gate rewrite commit `da6e2dd7`
- Alembic was `139_candidate_interview_practice`; this batch adds `140_practice_session_is_synthetic`

## Defects repaired

| ID | Defect | Failing repro | Fix | Passing regression |
|----|--------|---------------|-----|-------------------|
| L1 | Live gate accepted deterministic NOT_ASSESSED | old_weak_gate_passed=true in live-gate-old-defect-repro.json | `live_ai_quality_validator.check_live_case` | test_epic_226_live_ai_gate_validator.py (10) |
| L2 | Pause called /abandon; draft cleared on reopen | observed FE/API | STATE_PAUSED + /pause + /resume; restore answer_draft | test_draft_persists_across_pause_resume; browser C |
| L3 | Shared Daily OS mint ≠ two users | same email always | mint-isolated-synthetic unique email | assertDistinct + browser F negative control |
| L4 | is_synthetic from kpi_excluded | promote always synthetic | session.is_synthetic separate; provenance from email markers | test_provenance_* + test_promote_uses_is_synthetic |
| L5 | Objective label without checker | catalog only | objective_rules + evaluate_objective_answer wired in submit | test_objective_correct_vs_wrong_differ |
| L6 | Legacy IDs remapped to unrelated v2 | aliases → wrong family | restore v1 Exercise defs | test_legacy_behavioral_id_keeps_behavioral_family |
| L7 | Delayed-eval test not in-flight | delete then observe empty | provider_call deletes via independent Session; expire_all | test_delayed_eval_barrier_delete_rejects_persist |
| L8 | provider_call ignored without Anthropic config | stub never ran | ai_authorized + provider_call without is_anthropic_configured | consent matrix still PASS; L7 PASS |
| L9 | Browser summary pass>=6 | weak summary | require all 8 PASS from outcomes | journeys-summary.json |
| L10 | Live gate mint invented routes; one session for 10 cases | script review | rewrite gate: isolated mint, one session/case, railway-only key | live gate exit 2 NOT_RUN; harness unit PASS |

## Negative controls
- Deterministic consent-denied → not certified
- Identical A/B identities → isolation setup fails
- Structurally valid but irrelevant-supported → quality FAIL
- Claimed live source without execution evidence → not certified

## Gates
1. IMPLEMENTATION_AND_PRIVACY — repaired further this batch
2. BROWSER_AND_DATABASE — pending re-run after deploy of this batch
3. LIVE_PROVIDER_QUALITY — NOT_RUN (no provider); harness integrity verified without live Claude

## Outcome stance
Do not claim EPIC_2_26_IMPLEMENTATION_VERIFIED_LIVE_AI_BLOCKED until browser A–H + PG re-verification complete on the deployed integrity SHA.
If browser/PG pass and only Anthropic missing → IMPLEMENTATION_VERIFIED_LIVE_AI_BLOCKED.
Otherwise EPIC_2_26_INCOMPLETE.
