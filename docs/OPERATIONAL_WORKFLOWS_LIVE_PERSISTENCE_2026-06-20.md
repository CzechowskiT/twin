# Operational Workflows — Live Persistence Usage Evidence

**Updated:** 2026-06-21  
**Batch owner:** TWIN Operational Workflows / Live Persistence Usage  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Baseline:** persistence verified, Alembic 067 confirmed, auth smoke PASS, #223 at a794812

---

## Slice delivery summary

| Slice | Branch | PR | Route / surface |
|-------|--------|-----|-----------------|
| 1 | `feature/recruiter-daily-cockpit-live-persistence-summary-2026-06-20` | #224 | `/recruiter/daily-cockpit` |
| 2 | `feature/company-command-center-live-persistence-summary-2026-06-20` | #225 | `/company/hiring-command-center` |
| 3 | `feature/board-persistence-operations-monitor-2026-06-20` | #226 | `/board/persistence-operations-monitor` |
| 4 | `feature/candidate-trust-live-request-status-2026-06-20` | #227 | `/dashboard/trust/overview` |
| 5 | `feature/persona-audit-trail-surfacing-2026-06-20` | #228 | recruiter / company / board / candidate |
| 6 | `feature/operational-queue-cross-linking-2026-06-20` | #229 | cross-links on 4 operational routes |
| 7 | `docs/update-operational-workflows-evidence-2026-06-20` | (this PR) | docs evidence |

---

## Central fetch pattern

`frontend/src/lib/live-operating-state.ts` — reuses `fetchSafePersistenceList` from #208–#221:

- **Live success:** authenticated GET returns `items[]` → source `live`
- **401 fallback:** `preserveSessionOnUnauthorized: true` → demo counts
- **Partial failure:** mixed live/demo channels → `liveOperatingState.partialFallback`
- **Source badge:** `safePersistence.liveApi` | `demoFallback` | `partialFallback`

Channels: work-items, review-queue, request-intake, candidate-role-status, company-feedback, audit-events.

---

## Tests (static)

```bash
cd frontend
npm run test:recruiter-daily-cockpit-live-persistence
npm run test:company-command-center-live-persistence
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
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:recruiter-daily-cockpit-live-persistence-browser
```

Prod smoke (when `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` + `TWIN_PROD_TEST_JWT`):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 npm run test:recruiter-daily-cockpit-live-persistence-browser:raw
```

---

## Launch stance (unchanged)

- Public launch: **NO-GO**
- P0 performance: **OPEN**
- Phase 3B multitab: **HARD BLOCKED**
- No email, ATS writeback, auto-apply, or auth weakening in this batch

---

## Bans respected

Phase 3B, multitab, stress, shell/gate edits, email, ATS, secrets, auth weakening, forbidden copy — **none introduced**.

---

## Follow-up

- Authenticated prod route smoke for new `/board/persistence-operations-monitor` after Vercel deploy propagates
- Wire `loadCandidateRoleStatus` dedicated loader if API gains persona filters
