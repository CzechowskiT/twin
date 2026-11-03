# Activation Cohort Fill — Founder ops pack

**Status:** Readiness shipped (registry + exclusion + evidence). **Recruitment is NOT authorized.**  
**Pilot:** **BLOCKED_BY_FOUNDER** (see `docs/PILOT_FOUNDER_BLOCK_DECISION_2026-07-20.md`).  
**Enrollment:** `real_candidate_enrollment=NOT_STARTED` · `real_recruiter_enrollment=NOT_STARTED` · `EXTERNAL_PILOT_ENROLLMENT_ENABLED=false`.  
**Gates (unchanged):** Gate F = PENDING · Launch = NO-GO · Phase 3B = BLOCKED · PMF = INSUFFICIENT_DATA.

## What engineering already did

| Item | Where |
|------|--------|
| Funnel + retention + TTV | `#523` / `#524`, `/admin/metrics`, `/api/v1/admin/funnel` |
| Cohort registry | Alembic `086`, `/admin/cohorts`, `GET/POST /api/v1/admin/cohorts` |
| Evidence summary | `GET /api/v1/admin/cohorts/{id}/evidence` |
| Smoke/demo auto-exclude | email prefix / UTM / `METRICS_EXCLUDE_EMAIL_SUFFIXES` → `exclude_from_product_metrics` |
| Interview emit | Google calendar path + recruiter manual `interview_scheduled` |
| Retention exclusion | `/admin/retention` defaults exclude test accounts |
| Enrollment hard gate | Wave 0 — FE + API block real participant adds while flag off |

## Hard stop (Founder 2026-07-20)

1. **Do not** invite real candidates or recruiters.
2. **Do not** treat cohort registry as pilot readiness.
3. **Do not** recommend Gate F PASS.
4. Keep registry/analytics for internal readiness only.
5. Resume recruitment only after Founder lifts BLOCKED_BY_FOUNDER **and** Hard LIVE bar for required personas is met (`docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md`).

## Invite checklist (SUSPENDED — do not execute)

Invite steps from the 2026-07-20 readiness pack are **SUSPENDED**. When Founder unblocks, restore invite runbook and require `EXTERNAL_PILOT_ENROLLMENT_ENABLED=true` plus Hard LIVE bar.

## UTM / tagging convention

| Signal | Effect |
|--------|--------|
| `utm_source=pilot` + `utm_campaign=activation_pl_pilot_2026_07` | Real pilot attribution — **do not send while blocked** |
| `utm_source` ∈ smoke\|demo\|synthetic\|e2e\|playwright\|internal | Auto `exclude_from_product_metrics=true` |
| Email local prefix `smoke-` / `demo-` / `test-` / `e2e-` / … | Same exclusion |
| Domain `@twin.internal` | Same exclusion |
| Participant status `excluded` | Forces user exclusion |

## Related

- `docs/PILOT_FOUNDER_BLOCK_DECISION_2026-07-20.md`
- `docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md`
- `docs/HARD_LIVE_DEFINITION_30.md`
