# S2 CSP multi-browser DevTools burn-in checklist — 2026-06-01

Complete on the **preview alias** (preferred) or prod after narrowed report-only deploy.
Use **incognito/private** profiles with **extensions disabled**.
CSP must remain **Report-Only** — console shows violations as warnings, pages must not break.

**Prod alias:** `https://twin-sooty.vercel.app`

## Browsers

- [x] Chrome (desktop) — **PASS** (founder DevTools `2026-06-03T13:29:36Z`; routes below)
- [ ] Safari (desktop) — **PENDING**
- [ ] Firefox (desktop) — **PENDING**
- [ ] Mobile Safari (iOS) or responsive mode — **PENDING**
- [ ] Mobile Chrome (Android) or responsive mode — **PENDING**

**Automation note:** `scripts/audit-csp-headers.sh` + `npm run test:security-headers` verify CSP-RO headers and narrowed allowlists — **not** a substitute for per-browser DevTools console/network checks.

## Chrome (desktop) — founder PASS 2026-06-03

**Checkpoint UTC:** `2026-06-03T13:29:36Z`

**Profile:** incognito/private, extensions **disabled**.

**Routes checked:** `/` → `/login/candidate` → `/register/candidate` → `/dashboard` → `/dashboard/calendar` → `/demo` → `/status` → `/api/public-health` (Network).

| Route | Console CSP clean? | Notes |
| ----- | ------------------ | ----- |
| `/` | ✅ PASS | No CSP violations |
| `/login/candidate` | ✅ PASS | No CSP violations |
| `/register/candidate` | ✅ PASS | No CSP violations |
| `/dashboard` | ✅ PASS | No CSP violations |
| `/dashboard/calendar` | ✅ PASS | No CSP violations |
| `/demo` | ✅ PASS | No CSP violations |
| `/status` | ✅ PASS | No CSP violations |
| `/api/public-health` | ✅ PASS (Network) | JSON OK; no Console CSP expected |

**Non-CSP observations (out of scope for burn-in blocker):**

| Observation | CSP triage? |
| --- | --- |
| `GET /api/v1/jobs/saved` → **422** without a CSP Console line | **No** — API/auth/validation; not an S2 burn-in blocker |
| Red Console `GET /_next/image?url=…` for external logo hosts (`icons.duckduckgo.com`, `www.google.com/s2/favicons`, `cdn.simpleicons.org`, …) → **400** / **404** / **502**; **no** Console line containing “Content Security Policy”, “Refused to connect/load”, “violates the following directive”, or `blocked-uri` | **No** — Next.js image optimizer / upstream favicon CDN failures on marketing logo marquee (`frontend/src/components/marketing/company-logo-marquee.tsx`); **not** an S2 reset or CSP failure; **fix chain:** `SafeCompanyLogo` (no `/_next/image`) then `FAVICON_INITIALS_ONLY_DOMAINS` in `brand-logo-urls.ts` for DuckDuckGo 404 domains (`homedepot.com`, `chevron.com`, `servicenow.com`, `humana.com`, `cvs.com`) — **post-deploy founder browser smoke required** |
| Red Console direct `GET https://icons.duckduckgo.com/ip3/*.ico` → **404** (no CSP line) | **No** — non-CSP favicon CDN miss after `SafeCompanyLogo`; **fix shipped** — initials-only skiplist for known 404 domains; Google favicon before DuckDuckGo for others — **post-deploy smoke on `/`** |

**Chrome CSP verdict (unchanged):** founder pass at `2026-06-03T13:29:36Z` (`ece6588`) — **no CSP violations** on core routes; pre-fix image-proxy Console noise was **orthogonal** to CSP burn-in PASS. **S2 burn-in: CONTINUE** (no clock reset).

## Safari (desktop) — manual checklist (PENDING)

**Status:** **PENDING** — complete before window end `2026-06-05T14:18:33Z`.

**Profile:** Private Window; disable content blockers / extensions for the test pass (or note extension noise in evidence).

**Routes (in order):** `/` → `/login/candidate` → `/register/candidate` → `/dashboard` (logged-out, then logged-in if possible) → `/dashboard/calendar` → `/demo` → `/status` → `/api/public-health` (Network tab only).

### Pass criteria (each route)

1. DevTools → **Console** — filter “Content Security Policy” / “CSP”; expect **no** unexpected violations on TWIN-required hosts.
2. **Network** — filter `csp-report`; `POST /api/v1/csp-report` → **204** only when violations occur (ideally none this pass).
3. Hard refresh with cache disabled.
4. Page renders without white screen / broken fonts or images attributable to CSP.
5. Record browser version + screenshot or Console export (no tokens/cookies).

| Route | Console clean? | Network anomalies? | PASS? |
| ----- | -------------- | ------------------ | ----- |
| `/` | pending | pending | [ ] |
| `/login/candidate` | pending | pending | [ ] |
| `/register/candidate` | pending | pending | [ ] |
| `/dashboard` | pending | pending | [ ] |
| `/dashboard/calendar` | pending | pending | [ ] |
| `/demo` | pending | pending | [ ] |
| `/status` | pending | pending | [ ] |
| `/api/public-health` | n/a (Network) | pending | [ ] |

**Non-CSP:** `GET /api/v1/jobs/saved` → **422** without Console CSP is **not** a burn-in failure (same as Chrome `2026-06-03`).

## Firefox (desktop) — manual checklist (PENDING)

