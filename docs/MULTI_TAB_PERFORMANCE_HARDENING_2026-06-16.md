# Multi-tab workspace performance hardening — 2026-06-16

**Branch:** `fix/multi-tab-performance-hardening-2026-06-16`  
**Scope:** Frontend performance only — no product features, no auth weakening, launch **NO-GO** unchanged.

## Problem

Opening 8–12 TWIN tabs caused severe browser/CPU slowdown. Root causes:

1. **Background polling** — `setInterval` on waitlist/first-1000/beta stats and dashboard scrape refresh continued in hidden tabs.
2. **GPU-heavy chrome** — global logo marquee (`will-change-transform`, 120s CSS animation) and `backdrop-blur` ran on every tab.
3. **Duplicate public-health fetches** — login OAuth flags, investor dashboard, and status page each hit `/api/public-health` independently with no coalescing.
4. **Uncancelled fetches** — talent radar, digest, and talent pool clients could stack in-flight requests on rapid filter changes.
5. **Pointer parallax** — nature wallpaper `pointermove` listeners stayed active in background tabs.

## Shared utilities (`frontend/src/hooks`, `frontend/src/lib`)

| Utility | Purpose |
| ------- | ------- |
| `usePageVisibility` | `document.hidden` via `visibilitychange` |
| `useBackgroundAwareInterval` / `useBackgroundAwarePolling` | Pause or back off timers when tab hidden |
| `useAbortableFetch` | Abort superseded/unmounted fetches |
| `createRequestDeduper` | 30–45s TTL coalesce for read-only health/config |
| `fetchPublicHealthJson` | Deduped `/api/public-health` |
| `useReducedMotionPreference` | `prefers-reduced-motion` hook |
| `PageVisibilitySync` | Sets `data-page-hidden` / `data-reduced-motion` on `<html>` for CSS |

## Applied surfaces

- **Global chrome:** marquee pauses + static scroll when hidden/reduced-motion; CSS drops blur on hidden tabs.
- **Dashboard:** scrape poll backs off 4× when `document.hidden`.
- **Calendar:** debounced interview refresh skipped while hidden.
- **Talent Radar / Digest / Talent Pool:** abortable fetch + digest `useMemo` aggregation.
- **Company talent pool:** dynamic import for readiness guide; memoized role/skill/readiness slices.
- **Marketing polls:** waitlist stats, first-1000, beta landing use background-aware intervals.
- **OAuth / ops / investor / status:** deduped public-health and health?ops=1 reads.

## Verification

```bash
cd frontend
npm run test:multi-tab-performance-hardening
npm run build
npx tsc --noEmit
```

**Manual smoke (prod):**

1. Open 8–12 tabs: `/dashboard`, `/recruiter/talent-radar`, `/company/talent-pool`, `/login/candidate`, `/status`.
2. Activity Monitor / Task Manager — CPU should drop when all but one tab are backgrounded.
3. `GET /api/public-health` — single coalesced request per ~45s per tab group when flipping login/status/investor quickly.
4. Logo marquee animation frozen on hidden tabs (visible tab still animates).

## Launch stance

Unchanged: public **NO-GO**, auto-apply **PAUSED**, no auth relaxation.
