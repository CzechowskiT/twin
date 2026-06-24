# P0 Performance — Safe Evidence (2026-06-24)

Evidence-only batch. **P0 performance remains OPEN.** No Phase 3B, multitab, browser stress, or headless verification was run.

## Status summary

| Item | Status |
|------|--------|
| P0 performance gate | **OPEN** |
| Phase 3B | **HARD BLOCKED** |
| Public launch | **NO-GO** |
| Microsoft busy-read prod gates | **OFF** |
| Calendar write gates | **OFF** |
| Stress / multitab / headless | **NOT RUN** |

## Routes with many demo/readiness surfaces

| Route | Notes |
|-------|-------|
| `/dashboard` | Candidate hub — forecast/progress lazy-loaded |
| `/dashboard/calendar/readiness` | Microsoft readiness + scheduling decision context |
| `/dashboard/offer-readiness` | Offer checklist + scheduling decision context |
| `/dashboard/placement-verification` | Placement evidence + lazy timeline |
| `/recruiter/daily-cockpit` | Memoized demo resolver |
| `/company/hiring-command-center` | Memoized demo resolver |
| `/board/calendar-readiness` | Board monitor + scheduling decision context |
| `/board/placement-verification` | Evidence matrix + lazy timeline |
| `/board/persistence-operations-monitor` | Multi-channel aggregate, memoized |

## Known safety improvements (prior + this batch)

- Workspace/auth uses `PerformanceSafeMovingLogoMarquee` (~12 brands) — full 89-logo marquee isolated to marketing via `dynamic()`.
- `PlacementEventsTimeline` lazy-loaded (`dynamic`, `ssr: false`) on placement-verification persona routes.
- `/dashboard` — `OpportunityForecast` and `ProgressDashboard` behind `dynamic()`.
- Cockpit/monitor routes memoize static demo resolvers with `useMemo`.
- Scheduling decision context panel memoizes demo bundle (2026-06-24).
- No heavy polling on readiness/evidence surfaces.
- Microsoft busy-read / OAuth connect / write gates remain **OFF** on production.

## Remaining P0 blockers

- No Phase 3B controlled performance proof.
- No stress or multitab validation.
- No headless-shell verification batch.
- No final launch performance evidence or Lighthouse budgets signed off.
- Staging Microsoft busy-read live smoke still **BLOCKED** (operator URL/JWT).

## Guardrails (this batch)

- **P0 remains OPEN** — do not claim fixed.
- **No launch-ready** performance claim.
- **No Phase 3B unlock** from docs/tests alone.
- **No shell/gate/layout** changes (`LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceLayout` untouched).
- **No stress / multitab / headless** npm scripts added.

## Related tests

```bash
cd frontend
npm run test:p0-performance-guardrails
npm run test:p0-route-weight-inventory   # optional static route inventory
npm run test:scheduling-decision-context
npm run test:performance-safe-moving-logo-marquee
```

## Related docs

- [P0_PERFORMANCE_INVENTORY_2026-06-21.md](./P0_PERFORMANCE_INVENTORY_2026-06-21.md)
- [SCHEDULING_DECISION_CONTEXT_2026-06-24.md](./SCHEDULING_DECISION_CONTEXT_2026-06-24.md)
- [MICROSOFT_BUSY_READ_STAGING_OPERATOR_SETUP_2026-06-24.md](./MICROSOFT_BUSY_READ_STAGING_OPERATOR_SETUP_2026-06-24.md)

**P0 performance remains OPEN.**
