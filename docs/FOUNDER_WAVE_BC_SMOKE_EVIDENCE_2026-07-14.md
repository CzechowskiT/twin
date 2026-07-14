---
schema_version: 1
tester: "Tomasz Czechowski"
date: "2026-07-14"
environment: prod
deploy_sha: "a5f3f6eae97e7554f393c1b53302078f0376f2fd"
slices:
  - id: B1_career_compass result: PASS
  - id: B2_trust_center_subs result: PASS
  - id: B3_referrals result: PASS
  - id: B_candidate_timeline result: PASS
  - id: C1_activation result: PASS
  - id: C2_talent_pool result: PASS
  - id: C2_trust_review result: PASS
  - id: C3_notification_prefs result: PASS
  - id: C4_saved_views result: PASS
  - id: C5_activity_timeline result: PASS
  - id: RBAC_matrix result: PASS
console_errors: none
founder_smoke_pass: true
---

# Founder Wave B/C — prod smoke evidence (2026-07-14)

> **Stance:** Launch NO-GO · Gate F PENDING · NOT_GATE_F_YES · NOT_PHASE_3B  
> **Deploy SHA:** `a5f3f6eae97e7554f393c1b53302078f0376f2fd` (PR #469 merge)  
> **Evidence path (local, gitignored):** `reports/founder-smoke/a5f3f6eae97e/wave-bc-2026-07-14T06-26-30-735Z/`

FOUNDER_SMOKE: PASS

## Result

| Field | Value |
|-------|-------|
| Result | **PASS** |
| Tests | 16/16 Playwright @ prod |
| deploySha | `a5f3f6ea` |
| api_commit | `ae14bfb5` |
| db_revision | 077 |

## Slices

| Slice | Result |
|-------|--------|
| B1 career compass | PASS |
| B2 trust center subs | PASS |
| B3 referrals | PASS |
| B candidate timeline | PASS |
| C1 activation | PASS |
| C2 talent pool | PASS |
| C2 trust review | PASS |
| C3 notification prefs | PASS |
| C4 saved views | PASS |
| C5 activity timeline | PASS |
| RBAC matrix | PASS |

## Guard

Static guard: `npm run test:founder-wave-bc-evidence-guard`
