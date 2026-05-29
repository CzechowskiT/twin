# Safety audit: AUTONOMOUS APPLYING panel (2026-05-28)

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Scope:** Dashboard strip + `/dashboard/settings/auto-apply` + backend `/api/v1/auto-apply/*`  
**HARD BANs observed:** no prod mutations, no live apply/scrape/sweep triggers during audit.

## UI map

| Surface | File | API |
|--------|------|-----|
| Dashboard strip ("Autonomous applying") | `frontend/src/components/nightly-auto-apply-strip.tsx` | `GET /auto-apply/settings`, `GET /auto-apply/last-sweep` |
| Settings / Application agent | `frontend/src/app/dashboard/settings/auto-apply/page.tsx` | consent, PATCH settings, `POST /trigger` |
| Verified readiness (separate card) | `dashboard-verified-readiness-card.tsx` | `GET /candidates/me/verified-readiness` (read-only) |

## Eight safety questions

| # | Question | Answer (pre-fix → post-fix) |
|---|----------|-----------------------------|
| 1 | Can candidate enable real auto-apply via Settings today? | **Pre:** Yes with `profile_ready` + consent only. **Post:** Blocked until `verified_readiness_ready` (career brief, skill evidence, storage + GDPR consents). |
| 2 | Manual trigger apply/sweep from dashboard? | Per-user `POST /trigger` after consent+active (mocked in tests). Platform `POST /trigger-sweep` **ops-only** (403 for normal users). |
| 3 | Backend requires readiness gate before delegated apply? | `can_submit_delegated_application` always **false**; autonomous path now uses `autonomous_apply_allowed()` aligned with verified-readiness. |
| 4 | Backend requires explicit consent before auto-apply? | **Yes** — `AutoApplyConsent.consent_given_at` + `is_active` for trigger and nightly sweep selection. |
| 5 | Nightly blocked without readiness/career brief/storage consent? | **Pre:** No (profile-only). **Post:** `process_user_nightly_auto_apply` skips with `verified_readiness_incomplete`. |
| 6 | trigger-sweep ops-gated? | **Yes** — `user_has_scrape_ops` + 3/min rate limit; 10+ contract tests. |
| 7 | Tests for non-ops/non-ready? | **Yes** — `test_auto_apply_trigger_sweep_admin_gate.py`, `test_autonomous_applying_readiness_gate.py`, verified-readiness gate tests. |
| 8 | Total auto-applications: 2 historical or live? | Counter is **persisted** on `AutoApplyConsent.total_applications_submitted` (historical runs); strip is observability only, not a live submit control. |

## Verdict

- **Pre-fix:** FAIL for prod safety bar (autonomous enable weaker than verified-readiness card).
- **Post-fix:** PASS for gate alignment; public launch remains **NO-GO** per program gates.

## Tests

```bash
cd backend && pytest tests/test_auto_apply_trigger_sweep_admin_gate.py \
  tests/test_candidate_verified_readiness_gate.py \
  tests/test_candidate_readiness.py \
  tests/test_autonomous_applying_readiness_gate.py \
  tests/test_auto_apply_settings_api.py -q
```
