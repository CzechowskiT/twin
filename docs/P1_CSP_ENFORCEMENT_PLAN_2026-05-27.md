# P1 CSP Enforcement Readiness Plan — 2026-05-27

TASK 5 of the **security / ops hardening** session on
`cursor/phase1-monorepo-scaffold` (morning, 2026-05-27).
Inventory of every external origin our frontend reaches,
proposed enforce-mode CSP shape, burn-in plan, rollback
plan, and a read-only header contract test
(`frontend/scripts/security-headers.test.ts`).

**This commit does NOT flip enforcement.** The CSP stays
`Content-Security-Policy-Report-Only` in production. The
flip is gated on the burn-in described in §"Risk gates".

## TL;DR

- Current CSP (in `frontend/next.config.ts`):

  ```
  Content-Security-Policy-Report-Only:
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data: https:;
    connect-src 'self' https:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self'
  ```

  Today's set is **permissive** (`https:` everywhere in
  `img-src` / `font-src` / `connect-src`,
  `'unsafe-inline'` + `'unsafe-eval'` in `script-src`).
  Report-only mode means browsers send violation reports
  to a (currently unwired) report URI but never block
  content.
- The right move for P1 is **not** "flip to enforce
  with today's set" — the permissive `https:` wildcards
  would defeat the point of enforcement. The right move
  is "narrow each directive to its real allowlist, *then*
  flip". Three slices, ordered:
  1. **Narrow `img-src` / `font-src` / `connect-src`** to
     explicit hosts (this doc has the list).
  2. **Spike `script-src` nonces** (drop `'unsafe-inline'`
     + `'unsafe-eval'`). Out of scope for this run — sized
     in `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
     item 1.
  3. **Flip `-Report-Only` → enforce** once preview burn-
     in shows zero violations for 72h.
- This commit ships **slice 0**: docs + a structural
  test (`scripts/security-headers.test.ts`) that asserts
  the current header shape so a refactor cannot silently
  drop a directive.

Verdict: **docs + test, no enforcement flip, no
directive change in this run.**

## Inventory — every external origin we touch

Grepped over `frontend/src/**` for absolute `https://`
URLs and the `next.config.ts` `images.remotePatterns`
list. Below is the deduped list, bucketed by CSP
directive.

### `script-src`

| Origin                       | Why                                                             | Source                                |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| `'self'`                     | Next.js bundles                                                  | `frontend/src/app/**`                 |
| `https://plausible.io`       | Plausible script tag                                            | `frontend/src/lib/analytics.ts:50`    |
| **(today)** `'unsafe-inline'` | Next.js runtime inline blocks; removable with nonce             | `frontend/next.config.ts:14`          |
| **(today)** `'unsafe-eval'`  | Some Next.js dev-only paths; verify if still needed in prod      | `frontend/next.config.ts:14`          |

Nonce work (drop `'unsafe-inline'` + `'unsafe-eval'`) is
**item 1 of the security plan** — separate PR, out of
this slice.

### `style-src`

| Origin                       | Why                                                       |
| ---------------------------- | --------------------------------------------------------- |
| `'self'`                     | Tailwind output (`globals.css`)                            |
| `'unsafe-inline'`            | Next.js inlines critical CSS; can move to nonce later     |

### `connect-src`

| Origin                            | Why                                                                 | Source                                |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| `'self'`                          | API proxy (`/api/v1/...` and `/api/v1/[[...path]]/route.ts`)        | `frontend/src/app/api/v1/...`         |
| `https://plausible.io`            | Plausible event ingest (same host as script)                        | `frontend/src/lib/analytics.ts`       |
| `https://us.i.posthog.com`        | PostHog capture endpoint                                            | `frontend/src/lib/analytics.ts:58`    |

Notes:

- We do **not** call Stripe from the browser (no
  `js.stripe.com` script loaded). All Stripe is server-
  side via Checkout Session redirect. **No CSP entry
  needed for Stripe.**
- We do **not** call Sentry / Datadog / GA / Hotjar /
  Mixpanel / Amplitude / Segment / Vercel Web Analytics
  from the browser. None today.
- OAuth (Google / GitHub / Apple / Microsoft / LinkedIn)
  flows leave our origin via `Location:` redirect from
  the backend — **not** via in-page fetch. So they do
  not need `connect-src` entries. They would need
  `form-action` if any provider posts back to us, but
  our callbacks accept `GET` query-string callbacks; no
  cross-origin form POST.

### `img-src`

| Origin                                  | Why                                                                                                   | Source                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `'self'`                                | Our own assets, `/_next/image` cached output                                                          | everywhere                                      |
| `data:`                                 | Inline favicons, blur placeholders                                                                    |                                                  |
| `blob:`                                 | Uploaded file previews (CV / intro audio thumbnails) — needs verification, currently allowed by `https:` wildcard |                                       |
| `https://images.unsplash.com`           | Nature wallpapers + marketing photo paths                                                             | `frontend/src/lib/nature-wallpapers.ts`         |
| `https://cdn.simpleicons.org`           | Company logo marquee fallback                                                                         | `frontend/src/components/marketing/company-logo-marquee.tsx` |
| `https://cdn.jsdelivr.net`              | Simple-icons jsDelivr SVG fallback                                                                    | same                                            |
| `https://www.google.com`                | Google `/s2/favicons` fallback                                                                        | same                                            |
| `https://t0.gstatic.com` … `t3.gstatic.com` | Google favicon CDN tier                                                                            | `frontend/next.config.ts:35-38`                 |
| `https://icons.duckduckgo.com`          | DuckDuckGo favicon fallback                                                                           | same component                                  |
| `https://www.capitalone.com`            | One-off enterprise logo example in the marquee                                                        | same                                            |

If we narrow `img-src` away from the `https:` wildcard,
**this list is what we keep**. Order: most-used first,
then niche fallbacks.

### `font-src`

| Origin     | Why                                                                                  |
| ---------- | ------------------------------------------------------------------------------------ |
| `'self'`   | Geist via `next/font/google` — fonts are **self-hosted** by next/font at build time. |
| `data:`    | Some Tailwind utilities embed font tokens as data URIs.                              |

We can **drop the `https:` wildcard** here — `next/font`
removes all external font URLs from the runtime. No
`fonts.gstatic.com` request from the browser.

### `frame-src`

| Origin                                | Why                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `https://www.youtube-nocookie.com`    | Founders launch page embeds a YouTube video via the no-cookie sub-domain. |

Single entry. No other iframes (Stripe Checkout opens in
a **redirect**, not an embed; OAuth providers do the
same).

### `frame-ancestors`

`'none'` — no one is allowed to iframe us. Same as
today.

### `base-uri`, `form-action`

`'self'` for both. No external `<form action="...">`,
no `<base href>`.

### `report-uri` / `report-to`

Today **not configured**. The Report-Only header has no
where to send violations. Adding `report-uri /api/v1/
csp-report` is part of the slice that lands the new
endpoint (also called out in
`docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
item 1). Out of scope for this readiness doc.

## Proposed enforce-mode CSP (slice 1 + 3 combined)

This is the **target** shape, not the shape shipped in
this commit. Compared to today: hosts spelled out, no
`https:` wildcards, `frame-src` and `media-src` added,
`'unsafe-inline'` / `'unsafe-eval'` still present
(removed by separate nonce slice, item 1).

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval'
              https://plausible.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:
              https://images.unsplash.com
              https://cdn.simpleicons.org
              https://cdn.jsdelivr.net
              https://www.google.com
              https://t0.gstatic.com
              https://t1.gstatic.com
              https://t2.gstatic.com
              https://t3.gstatic.com
              https://icons.duckduckgo.com
              https://www.capitalone.com;
  font-src 'self' data:;
  connect-src 'self'
              https://plausible.io
              https://us.i.posthog.com;
  frame-src https://www.youtube-nocookie.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  report-uri /api/v1/csp-report;
  report-to twin-csp
```

Open: should `connect-src` include `'self'` only, or
also include the **backend host** (`twin-api-production.up.
railway.app` for direct calls if we ever bypass the
Vercel API proxy)? Today everything goes through the
proxy → `'self'` is enough. If we ever switch to direct
calls, we'd add the Railway host. Documented for future
reviewer.

## Risk gates (before flipping)

Per `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
item 1, the flip requires:

1. **Preview burn-in.** Deploy the narrowed CSP under
   `Content-Security-Policy-Report-Only` on
   `twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app`.
   Watch `/api/v1/csp-report` for **72 hours**. Zero
   violations on these routes:
   `/`, `/dashboard`, `/login/candidate`,
   `/register/candidate`, `/waitlist`, `/demo`,
   `/status`, `/pricing`, `/for-candidates`,
   `/for-companies`, `/recruiter/inbox`.
2. **DevTools spot-check** in incognito, on
   Chrome / Safari / Firefox / mobile-Safari / mobile-
   Chrome. Open each of the above routes; the console
   must be clean of CSP violation messages.
3. **Founder demo dry-run.** Walk through the live
   investor demo script
   (`docs/INVESTOR_DEMO_RUNBOOK.md`) end-to-end on the
   preview alias; no broken images, no missing fonts,
   no broken `<iframe>`.
4. **`/api/v1/csp-report` endpoint** must exist and be
   no-op-safe (`HTTP 204`); ships in the same PR that
   flips the header name. Not in this commit.

Only when all 4 gates pass do we flip
`-Report-Only` → enforce, in a **single-character diff**
on `frontend/next.config.ts`.

## Rollback plan

| Trigger                                  | Action                                                                                   | Recovery time |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| Broken page in production after flip     | Revert the one-character header rename on `next.config.ts`; redeploy via `git push`     | < 5 min       |
| CSP report rate spikes after flip        | Add the violated host to the relevant directive in `next.config.ts`; redeploy           | < 10 min      |
| Stripe redirect appears broken           | (Should not happen — Stripe is server-side) revert + add `frame-src js.stripe.com` if needed | < 10 min  |
| Mobile Safari falls back to white screen | Revert; investigate `'unsafe-eval'` removal (regression from nonce slice if it shipped) | < 5 min       |

No data side-effect from a CSP flip — the cookies, the
storage, the DB all stay intact. Rollback is purely a
response-header rename.

## What this commit ships

- `frontend/scripts/security-headers.test.ts` — read-only
  contract test over the `next.config.ts` headers
  array. 8 assertions:
  1. `headers()` exists and covers `/:path*`.
  2. `X-Frame-Options` is `DENY`.
  3. `X-Content-Type-Options` is `nosniff`.
  4. `Referrer-Policy` is `strict-origin-when-cross-origin`.
  5. `Permissions-Policy` disables
     camera / microphone / geolocation /
     interest-cohort.
  6. CSP is still in `Report-Only` mode (P1 baseline);
     no enforce-mode CSP yet.
  7. Required directives are present:
     `default-src`, `script-src`, `style-src`,
     `img-src`, `font-src`, `connect-src`,
     `frame-ancestors`, `base-uri`, `form-action`.
  8. `frame-ancestors 'none'` is locked.
- `frontend/package.json` — new alias:
  `npm run test:security-headers`.
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`
  (this doc).

No change to the actual CSP string. No change to any
production header. No flip.

## How to run the contract test

```text
$ cd frontend && npm run test:security-headers
> frontend@0.1.0 test:security-headers
> npx --yes tsx scripts/security-headers.test.ts

ok headers() exists and covers all paths
ok X-Frame-Options is DENY
ok X-Content-Type-Options is nosniff
ok Referrer-Policy is strict-origin-when-cross-origin
ok Permissions-Policy disables camera/mic/geo/interest-cohort
ok CSP is currently in report-only mode (P1 baseline)
ok CSP directives are present and explicit
ok frame-ancestors is locked to 'none'
```

Frontend gates re-run after the change:

| Gate                      | Result   |
| ------------------------- | -------- |
| `npm run lint`            | 0 errors / 0 warnings |
| `npx tsc --noEmit`        | 0 errors |
| `npm run test:security-headers` | 8/8 OK |

`npm run build` was already verified in TASK 4 of this
session and is unchanged here (no source change to the
build graph; only a new tsx test under `scripts/`).

## Hard bans honoured (this run)

- No Railway change / redeploy.
- No API redeploy.
- No DB migration.
- No prod env change.
- No secret / JWT in this doc.
- No `--no-verify`, no force-push.
- No UX / copy change.
- **CSP stays in report-only mode** — no enforce flip
  in this commit.

## Files changed

- `frontend/scripts/security-headers.test.ts` (new).
- `frontend/package.json` (one new script alias).
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`
  (this doc).

## Related

- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  item 1 — CSP enforce flip (parent task; this commit
  is the readiness plan that gates that flip).
- `docs/P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md` — feeds
  the `connect-src` list (PostHog, Plausible).
- `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md` —
  confirms no client-side Stripe surface, so Stripe is
  not in `connect-src` or `frame-src`.
- `docs/P1_RELEASE_BASELINE_2026-05-27.md` — same-day
  pre-run baseline; the CSP string captured there is
  what this plan narrows.
