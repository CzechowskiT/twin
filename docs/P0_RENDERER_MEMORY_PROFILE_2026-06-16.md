# P0 renderer memory profile — 2026-06-16

**Branch:** `fix/p0-renderer-memory-bundle-reduction-2026-06-16`  
**Incident:** After PR #144, founder still reports ~5 GB Chrome renderer **per tab** with 8–12 tabs open (~21 GB swap). Prior multi-tab hardening (PR #142) reduced GPU/polling but left large shared JS chunks and marketing payloads on workspace routes.  
**Scope:** Frontend bundle + hydration memory only — no product features, no auth weakening. Launch **NO-GO** unchanged.

## Investigation summary

### Build / chunk evidence (`npm run build`, `du -h .next/static/chunks`)

| Metric | Before (base `cursor/phase1-monorepo-scaffold`) | After (this PR) |
| ------ | ----------------------------------------------- | --------------- |
| Total static chunks | 4.7 MB | 4.7 MB |
| Largest JS chunk | **1.1 MB** (`04fz-a-8gpe.i.js`) | **1.1 MB** (same hash family — framework/vendor) |
| 2nd largest | 324 KB | 324 KB |
| CSS chunk | 224 KB | 224 KB |
| `company-logo-marquee` in initial chrome bundle | **Yes** — static `import` in `site-top-marquee.tsx` | **No** — `next/dynamic` async chunk |
| `SiteHeaderBar` marketing nav on workspace | **Yes** — shared monolith via `Header` | **No** — `WorkspaceSiteHeaderBar` / `AuthSiteHeaderBar` |
| `TwinRoiCalculator` on unrelated routes | Eager on `/calculator/b2b` page module | Lazy via `calculator-b2b-client.tsx` |
| Request deduper `Map` growth | Unbounded | **Max 64 entries** + TTL eviction |

`ANALYZE=true` / `@next/bundle-analyzer` not configured in repo; chunk sizes from `du` post-build.

### Largest source files (`wc -l`)

| File | Lines | Risk |
| ---- | ----- | ---- |
| `src/lib/job-brief-demo-data.ts` | ~447 | Demo payload — now lazy via `lazy-demo-data.ts` |
| `src/components/site-header-bar.tsx` | ~380 | Marketing corporate nav arrays — **not** imported on workspace/auth |
| `src/components/marketing/company-logo-marquee.tsx` | ~227 | 89-brand animated marquee — **async chunk only** |
| `src/components/marketing/twin-roi-calculator.tsx` | ~200+ | B2B calc model — **route-scoped dynamic** |

### `use client` audit

~280 client components in `frontend/src` (grep `"use client"`). **Removed from high-level layouts:**

- `src/app/dashboard/layout.tsx` — now Server Component
- `src/app/login/layout.tsx` — Server Component; client island `login-layout-client.tsx`
- `src/app/register/layout.tsx` — Server Component; client island `register-layout-client.tsx`

### Top memory sources (renderer)

| Source | Mechanism | Fix |
| ------ | --------- | --- |
| Global chrome JS | `SiteChrome` → `Header` imported marketing + workspace headers + static marquee | `ChromeHeader` route split; dynamic `CompanyLogoMarquee` + `MarketingHeader` |
| Brand GPU layers | 89 logos × 2 segments, `will-change`, `backdrop-blur` | `PerformanceSafeBrandStrip` (6 static logos) on workspace/auth |
| Demo constants | `job-brief-demo-data.ts`, `job-employer-demo.ts` | `lazy-demo-data.ts`, `capDemoArray(10)`, dynamic import in panels |
| Hydration trees | Talent pool/radar/digest/import below-fold | `useLoadWhenVisible` — summary first, details on intersect + tab visible |
| Deduper leak | `createRequestDeduper` unbounded `Map` | `maxCacheEntries=64`, `evictStale`, `trimToMax` |
| Blank route shells | Persona gate without paint | `LightweightRouteShell` skeleton + 8s timeout |

## Fixes applied (evidence-based)

### A. Split MarketingHeader / WorkspaceHeader / AuthHeader

| Component | Path | Imports marketing arrays? |
| --------- | ---- | ------------------------- |
| `MarketingHeader` | `marketing-header.tsx` → `SiteHeaderBar` | Yes (marketing only) |
| `WorkspaceHeader` | `workspace-header.tsx` → `WorkspaceSiteHeaderBar` | No corporate nav / persona lane arrays |
| `AuthHeader` | `auth-header.tsx` → `AuthSiteHeaderBar` | Minimal — logo + account links |
| `ChromeHeader` | `chrome-header.tsx` | Dynamic `MarketingHeader`; path picks auth/workspace/marketing |

`site-chrome.tsx` uses `ChromeHeader` (not legacy `Header`).

### B. Server-first layouts

Dashboard, login, register layouts are Server Components; client shells hold `LightweightRouteShell` only.

### C. Dynamic import heavy surfaces

- `CompanyLogoMarquee` — `site-top-marquee.tsx`
- `MarketingHeader` — `chrome-header.tsx`
- `TwinRoiCalculator` — `calculator-b2b-client.tsx`
- Investor room, dashboard modals, radar modals — retained from prior slice

### D. Cap brand / demo arrays

- Workspace strip: **6** logos (`LIGHT_BRANDS`)
- Demo arrays: **`DEMO_ARRAY_CAP = 10`** (`lazy-demo-data.ts`)
- Roles tab similar roles: `capDemoArray(..., 8)`

### E. Cap hydration

`useLoadWhenVisible` on talent pool readiness/details, radar summary/details, digest lower sections, import preview.

### F. Request deduper bounds

`create-request-deduper.ts`: `maxCacheEntries` (default 64), stale TTL eviction, oldest-first trim.

### G. Route fallbacks

`LightweightRouteShell` + `WorkspaceRouteSkeleton` / `AuthRouteSkeleton` — no permanent blank on hidden tabs.

## Verification

```bash
cd frontend
npm run test:p0-renderer-memory-bundle-reduction   # 12 assertions
npm run test:p0-browser-memory-multitab-performance  # 15 assertions
npm run test:multi-tab-performance-hardening         # 16 assertions
npm run build
npx tsc --noEmit
```

## Manual founder memory smoke

**Status: founder memory smoke pending** — cannot measure Activity Monitor from CI.

1. Open 8–12 tabs: `/dashboard`, `/recruiter/talent-radar`, `/company/talent-pool`, `/login/candidate`, `/status`, `/investor`.
2. Background all but one — renderer memory should stabilize below prior ~5 GB/tab baseline.
3. Workspace tabs: 6-logo static strip (not animated marquee).
4. DevTools → Network: initial workspace load should not fetch `company-logo-marquee` chunk until marketing route visited.

## Launch stance

Unchanged: public **NO-GO**, auto-apply **PAUSED**, no auth relaxation.

## Related docs

- `docs/P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md`
- `docs/MULTI_TAB_PERFORMANCE_HARDENING_2026-06-16.md`
- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` — § multi-tab QA
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
