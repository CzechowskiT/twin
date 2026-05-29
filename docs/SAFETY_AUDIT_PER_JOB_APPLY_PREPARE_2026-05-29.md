# Safety audit: per-job Apply / Prepare (2026-05-29)

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Scope:** Dashboard job rows, forecast strip, workspace discovery, `POST /applications/auto-apply`, `POST /jobs/{id}/one-click-apply`  
**HARD BANs:** no prod apply/auto-apply calls during audit.

## UI / API map

| Action | UI | API | Live submit? |
| ------ | -- | --- | ------------ |
| Prepare application package | `job-list.tsx`, `OpportunityForecast.tsx`, dashboard handlers | `POST /api/v1/applications/auto-apply` (`human_acknowledged`) | Playwright path only when `submit=true` + env |
| One-click apply | `OneClickApply.tsx`, `JobCard.tsx` | `POST /api/v1/jobs/{id}/one-click-apply` | **No** — tracks pipeline + opens employer URL |
| Delegated submit | N/A (blocked) | Gateway flags | **No** — `can_submit_delegated_application` always false |

## Ten safety questions

| # | Question | Answer |
| - | -------- | ------ |
| 1 | Can anonymous users call apply/prepare APIs? | **No** — `get_current_user` on all mutation routes. |
| 2 | Can UI trigger prepare without verified-readiness? | **No** — `JobApplyActionsGuard.canPrepareApplicationPackage` false until gateway allows prepare statuses. |
| 3 | Can UI trigger delegated employer submit? | **No** — `canSubmitDelegatedApplication` false in FE; `can_submit_delegated_application` false in BE. |
| 4 | Does one-click-apply send forms to employers? | **No** — creates/updates `Application` + `record_submission_one_click`; message tells user to open employer site. |
| 5 | Is `POST /applications/auto-apply` human-gated when configured? | **Yes** — `enforce_human_ack_if_required`; dashboard sends `human_acknowledged: true` only from explicit control. |
| 6 | Are rate limits / daily caps enforced on auto-apply? | **Yes** — Redis per-minute, daily cap, company cooldown, blocklists (`auto_apply_guards.py`). |
| 7 | Is platform sweep ops-only? | **Yes** — `POST /trigger-sweep` requires scrape-ops; 10+ gate tests. |
| 8 | Does nightly sweep respect readiness + consent? | **Yes** — `autonomous_apply_allowed` + consent; skips with `verified_readiness_incomplete`. |
| 9 | Do regression tests cover blocked paths? | **Yes** — 43 passed in readiness/auto-apply bundle; FE `dashboard-ux-safety` + `verified-readiness-guard` scripts green. |
| 10 | Public launch safe to enable mass live apply? | **No** — program **NO-GO**; KYC/delegated apply not live; prod `AUTO_APPLY_SUBMIT` policy unverified this session. |

## Verdict

- **Per-job prepare/apply controls:** **PASS** (default-deny delegated submit; readiness-aligned prepare).
- **Public launch:** **NO-GO** (unchanged program gates).

## Tests run

```bash
cd backend && pytest tests/test_auto_apply_trigger_sweep_admin_gate.py \
  tests/test_candidate_verified_readiness_gate.py \
  tests/test_candidate_readiness.py \
  tests/test_autonomous_applying_readiness_gate.py \
  tests/test_auto_apply_settings_api.py -q

cd frontend && node scripts/dashboard-ux-safety.test.ts \
  && node scripts/verified-readiness-guard.test.ts
```
