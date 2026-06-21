# Operational Workflows — Live Persistence Usage Evidence

**Updated:** 2026-06-21  
**Batch owner:** TWIN Operational Workflows / Live Persistence Usage  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Completion slice:** `feature/operational-workflows-completion-2026-06-21`

---

## Completion batch — four limitations closed

| # | Limitation (prior batch) | Resolution |
|---|--------------------------|------------|
| 1 | Board monitor partial — recruiter/company panels only | **FULL spec:** public-health card (live fetch + static fallback), Alembic 067 confirmed, auth smoke 11/0/1, 8-endpoint matrix, operational surfaces matrix, blocked capabilities, Launch NO-GO / P0 OPEN / Phase 3B HARD BLOCKED |
| 2 | Trust live request status on `/dashboard/trust/overview` only | **All trust routes:** overview, controls, export-requests, corrections, portability, audit-export, consent-receipt, visibility-preferences + profile aliases — 4-channel counts (visibility-preferences, export-requests, request-intake, audit-events) with source badge |
| 3 | Compact audit widget count-only | **3–5 records** with event_type, actor_persona, target_type, target_id, created_at — append-only copy, no edit/delete/export/notification actions |
| 4 | Cross-links on 4 surfaces only | **9 surfaces:** daily-cockpit, operational-work-queue, request-intake, trust-review-queue, hiring-command-center, company/feedback, company/work-items, board monitor, production-persistence-status |

---

## Central fetch pattern

`frontend/src/lib/live-operating-state.ts` — reuses `fetchSafePersistenceList` from #208–#221:

- **Live success:** authenticated GET returns `items[]` → source `live`
- **401 fallback:** `preserveSessionOnUnauthorized: true` → demo counts
- **Partial failure:** mixed live/demo channels → `liveOperatingState.partialFallback`
- **Source badge:** `safePersistence.liveApi` | `demoFallback` | `partialFallback`

Channels: work-items, review-queue, request-intake, candidate-role-status, company-feedback, audit-events.

Trust request status (`candidate-trust-request-status.ts`): visibility-preferences, export-requests, request-intake, audit-events.

Compact audit trail (`compact-audit-trail.ts`): audit-events GET → latest 3–5 records or demo fallback.

Board monitor public-health: `loadPublicHealthSnapshot()` via `fetchPublicHealthJson` with static fallback from demo data.

---

## Tests (static)

```bash
cd frontend
npm run test:board-persistence-operations-monitor
npm run test:candidate-trust-live-request-status
npm run test:persona-audit-trail-surfacing
npm run test:operational-queue-cross-linking
npm run test:trust-language-guard
npx tsc --noEmit
npm run build
```

Browser (workers=1):

```bash
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:board-persistence-operations-monitor-browser
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:recruiter-daily-cockpit-live-persistence-browser
```

Prod smoke (when `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` + `TWIN_PROD_TEST_JWT`):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 npm run test:board-persistence-operations-monitor-browser:raw
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 npm run test:recruiter-daily-cockpit-live-persistence-browser:raw
```

Authenticated persistence API smoke (separate script):

```bash
TWIN_PROD_TEST_JWT=… TWIN_PROD_SMOKE_WRITE=1 npm run verify:prod-persistence-auth
```

Expected when JWT configured: **11 pass / 0 fail / 1 skip**.

---

## Launch stance (unchanged)

- Public launch: **NO-GO**
- P0 performance: **OPEN**
- Phase 3B multitab: **HARD BLOCKED**
- No email, ATS writeback, auto-apply, delete/revoke fulfillment, legal claims, KYC verification copy, or auth weakening in this batch

---

## Bans respected

Phase 3B, multitab, stress, shell/gate edits, email, ATS, secrets, auth weakening, forbidden copy — **none introduced**.

---

## Remaining limitations

None from the completion batch scope. Operator-only items unchanged:

- `TWIN_PROD_TEST_JWT` required for live authenticated POST smoke execution (skip when unset)
- public-health shows deploy SHAs, not Alembic revision — migration verified via separate admin endpoint
