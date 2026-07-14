# Founder smoke runbooks — C3, C4, C5, candidate timeline (2026-07-13)

> **Status:** **PASS** — prod browser smoke 2026-07-14 @ `a5f3f6ea`  
> **Evidence:** `docs/FOUNDER_WAVE_BC_SMOKE_EVIDENCE_2026-07-14.md`

## Preflight

```bash
cd frontend && npm run preflight:founder-smoke-env
npm run preflight:preview-reachability
npm run smoke:founder-wave-bc-prod
```

| Credential | Status |
|------------|--------|
| `DEMO_USER_PASSWORD` | SET (frontend/.env.local) |
| Recruiter token | SET (frontend/.env.local) |

## Runbooks — PASS @ prod

| Slice | Route | Result |
|-------|-------|--------|
| C3 notification prefs | `/recruiter/notification-preferences` | PASS |
| C4 saved views | API `/api/recruiter/saved-views` | PASS |
| C5 activity timeline | `/recruiter/activity-timeline` | PASS |
| Candidate timeline | `/dashboard/trust/activity-timeline` | PASS |

## PILOT badges

Slices remain **PILOT** ship status with **green:true** after founder smoke PASS — not promoted to LIVE.

**Merge gate:** Launch remains NO-GO · Gate F PENDING.
