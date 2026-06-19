# Recruiter Operational Work Queue

**Branch:** `product/recruiter-operational-work-queue-2026-06-19`
**Route:** `/recruiter/operational-work-queue`

Read-only recruiter operating queue aggregating active candidates, trust review, feedback gaps, and stale applications.

## Sections

| Marker | Section |
|--------|---------|
| `recruiter-operational-work-queue-header` | Header |
| `recruiter-operational-work-queue-summary` | Queue summary |
| `recruiter-operational-work-queue-active-worklist` | Active candidate worklist |
| `recruiter-operational-work-queue-trust-review` | Trust/review requests |
| `recruiter-operational-work-queue-missing-feedback` | Missing feedback |
| `recruiter-operational-work-queue-stale-applications` | Stale applications |
| `recruiter-operational-work-queue-next-best-actions` | Next best actions |
| `recruiter-operational-work-queue-owner-due-map` | Owner/due-date map |
| `recruiter-operational-work-queue-boundary` | Boundary panel |

Disabled actions: assign, mark done, email, schedule, ATS push.

## Tests

```bash
cd frontend
npm run test:recruiter-operational-work-queue
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:recruiter-operational-work-queue-browser
```

## Status

- Launch: **NO-GO**
- P0 performance: **OPEN**
- Phase 3B: **HARD BLOCKED**
