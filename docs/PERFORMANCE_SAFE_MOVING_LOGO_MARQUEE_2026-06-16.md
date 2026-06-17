# Performance-safe moving logo marquee — 2026-06-16

**Branch:** `fix/performance-safe-moving-logo-marquee-2026-06-16`  
**Problem:** PR #144 dynamic-imported the 89-brand `CompanyLogoMarquee` on every route. Workspace/auth tabs still paid for ~178 DOM logo nodes (89 × 2 segments), GPU compositing, and the full brand catalog chunk when the async import resolved.  
**Goal:** Keep the marquee **visually alive** on workspace/auth while bounding DOM cost and never eagerly loading the full logo array on light chrome routes.

## Policy

| Route lane | Component | DOM logo nodes | Brand data | Animation |
| ---------- | --------- | -------------- | ---------- | --------- |
| Workspace + auth (`isPerformanceLightChromePath`) | `PerformanceSafeMovingLogoMarquee` | **≤27** (9 brands × 3 segments) | `marquee-brand-subset.ts` + `performance-safe-curated-logos.ts` | CSS `translate3d` loop (1 segment/cycle), 48s |
| Marketing + public | `CompanyLogoMarquee` (dynamic) | ~178 (89 × 2) | `company-logo-marquee.tsx` | CSS `translate3d` loop, 120s |

**Never again:** static 6-logo strip on workspace, or eager 89-brand import on dashboard/recruiter/login.

## Implementation

### `PerformanceSafeMovingLogoMarquee`

- Path: `frontend/src/components/marketing/performance-safe-moving-logo-marquee.tsx`
- Imports `PERFORMANCE_SAFE_MARQUEE_BRANDS` from `frontend/src/lib/marquee-brand-subset.ts` — **not** `MARQUEE_BRAND_ENTRIES`
- Two identical segments; `-50%` transform for seamless loop
- `usePageVisibility` + `useReducedMotionPreference` → static scrollable strip when hidden or motion reduced
- No `will-change`, `backdrop-filter`, or `backdrop-blur` on track or band

### `SiteTopMarquee` routing

- Path: `frontend/src/components/site-top-marquee.tsx`
- `isPerformanceLightChromePath(pathname)` → safe marquee (static import, small chunk)
- Else → `next/dynamic` `CompanyLogoMarquee` (marketing-only async chunk)

### CSS (`globals.css`)

- `.performance-safe-marquee-track` — transform-only animation
- `html[data-page-hidden="true"]` / `html[data-reduced-motion="true"]` — `animation-play-state: paused`
- `html[data-workspace-route="true"]` — strip backdrop blur on safe marquee band

## Verification

```bash
cd frontend
npm run test:performance-safe-moving-logo-marquee   # 12 assertions
npm run test:p0-renderer-memory-bundle-reduction
npm run test:p0-browser-memory-multitab-performance
npm run test:p0-production-stuck-route-regression
npm run build
npx tsc --noEmit
```

