# Board Implementation Tracker — 2026-06-19

**Branch:** `product/board-implementation-tracker-2026-06-19`  
**Route:** `/board/implementation-tracker`

## Purpose

Internal board tracker mapping persistence and integration milestones with feature rows (name, state, next, dependency, boundary, owner, priority, blocked) — planning only, no backend writes.

## Sections (10)

| Marker | Section |
| ------ | ------- |
| `board-implementation-tracker-header` | Header |
| `board-implementation-tracker-persistence-features` | Persistence milestones |
| `board-implementation-tracker-queue-features` | Queue persistence |
| `board-implementation-tracker-export-features` | Export milestones |
| `board-implementation-tracker-intake-features` | Intake queue |
| `board-implementation-tracker-email-features` | Email draft approval |
| `board-implementation-tracker-ats-features` | ATS import read-only |
| `board-implementation-tracker-dependency-map` | Dependency map |
| `board-implementation-tracker-owner-summary` | Owner summary |
| `board-implementation-tracker-blocked-register` | Blocked register + launch status |

## Milestones included

Persistent notes, tasks, candidate-role status, audit event, visibility preference, recruiter queue persistence, company feedback persistence, read-only export, request intake queue, email draft approval, ATS import read-only.

## Tests

```bash
cd frontend
npm run test:board-implementation-tracker
npm run build
```

Prod smoke (optional browser):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:board-implementation-tracker-browser
```