**Status:** **PENDING** — complete before window end `2026-06-05T14:18:33Z`.

**Profile:** Private Browsing; extensions disabled.

**Routes (in order):** same as Safari — `/` → `/login/candidate` → `/register/candidate` → `/dashboard` → `/dashboard/calendar` → `/demo` → `/status` → `/api/public-health` (Network).

### Pass criteria (each route)

1. **Console** — filter CSP; no unexpected violations on required hosts.
2. **Network** — `csp-report` filter; correlate any `POST /api/v1/csp-report` with Railway `csp_report violation` if present.
3. Hard refresh (disable cache).
4. Functional page load (no CSP-induced breakage).
5. Record Firefox version + evidence (no secrets).

| Route | Console clean? | Network anomalies? | PASS? |
| ----- | -------------- | ------------------ | ----- |
| `/` | pending | pending | [ ] |
| `/login/candidate` | pending | pending | [ ] |
| `/register/candidate` | pending | pending | [ ] |
| `/dashboard` | pending | pending | [ ] |
| `/dashboard/calendar` | pending | pending | [ ] |
| `/demo` | pending | pending | [ ] |
| `/status` | pending | pending | [ ] |
| `/api/public-health` | n/a (Network) | pending | [ ] |

**Non-CSP:** `/api/v1/jobs/saved` **422** without Console CSP — **not** a burn-in blocker.

## Out of scope for CSP burn-in

| Observation | CSP triage? |
| --- | --- |
| `GET /api/v1/jobs/saved` → **422** (or other 4xx/5xx **without** a CSP Console line) | **No** — API/auth/validation; **not** an S2 burn-in blocker |
| `GET /_next/image?url=https%3A%2F%2Ficons.duckduckgo.com…` / `…google.com…` / `…cdn.simpleicons.org…` → **400** / **404** / **502** with **no** CSP Console message | **No** — non-CSP app/UX (logo marquee via `next/image` + external favicon/SI CDNs); **not** burn-in failure; **does not** reset S2 clock |
| Network failure with no **Content-Security-Policy** message in Console | **No** |
| `POST /api/v1/csp-report` → **204** with matching Console `blocked-uri` | **Yes** — correlate with Railway `csp_report violation` |

## Routes (each browser) — master table

Core S2 routes (must be checked in every browser): `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`, `/api/public-health`.

| Route | Chrome (`13:29:36Z`) | Safari | Firefox | Notes |
| ----- | -------------------- | ------ | ------- | ----- |
| `/` | ✅ PASS | PENDING | PENDING | Home + logo marquee |
| `/dashboard` | ✅ PASS | PENDING | PENDING | Repeat logged-in when possible |
| `/login/candidate` | ✅ PASS | PENDING | PENDING | OAuth buttons |
| `/register/candidate` | ✅ PASS | PENDING | PENDING | GDPR consent |
| `/demo` | ✅ PASS | PENDING | PENDING | |
| `/status` | ✅ PASS | PENDING | PENDING | |
| `/dashboard/calendar` | ✅ PASS | PENDING | PENDING | Calendar shell |
| `/api/public-health` | ✅ PASS (Network) | PENDING | PENDING | No Console CSP on JSON |
| `/privacy` | not in Chrome S2 pass | optional | optional | Legal surface |
| `/terms` | not in Chrome S2 pass | optional | optional | Legal surface |

**Agent pre-check legend (historical):** HTTP 200 + `audit-csp-headers.sh` CSP-RO does **not** close Safari/Firefox rows.

## Per-route procedure

1. DevTools → **Console** — filter “Content Security Policy” / “CSP”.
2. **Network** — filter `csp-report`; expect `POST /api/v1/csp-report` → **204** only when violations occur.
3. Hard refresh (disable cache).
4. Cookie banner → **Analytics ON** once — Plausible/PostHog without unexpected CSP errors.
5. Screenshot if **blocked-uri** hits a TWIN-required host (no tokens in captures).

## Founder demo dry-run

Walk `docs/INVESTOR_DEMO_RUNBOOK.md` on the same alias:

- [ ] No broken images / fonts
- [ ] Calendar connect (OAuth redirect, not CSP-blocked)
- [ ] Stripe billing CTA (server-side redirect)
- [ ] Dashboard subpages (P6)
- [ ] YouTube on `/first-1000` if configured

## Evidence to attach

- Browser + version per row
- Console export or screenshots (no tokens/cookies)
- Railway `csp_report violation` lines matching DevTools `blocked-uri`

## Verdict integration

Pair with 72h Railway triage (`docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md`).

Until Railway 72h rollup **and** multi-browser DevTools (Safari + Firefox minimum) complete: **S2 NOT READY**, public launch **NO-GO**.

**Follow-up (non-CSP):** (1) `fix(frontend): add safe fallback for external company logos` — `SafeCompanyLogo` bypasses `/_next/image`. (2) `fix(frontend): suppress noisy external favicon failures` — `FAVICON_INITIALS_ONLY_DOMAINS` + Google-before-DuckDuckGo raster order in `brand-logo-urls.ts`; `npm run test:safe-company-logo`. **CSP unchanged.** **S2 burn-in: CONTINUE** (no clock reset). **Public launch: NO-GO** until post-deploy founder DevTools smoke on `/` (incognito, extensions off): no `/_next/image` logo spam; filter Network for `icons.duckduckgo.com` — expect no red 404 for blocklisted domains.
