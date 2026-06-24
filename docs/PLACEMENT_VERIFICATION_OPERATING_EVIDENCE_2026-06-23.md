# Placement verification operating evidence — 2026-06-23

**Batch:** placement + calendar operating evidence center  
**Base:** `cursor/phase1-monorepo-scaffold` @ 9703550  
**Mode:** read-only operating evidence — **not** legal proof, invoice, payment, or revenue recognition

## Purpose

Enhance existing placement-verification routes with a shared **operating evidence center**: status summary, evidence bundle, capability matrix, source badges (live/demo/partial/unavailable), last checked timestamp, cross-links, and existing `PlacementEventsTimeline`.

## Surfaces

| Persona | Route |
|---------|-------|
| Candidate | `/dashboard/placement-verification` |
| Candidate (alias) | `/profile/placement-verification` |
| Recruiter | `/recruiter/placement-verification` |
| Company | `/company/placement-verification` |
| Board | `/board/placement-verification` |

## Shared components

| Component | Path |
|-----------|------|
| `OperatingEvidencePanel` | `frontend/src/components/shared/operating-evidence-panel.tsx` |
| `EvidenceStatusBadge` | `frontend/src/components/shared/evidence-status-badge.tsx` |
| `ReadOnlyCapabilityMatrix` | `frontend/src/components/shared/read-only-capability-matrix.tsx` |
| `PlacementVerificationEvidencePanel` | `frontend/src/components/shared/placement-verification-evidence-panel.tsx` |

## Domain / resolvers

| Artifact | Path |
|----------|------|
| Shared types | `frontend/src/lib/operating-evidence.ts` |
| Evidence bundle | `frontend/src/lib/placement-verification-evidence.ts` |
| Re-export | `frontend/src/lib/placement-verification.ts` → `resolvePlacementVerificationEvidence` |

**Canonical placement-events:** `GET /api/v1/placement-events` (401 unauthenticated OK).  
`/api/placement-events` without `v1` → 404 is **not** a failure.

## Copy guardrails

**Allowed:** operating evidence, verification preview, read-only, demo fallback, human review required.

**Forbidden:** legal proof, invoice sent, payment captured, revenue recognized, employer confirmed, calendar writes.

## Tests

```bash
cd frontend
npm run test:operating-evidence-components
npm run test:placement-verification-evidence
npm run test:placement-verification-domain
npm run test:placement-events-live-timeline
npm run test:trust-language-guard
npm run test:i18n-coverage
```

**Browser smoke (local):**

```bash
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:placement-verification-evidence-browser
```

**Production verify (after deploy):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 npm run verify:prod-placement-verification-evidence
```

Uses `prod-smoke-commit-gate` from PR #259 (`prod_frontend_commit`, `repo_head`, `docs_only_drift`).

## Launch stance

- **Launch:** NO-GO  
- **P0:** OPEN  
- **Phase 3B:** HARD BLOCKED  

## Hard bans (this batch)

No LightweightRouteShell, PersonaWorkspaceGate additions, Phase 3B, stress, Microsoft writes, email, ATS, payments, Celery, migrations, tokens in logs, polling.
