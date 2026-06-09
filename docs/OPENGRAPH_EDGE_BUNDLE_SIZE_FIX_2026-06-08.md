# OpenGraph Edge bundle size fix — 2026-06-08

**Branch:** `fix/opengraph-edge-bundle-size-2026-06-08`  
**Owner:** TWIN Vercel Edge Function Size Fix Owner  
**Trigger:** Vercel build failure after PR #61 — `waitlist/opengraph-image` Edge Function **1.03 MB** (plan limit **1 MB**)

## Root cause

`frontend/src/app/waitlist/opengraph-image.tsx` imported:

- `@/lib/waitlist-messages` — full multi-locale waitlist copy (~800+ lines, all locales)
- `@/lib/waitlist/locale-from-request` → `@/lib/i18n` — full dictionary + base overlays + **premium generated overlays**

Those modules are correct for app pages and SSR metadata, but Next.js bundles each Edge route independently. Pulling the full i18n graph into an Edge OG route exceeded the 1 MB limit.

## Fix

1. **`frontend/src/lib/og/waitlist-og-copy.ts`** — tiny standalone map (`metaTitle`, `metaDescription`) for **en** and **pl** only, plus `ogLocaleFromAcceptLanguage()` with no `i18n.ts` dependency.
2. **`opengraph-image.tsx`** — imports only `next/og`, `next/headers`, and `@/lib/og/waitlist-og-copy`.
3. **`npm run test:og-bundle-guard`** — fails CI if any `opengraph-image` / `twitter-image` route imports forbidden heavy modules.

### Unchanged (by design)

- **`waitlist/layout.tsx`** still uses `WAITLIST_MESSAGES` + full locale resolution for HTML `<meta>` tags (Node SSR, not Edge).
- App-wide i18n, premium overlays, and coverage tests are untouched.

## Validation

```bash
cd frontend
npm run test:og-bundle-guard
npm run test:i18n-coverage
npm run test:i18n-premium-product
npm run test:trust-language-guard
npm run test:homepage-nav
npm run test:auth-role-choice
npm run test:interactive-demo
npm run lint
npx tsc --noEmit
npm run build
```

Post-deploy smoke: `GET /waitlist/opengraph-image` (200, `image/png`).

## Launch stance

Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE** · no CSP/auth/env weakening.
