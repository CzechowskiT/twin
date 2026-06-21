# P0 Performance Inventory — 2026-06-21

Evidence-only inspection batch. **P0 performance remains OPEN.** No Phase 3B, multitab, browser stress, or headless verification was run in this slice.

## Status summary

| Item | Status |
|------|--------|
| P0 performance gate | **OPEN** |
| Phase 3B | **HARD BLOCKED** |
| Public launch | **NO-GO** |
| Safe moving logo (workspace/auth) | **Shipped** — `PerformanceSafeMovingLogoMarquee` |
| Full 89-logo marketing marquee | **Isolated** — lazy-loaded on marketing paths only |
| Placement events UI timeline | **Read-only** — no aggressive polling |

## Prior heavy animation / logo issue

Earlier P0 work identified renderer memory pressure from the full ~89-brand `CompanyLogoMarquee` on workspace/auth routes. Mitigation shipped:

- `site-top-marquee.tsx` routes workspace/auth through `PerformanceSafeMovingLogoMarquee` (~12 brands, reduced DOM).
- Full marquee remains behind `dynamic()` import on marketing-only paths.
- Guarded by `performance-safe-moving-logo-marquee.test.ts` and `p0-renderer-memory-bundle-reduction.test.ts`.

## Routes in scope for P0 hardening

| Route | Notes |
|-------|-------|
| `/dashboard` | Candidate hub — multiple panels, job filters, live persistence hooks |
| `/recruiter/daily-cockpit` | Live operating state + checklist maps |
| `/company/hiring-command-center` | Live persistence summary + cross-links |
| `/board/persistence-operations-monitor` | Multi-channel fetch aggregate |
| `/board/placement-verification` | Evidence matrix + audit widget + placement events timeline |
| Placement verification persona routes | Demo data + read-only timeline fetch on mount |

## Build observations (`npm run build`)

- Next.js App Router production build completes on current scaffold (see CI `frontend-build`).
- Large route surface area (100+ static/dynamic routes) — no single bundle regression measured in this docs-only slice.
- **Do not invent Lighthouse or memory numbers here** — quantitative Phase 3B profiling remains blocked.

## Obvious performance risks (code inspection)

1. **Client-only heavy components** — B2B calculator, investor data room, dashboard modals use `dynamic()` (good); verify new surfaces follow same pattern.
2. **Repeated fetches** — `live-operating-state.ts` fans out parallel safe-persistence GETs; acceptable with no polling; deduper exists (`create-request-deduper.ts`).
3. **Large static arrays in render** — checklist/evidence demo arrays mapped each render on cockpit/monitor routes (low-risk memoization target — slice 5).
4. **Unnecessary animations** — marketing marquee animation scoped; workspace safe marquee uses lighter CSS track.
5. **Expensive re-renders** — placement timeline + audit widgets mount `useEffect` fetch once per page (no polling).
6. **Large images/assets** — brand logos via CDN/Simple Icons on marketing marquee only; safe marquee uses fixed small set.

## Hard ban reminder (this batch)

- No Phase 3B / controlled multitab / browser stress / headless-shell verification
- No shell/gate/layout rewrites unless absolutely required
- No auth weakening
- No fake “P0 fixed” or “performance solved” claims

## Related tests

```bash
cd frontend
npm run test:p0-performance-guardrails
npm run test:performance-safe-moving-logo-marquee
npm run test:p0-renderer-memory-bundle-reduction   # existing
```

## Next steps (not this batch)

- Phase 3B profiling when explicitly unblocked
- Deeper dashboard code-splitting review
- Backend API latency budgets for live persistence fan-out
