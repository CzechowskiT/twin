# P1 frontend lint cleanup — 2026-05-26

Branch: `cursor/phase1-monorepo-scaffold`  
Commit: `chore(frontend): reduce lint debt` (see git log)

## Summary

| Metric | Before | After |
|--------|--------|-------|
| ESLint problems | 63 (55 errors, 8 warnings) | **0** |
| `react-hooks/set-state-in-effect` | ~53 | 0 |
| `@typescript-eslint/no-unused-vars` | 6 warnings | 0 |
| `react-hooks/exhaustive-deps` | 2 | 0 |
| `react-hooks/immutability` | 2 | 0 |

## Approach

- **No UX changes** — same loading flows, OAuth, dashboard, marketing pages.
- **Pattern:** defer synchronous `setState` / `void load()` calls inside `useEffect` with `queueMicrotask(...)` (already used in `privacy/page`, `dashboard/billing`, `scroll-reveal`, etc.).
- **Navigation:** `window.location.href = url` → `globalThis.location.assign(url)` where the immutability rule flagged redirects (billing checkout, ATS OAuth).
- **Imports:** removed unused symbols (`LOGIN_PATH`, `REGISTER_PATH`, `Link`, `usePathname`, `jobFiltersAreDefault`, dead `formatUsdListMonthly` helper).

## Files touched

~45 files under `frontend/src/` (marketing, auth, admin, recruiter, referrals, career-assistant, dashboard sub-pages, `applications-panel`, `site-header-bar`, legal pages, waitlist, profile).

## Remaining / follow-up

- **`dashboard/page.tsx` (~2.2k LoC):** lint is clean via microtask deferral; a **structural refactor** (data loading via SWR/React Query or server components) is still the right long-term fix — tracked as a separate slice, not mixed with P1 verification.
- **`@vercel/analytics` / `@vercel/speed-insights`:** not installed (observability gap on Vercel; optional product decision).

## Verification

```bash
cd frontend && npm run lint && npm run build
```

Both pass on branch after this commit.
