# P0 browser memory / multi-tab performance — 2026-06-16

**Branch:** `fix/p0-browser-memory-multitab-performance-2026-06-16`  
**Incident:** Chrome “tab slow” warnings; 3–6 GB per renderer with 8–12 TWIN tabs open. PR #142 helped but was insufficient.  
**Scope:** Frontend performance only — no product features, no auth weakening. Launch **NO-GO** unchanged.

## Confirmed root causes

| # | Root cause | Evidence | Fix |
| - | ---------- | -------- | --- |
| 1 | **Global logo marquee** (~89 brands × 2 animated segments, `will-change`, `backdrop-blur`) on every route including workspace | `company-logo-marquee.tsx`, Activity Monitor GPU on 8+ tabs | `PerformanceSafeBrandStrip` (6 static logos) on workspace/auth; full marquee on marketing only |
| 2 | **Nature wallpaper + studio ambient** on workspace lanes | `route-aware-background.tsx` mounted globally | Skip background on `isPerformanceLightChromePath`; `data-workspace-route` CSS pauses ambient |
| 3 | **Background polling** in hidden tabs | waitlist, beta, founders, dashboard scrape | Prior hardening retained: `useBackgroundAwareInterval`, 4× dashboard backoff |
| 4 | **Duplicate `/api/public-health`** | login, investor, status | Prior hardening retained: `fetchPublicHealthJson` deduper (45s TTL) |
| 5 | **Uncancelled fetches** on filter changes | talent radar, digest, pool, import | `useAbortableFetch` extended to import preview/commit |
| 6 | **Eager heavy client trees** on route entry | dashboard modals, investor room, for-companies persona page | `next/dynamic` with `ssr: false` on listed routes |
| 7 | **Large demo payloads in global imports** | `job-brief-demo-data.ts` (~447 lines) | `lazy-demo-data.ts` + `capDemoArray(12)` + dynamic import in `GlobalJobBriefPanel` |
| 8 | **Below-fold panels rendered eagerly** | talent pool readiness, radar groups, digest sections, import preview | `useLoadWhenVisible` (IntersectionObserver + tab visibility gate) |
| 9 | **Blank/stuck route shells** | persona gate redirect without paint feedback | `LightweightRouteShell` — skeleton + 8s timeout; hidden tabs never block children |
| 10 | **Pointer parallax in background tabs** | `nature-background.tsx` | Prior hardening retained; background skipped on workspace routes |

## New utilities

| Utility | Path | Purpose |
| ------- | ---- | ------- |
| `useLoadWhenVisible` | `frontend/src/hooks/use-load-when-visible.ts` | Defer subtree until near viewport AND tab visible |
| `LightweightRouteShell` | `frontend/src/components/lightweight-route-shell.tsx` | Skeleton + paint timeout; no infinite blank on hidden tabs |
| `PerformanceSafeBrandStrip` | `frontend/src/components/marketing/performance-safe-brand-strip.tsx` | 6-logo static strip — no animation/blur |
| `WorkspaceRouteLayout` | `frontend/src/components/workspace-route-layout.tsx` | Persona gate + lightweight shell |
| `WorkspaceRouteSync` | `frontend/src/components/workspace-route-sync.tsx` | Sets `html[data-workspace-route]` for CSS |
| `lazy-demo-data` | `frontend/src/lib/lazy-demo-data.ts` | Route-scoped dynamic import + array cap |
| `performance-route-classification` | `frontend/src/lib/performance-route-classification.ts` | Workspace/auth vs marketing path helpers |

## Surfaces hardened (this PR)

- **Global chrome:** `SiteTopMarquee` switches strip by route; `RouteAwareBackground` null on workspace/auth
- **Layouts:** dashboard, recruiter, company, login, register, investor/metrics
- **Company talent pool:** readiness + details deferred; readiness guide still `dynamic()`
- **Talent radar:** modals + candidate groups `dynamic()`; summary/details `useLoadWhenVisible`
- **Digest:** lower sections deferred after summary/narrative
- **Import:** preview panel deferred; abortable preview/commit fetches
- **Dashboard:** modals, tutorial, help, feedback lazy-loaded
- **Marketing:** `/for-companies`, `/investor` lazy client entry
- **CSS:** `html[data-workspace-route="true"]` strips blur, animation, `will-change`

## Verification

```bash
cd frontend
npm run test:p0-browser-memory-multitab-performance
npm run test:multi-tab-performance-hardening
npm run build
npx tsc --noEmit
```

**Manual multi-tab smoke (prod):**

1. Open 8–12 tabs: `/dashboard`, `/recruiter/talent-radar`, `/company/talent-pool`, `/login/candidate`, `/status`, `/investor`.
2. Background all but one — Activity Monitor: renderer memory should stabilize; CPU drops.
3. Workspace tabs show 6-logo static strip (not animated Fortune-500 marquee).
4. Flip hidden tab to foreground — route paints within 8s (no permanent blank).
5. Scroll talent pool / radar / digest — below-fold panels load on approach.

## Launch stance

Unchanged: public **NO-GO**, auto-apply **PAUSED**, no auth relaxation.

## Related docs

- `docs/MULTI_TAB_PERFORMANCE_HARDENING_2026-06-16.md` — prior slice (polling, dedupe, marquee pause on hidden)
- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` — § multi-tab QA row
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — ops reality entry
