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
| Placement events UI timeline | **Read-only** — no aggressive polling; lazy-loaded via `dynamic()` on persona routes |

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
3. **Large static arrays in render** — checklist/evidence demo arrays mapped each render on cockpit/monitor routes (low-risk memoization target — **slice 5 applied** on placement verification + dashboard forecast panels).
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

## Safe-lane code splitting (2026-06-21 slice 5)

- `PlacementEventsTimeline` lazy-loaded (`dynamic`, `ssr: false`) on all four placement-verification workspaces.
- `/dashboard` — `OpportunityForecast` and `ProgressDashboard` behind `dynamic()` imports.
- Recruiter/company placement checklist records memoized with `useMemo`.

**P0 performance remains OPEN** — no Phase 3B profiling claims.

## Ops confirmation (2026-06-21)

Operator verified production Alembic head `068_placement_events_foundation` and authenticated persistence smoke **PASS** (11 pass / 0 fail / 1 skip) after placement_events foundation deploy. No Phase 3B, stress, or headless runs in this confirmation batch. See `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-21.md`.

## Ops confirmation (2026-06-23)

Dedicated placement-events auth smoke **PASS** (6 pass / 0 fail / 1 skip) via `npm run verify:prod-placement-events-auth` — authenticated POST, GET 200, `placement_id` filter 200, unauth 401/403, token not logged. Alembic 068 **CONFIRMED** (unchanged). P0 **OPEN**, Launch **NO-GO**, Phase 3B **HARD BLOCKED**. See `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-23.md`.

## Safe evidence extension (2026-06-24)

Extended route inventory for readiness-heavy surfaces (calendar, offer, placement, board monitors). Scheduling decision context layer added — read-only, no perf regression claims. See `docs/P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md`.

Additional routes in P0 scope:

| Route | Notes |
|-------|-------|
| `/dashboard/calendar/readiness` | Calendar + Microsoft readiness panels |
| `/dashboard/offer-readiness` | Offer checklist + scheduling decision context |
| `/board/calendar-readiness` | Board calendar monitor |
| `/board/offer-readiness` | Board offer monitor |

Static guardrails extended: `test:p0-route-weight-inventory`, scheduling panel `useMemo` hardening.

**P0 performance remains OPEN** — Phase 3B still **HARD BLOCKED**.

## Batch 1 extension (2026-06-27)

Hiring Journey routes added to static route-weight inventory (`test:p0-route-weight-inventory`). Scheduling-proposal routes **not** included — already guarded by dedicated `test:scheduling-proposal`. See [P0_PERFORMANCE_INVENTORY_2026-06-27.md](./P0_PERFORMANCE_INVENTORY_2026-06-27.md) (Batch 1 covered; P0 **OPEN**).
