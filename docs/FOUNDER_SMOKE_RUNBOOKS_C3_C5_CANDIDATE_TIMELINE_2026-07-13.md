# Founder smoke runbooks — C3, C4, C5, candidate timeline (2026-07-13)

> **Status:** PENDING — credentials UNSET in agent env  
> **Do not record PASS without browser evidence**

## Preflight

```bash
cd frontend && npm run preflight:founder-smoke-env
npm run preflight:preview-reachability
```

| Credential | Agent env |
|------------|-----------|
| `DEMO_USER_PASSWORD` | UNSET |
| Recruiter token | UNSET |

## Runbooks (execute manually when SET)

| Slice | Route | Evidence template |
|-------|-------|-------------------|
| C3 notification prefs | `/recruiter/notification-preferences` | `docs/schemas/FOUNDER_SMOKE_EVIDENCE_SCHEMA.md` |
| C4 saved views | API `/api/v1/recruiter/saved-views` | Same schema — filter CRUD |
| C5 activity timeline | `/recruiter/activity-timeline` | Same schema — read-only list |
| Candidate timeline | `/dashboard/trust/activity-timeline` | Candidate session required |

## PILOT badges

All slices show **PILOT · NEEDS FOUNDER SMOKE** until evidence filed.

**Merge gate:** NO merge #452–#455 without `FOUNDER_SMOKE: PASS` in evidence doc.
