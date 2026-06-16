# Multi-tab workspace performance hardening — 2026-06-16

**Branch:** `fix/p0-browser-memory-multitab-performance-2026-06-16` (supersedes `fix/multi-tab-performance-hardening-2026-06-16`)  
**Scope:** Frontend performance only — no product features, no auth weakening, launch **NO-GO** unchanged.

**P0 incident doc:** `docs/P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md`

## Problem

Opening 8–12 TWIN tabs caused severe browser/CPU slowdown and 3–6 GB per renderer. Root causes:

1. **Background polling** — `setInterval` on waitlist/first-1000/beta stats and dashboard scrape refresh continued in hidden tabs.
2. **GPU-heavy chrome** — global logo marquee (`will-change-transform`, 120s CSS animation) and `backdrop-blur` ran on every tab including workspace.
3. **Duplicate public-health fetches** — login OAuth flags, investor dashboard, and status page each hit `/api/public-health` independently with no coalescing.
4. **Uncancelled fetches** — talent radar, digest, talent pool, and import clients could stack in-flight requests.
5. **Pointer parallax** — nature wallpaper `pointermove` listeners stayed active in background tabs.
6. **Eager heavy client trees** — dashboard modals, investor room, employer demo data loaded on route entry.
7. **Below-fold panels** — talent pool readiness, radar groups, digest sections rendered before scroll.

## Shared utilities (`frontend/src/hooks`, `frontend/src/lib`, `frontend/src/components`)

| Utility | Purpose |
| ------- | ------- |
| `usePageVisibility` | `document.hidden` via `visibilitychange` |
| `useBackgroundAwareInterval` / `useBackgroundAwarePolling` | Pause or back off timers when tab hidden |
| `useAbortableFetch` | Abort superseded/unmounted fetches |
| `useLoadWhenVisible` | IntersectionObserver + tab visibility — defer heavy panels |
| `createRequestDeduper` | 30–45s TTL coalesce; **max 64 cache entries** with eviction |
| `fetchPublicHealthJson` | Deduped `/api/public-health` |
| `useReducedMotionPreference` | `prefers-reduced-motion` hook |
| `PageVisibilitySync` | Sets `data-page-hidden` / `data-reduced-motion` on `<html>` for CSS |
| `WorkspaceRouteSync` | Sets `data-workspace-route` on workspace/auth paths |
| `LightweightRouteShell` | Skeleton + 8s paint timeout; hidden tabs never block forever |
| `PerformanceSafeBrandStrip` | 6-logo static strip for workspace/auth (no animation/blur) |
| `lazy-demo-data` | Dynamic import + `capDemoArray(10)` for demo payloads |
| `ChromeHeader` / `WorkspaceSiteHeaderBar` / `AuthSiteHeaderBar` | Route-split headers — workspace/auth avoid marketing nav + marquee chunk |

## Applied surfaces

- **Global chrome:** workspace/auth → `PerformanceSafeBrandStrip`; marketing → full marquee; hidden/reduced-motion pauses animation; CSS drops blur on hidden + workspace routes; nature background skipped on workspace.
- **Route shells:** dashboard, recruiter, company, login, register use `LightweightRouteShell`.
- **Dashboard:** scrape poll backs off 4× when `document.hidden`; modals/tutorial/help lazy-loaded.
- **Calendar:** debounced interview refresh skipped while hidden.
- **Talent Radar / Digest / Talent Pool / Import:** abortable fetch + visibility-deferred panels + radar modals `dynamic()`.
- **Company talent pool:** dynamic import for readiness guide; memoized slices; readiness/details deferred.
- **Marketing polls:** waitlist stats, first-1000, beta landing use background-aware intervals.
- **OAuth / ops / investor / status:** deduped public-health and health?ops=1 reads.
- **For-companies / investor:** lazy client entry components.

## Verification

```bash
cd frontend
npm run test:p0-renderer-memory-bundle-reduction
npm run test:p0-browser-memory-multitab-performance
npm run test:multi-tab-performance-hardening
npm run build
npx tsc --noEmit
```

**Manual smoke (prod):**

1. Open 8–12 tabs: `/dashboard`, `/recruiter/talent-radar`, `/company/talent-pool`, `/login/candidate`, `/status`.
2. Activity Monitor / Task Manager — CPU and memory should drop when all but one tab are backgrounded.
3. Workspace tabs show static 6-logo strip (not animated 89-brand marquee).
4. `GET /api/public-health` — single coalesced request per ~45s when flipping login/status/investor quickly.
5. Logo marquee animation frozen on hidden tabs (visible marketing tab still animates).

## Launch stance

Unchanged: public **NO-GO**, auto-apply **PAUSED**, no auth relaxation.
