# Calendar readiness operating evidence — 2026-06-23

**Batch:** calendar readiness operating evidence panel  
**Base:** `cursor/phase1-monorepo-scaffold` @ 9703550  
**Mode:** OAuth/readiness preview — **not** live scheduling automation or calendar writes

## Purpose

Extend `/dashboard/calendar/readiness` and `/dashboard/calendar` with an operating evidence panel: OAuth status, readiness status, last check timestamp, capability matrix (OAuth configured, read readiness, writes disabled, smoke status, route health).

## Surfaces

| Route | Panel |
|-------|-------|
| `/dashboard/calendar/readiness` | `CalendarReadinessEvidencePanel` inline |
| `/dashboard/calendar` | `CalendarOperatingEvidenceSection` (collapsible) |

## Shared components

| Component | Path |
|-----------|------|
| `CalendarReadinessEvidencePanel` | `frontend/src/components/shared/calendar-readiness-evidence-panel.tsx` |
| `CalendarOperatingEvidenceSection` | `frontend/src/components/calendar/calendar-operating-evidence-section.tsx` |

## Domain / resolvers

| Artifact | Path |
|----------|------|
| Evidence bundle | `frontend/src/lib/calendar-readiness-evidence.ts` |
| Re-export | `frontend/src/lib/calendar-readiness.ts` → `resolveCalendarReadinessEvidence` |

Cross-link to placement verification: `/dashboard/placement-verification`.

## Copy guardrails

**Allowed:** readiness preview, OAuth env, writes disabled, operating evidence, no live sync.

**Forbidden:** calendar synced, event created, invite sent, live scheduling automation.

## Tests

```bash
cd frontend
npm run test:calendar-readiness-evidence
npm run test:calendar-readiness-domain
npm run test:candidate-calendar-readiness
npm run test:operating-evidence-components
npm run test:trust-language-guard
npm run test:i18n-coverage
```

**Browser smoke (local):**

```bash
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:calendar-readiness-evidence-browser
```

**Production verify (after deploy):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 npm run verify:prod-calendar-readiness-evidence
```

Also available: `verify:prod-candidate-calendar-readiness` (readiness + calendar workspace from PR #259).

## Launch stance

- **Launch:** NO-GO  
- **P0:** OPEN  
- **Phase 3B:** HARD BLOCKED  

## Hard bans

No calendar writes, Graph event create, Microsoft sync enablement, polling, email, Celery, migrations.
