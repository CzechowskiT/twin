# Activation Cohort Fill — Founder ops pack

**Status:** Readiness shipped (registry + exclusion + evidence). **Recruitment is NOT done.**  
**FOUNDERS_ACTION_REQUIRED:** invite 20–50 real PL candidates + 3–5 real recruiters/employers.  
**Gates (unchanged):** Gate F = PENDING · Launch = NO-GO · Phase 3B = BLOCKED.

## What engineering already did

| Item | Where |
|------|--------|
| Funnel + retention + TTV | `#523` / `#524`, `/admin/metrics`, `/api/v1/admin/funnel` |
| Cohort registry | Alembic `086`, `/admin/cohorts`, `GET/POST /api/v1/admin/cohorts` |
| Evidence summary | `GET /api/v1/admin/cohorts/{id}/evidence` |
| Smoke/demo auto-exclude | email prefix / UTM / `METRICS_EXCLUDE_EMAIL_SUFFIXES` → `exclude_from_product_metrics` |
| Interview emit | Google calendar path + recruiter manual `interview_scheduled` |
| Retention exclusion | `/admin/retention` defaults exclude test accounts |

## Invite checklist (Founder / sales — human contact)

1. **Seed cohort (ops):** `POST /api/v1/admin/cohorts/ensure-pl-pilot` with ops Bearer, or Create PL pilot on `/admin/cohorts`.
2. **Copy invite links** (PL landing already i18n’d):
   - Candidates: `https://twin-sooty.vercel.app/register/candidate?utm_source=pilot&utm_medium=founder_invite&utm_campaign=activation_pl_pilot_2026_07&utm_content=cohort_{ID}`
   - Recruiters: use existing recruiter token inbox URL from `/admin/recruiter-tokens` + same UTM on any signup link; add email to cohort as role=`recruiter` after they exist.
3. **Targets:** 20–50 PL desk candidates; 3–5 recruiters/employers. Prefer warm intros, not cold spam.
4. **After each signup:** ops adds participant via `/admin/cohorts` (email) or `POST .../participants`. Status progresses: `invited` → `joined` → `onboarded` → `activated`.
5. **Weekly slice:** open `/admin/metrics` + cohort evidence. Track signup → onboarding → first_match (test-excluded). Watch `ACTIVATION_*` alerts when sample ≥ `activation_alerts_min_sample_size`.
6. **Do not** mark Gate F YES until N≥20 real onboarded (test-excluded) and Founder review.
7. **Never** count `smoke-*` / `utm_source=smoke` in North Star — auto-tagged.

## UTM / tagging convention

| Signal | Effect |
|--------|--------|
| `utm_source=pilot` + `utm_campaign=activation_pl_pilot_2026_07` | Real pilot attribution (metrics **included**) |
| `utm_source` ∈ smoke\|demo\|synthetic\|e2e\|playwright\|internal | Auto `exclude_from_product_metrics=true` |
| Email local prefix `smoke-` / `demo-` / `test-` / `e2e-` / … | Same exclusion |
| Domain `@twin.internal` | Same exclusion |
| Participant status `excluded` | Forces user exclusion |

## Copy notes (PL)

- Prefer Polish onboarding strings already in `i18n.ts` for candidate register.
- Invite message should say: short calendar of pre-qualified interviews — not “spam applications”.
- Recruiter invite: decision console / accept-decline — not CV dump.

## Evidence endpoints

```bash
# Ops token required
curl -sS -H "Authorization: Bearer $OPS_ADMIN_TOKEN" \
  "$API/api/v1/admin/cohorts/ensure-pl-pilot"
curl -sS -H "Authorization: Bearer $OPS_ADMIN_TOKEN" \
  "$API/api/v1/admin/cohorts/1/evidence"
curl -sS -H "Authorization: Bearer $OPS_ADMIN_TOKEN" \
  "$API/api/v1/admin/funnel?days=30"
```

Evidence returns: step counts (excl/incl test labeled), TTV sample_size, NS excl/incl, blockers including `FOUNDERS_ACTION_REQUIRED_recruit_users`.

## EDI-0 (out of scope for this batch)

Optional no-code sheet (Founder only): columns EB present Y/N | named rival | next paid commitment date | stall flag. Not a product feature.

## Stop rules

- PII incident → pause invites.
- Match-empty >40% of onboarded after 7d → pause invites, fix matching.
- Do not declare PMF or AI moat from this cohort.
