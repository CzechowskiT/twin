# First Working Persistence Plan — 2026-06-19

**Branch:** `product/first-working-persistence-plan-2026-06-19`  
**Route:** `/board/first-working-persistence-plan`

## Purpose

Spec-only board page mapping the first working persistence backend rollout sequence (steps 1–10). **No backend routes or writes** — planning surface only.

## Sections (10)

| Marker | Section |
| ------ | ------- |
| `first-working-persistence-plan-header` | Header |
| `first-working-persistence-plan-backend-sequence` | Backend sequence steps 1–10 |
| `first-working-persistence-plan-entity-targets` | Entity targets |
| `first-working-persistence-plan-scope-boundaries` | Scope boundaries |
| `first-working-persistence-plan-deferred-actions` | Deferred actions |
| `first-working-persistence-plan-migration-gates` | Migration gates |
| `first-working-persistence-plan-dependency-order` | Dependency order |
| `first-working-persistence-plan-verification-checklist` | Verification checklist |
| `first-working-persistence-plan-no-backend-writes` | No backend routes/writes boundary |
| `first-working-persistence-plan-launch-status` | Launch / P0 / Phase 3B status |

## Backend sequence (1–10)

1. Persona auth + tenant scope  
2. Append-only audit event schema  
3. Persistent notes (append-only design)  
4. Persistent tasks with ownership  
5. Candidate-role status event log  
6. Visibility preference store  
7. Recruiter queue snapshot read model  
8. Company feedback draft store  
9. Read-only export preview spec  
10. Request intake append queue spec  

## Tests

```bash
cd frontend
npm run test:first-working-persistence-plan
npm run build
```

Prod smoke (optional browser):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:first-working-persistence-plan-browser
```