**Post-deploy smoke (founder-free):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:prod-recruiter-controlled-multitab-smoke
```

Run prod smoke **only after** merge + deploy. Do **not** start Phase 3B before safe marquee is live.

## Polish report (16 sections)

1. **Incident** — Full marquee on workspace/auth caused high renderer memory per tab despite dynamic import.
2. **Root cause** — Same 89×2 DOM strip mounted on all routes; brand array in async chunk still heavy on resolve.
3. **User requirement** — Moving visual must remain; heavy implementation must never return.
4. **DOM budget** — Max 18 logo nodes on light chrome (9 × 2 segments).
5. **Brand data** — Compact subset file; no cross-import from marketing marquee.
6. **Animation** — CSS transform on small track; 48s loop (faster perceived motion vs 120s marketing).
7. **Hidden tab** — `usePageVisibility` + `data-page-hidden` pauses animation via CSS.
8. **Reduced motion** — Static acceptable strip; `data-reduced-motion` pauses track.
9. **GPU guards** — No backdrop-blur / will-change on safe track or band.
10. **Route split** — `site-top-marquee.tsx` uses `isPerformanceLightChromePath`.
11. **Marketing unchanged** — Full `CompanyLogoMarquee` lazy-loaded only off light paths.
12. **Tests** — `test:performance-safe-moving-logo-marquee` (12 specs); P0 suites updated.
13. **Build** — `npm run build` + `tsc --noEmit` green before merge.
14. **Deploy gate** — CI green → merge → deploy → prod Playwright smoke.
15. **Phase 3B** — Blocked until post-deploy smoke passes; no founder manual smoke.
16. **Regression guard** — P0 + dedicated test assert safe component on workspace/auth; forbid eager full marquee.

## Final logo quality and seamless-loop correction — 2026-06-17

**Branch:** `fix/final-logo-marquee-quality-seamless-loop-2026-06-17`  
**Incident:** Founder reported wrong/generic logos (Meta infinity glyph, tiny Visa, Salesforce blob, thin Netflix N), visible gaps/pauses in the moving loop on workspace/auth.

### Root cause

1. **Logo quality** — `PerformanceSafeMovingLogoMarquee` used `brandLogoUrls()` → Simple Icons CDN/jsDelivr. Several slugs render monochrome glyphs or broken blobs on white plates, not recognizable wordmarks.
2. **Seamless loop** — Two segments (`-50%` transform) left track width below 2.5× viewport on 1440/1920/ultrawide, exposing empty band gaps during the animation cycle.

### Fix

| Area | Change |
| ---- | ------ |
| Curated logos | `performance-safe-curated-logos.ts` + `public/logos/marquee-curated/*.svg` — self-hosted wordmarks for all 9 subset brands; safe marquee uses **only** local paths (no CDN). |
| Segments | `PERFORMANCE_SAFE_MARQUEE_SEGMENTS = 3` → 27 DOM nodes (within hard max 30). |
| CSS loop | `translate3d(calc(-100% / var(--performance-safe-marquee-segments, 3)), 0, 0)` — exactly one segment per cycle. |
| Card width | Slightly wider plates (`7.25rem` / `8rem`) for better ultrawide coverage. |
| Tests | `test:performance-safe-moving-logo-marquee` (14 specs); `test:performance-safe-moving-logo-marquee-browser` (13 browser specs, workers=1). |

### Curated subset (workspace/auth only)

Apple, Microsoft, Google, Amazon, NVIDIA, Meta, Visa, Salesforce, Netflix.

### Policy unchanged

- Moving marquee remains on workspace/auth (not static strip).
- Full 89-brand `CompanyLogoMarquee` still lazy-loaded on marketing only.
- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, workspace layouts, or route fallback.
- Launch NO-GO and Phase 3B gating unchanged.

## Final visual polish — 2026-06-17

**Branch:** `fix/logo-marquee-final-visual-polish-2026-06-17`  
**Incident:** Founder reported inconsistent visual weight after PR #160 — NVIDIA too heavy, Meta plain, Visa over-italic, Salesforce too small, mixed asset feel.

### Approach

**Option A — premium inline wordmark treatment** via `PerformanceSafeLogoMark`:

- One consistent optical height (~16px) across all 9 brands
- Per-brand `opticalScale` metadata (Apple capped 0.88, NVIDIA ≤0.92, Salesforce ≥0.94)
- `qualityStatus: verified-curated` on every mark
- No `<img>` / CDN on workspace/auth — inline SVG + system-ui text only

### Curated subset (unchanged count)

Apple, Microsoft, Google, Amazon, NVIDIA, Meta, Visa, Salesforce, Netflix.

### Node count & loop

9 × 3 segments = **27 nodes** (hard max 30). CSS `calc(-100% / 3)` seamless loop; animation **52s** (calmer). Hidden-tab pause + reduced-motion static strip unchanged.

### Policy unchanged

P0 performance **OPEN**; Phase 3B **BLOCKED**; launch **NO-GO**.

## Related docs

- `docs/P0_RENDERER_MEMORY_PROFILE_2026-06-16.md` — renderer memory program (updated)
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — P0 test matrix
