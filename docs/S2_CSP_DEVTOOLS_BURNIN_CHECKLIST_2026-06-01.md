# S2 CSP multi-browser DevTools burn-in checklist — 2026-06-01

Complete on the **preview alias** (preferred) or prod after narrowed report-only deploy.
Use **incognito/private** profiles with **extensions disabled**.
CSP must remain **Report-Only** — console shows violations as warnings, pages must not break.

**Prod alias:** `https://twin-sooty.vercel.app`

## Browsers

- [x] Chrome (desktop) — **PASS** (founder DevTools `2026-06-03T13:29:36Z`; routes below)
- [x] Safari (desktop) — **PASS** (founder DevTools `2026-06-04T08:47:35Z`; routes below)
- [x] Firefox (desktop) — **PASS** (founder DevTools `2026-06-04T08:47:35Z`; routes below)
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
| Red Console `GET /_next/image?url=…` for external logo hosts (`icons.duckduckgo.com`, `www.google.com/s2/favicons`, `cdn.simpleicons.org`, …) → **400** / **404** / **502**; **no** Console line containing “Content Security Policy”, “Refused to connect/load”, “violates the following directive”, or `blocked-uri` | **No** — Next.js image optimizer / upstream favicon CDN failures on marketing logo marquee (`frontend/src/components/marketing/company-logo-marquee.tsx`); **not** an S2 reset or CSP failure; **fix chain:** `SafeCompanyLogo` (no `/_next/image`) → `FAVICON_INITIALS_ONLY_DOMAINS` → `MARQUEE_STABLE_SI_SLUGS` (SI + verified `extraUrls` only; **no** Google/gstatic or DuckDuckGo raster) — **post-deploy founder browser smoke required** |
| Red Console direct `GET https://icons.duckduckgo.com/ip3/*.ico` or `https://t*.gstatic.com/faviconV2` → **404** (no CSP line) | **No** — non-CSP favicon noise; **fix chain:** SI/`extraUrls` only (raster helpers deleted) + decorative marquee plates (`role="img"`, **no** outbound `href` → avoids Chrome `t*.gstatic.com/faviconV2` prefetch on ~88×2 links) — **post-deploy smoke on `/`** |

**Chrome CSP verdict (unchanged):** founder pass at `2026-06-03T13:29:36Z` (`ece6588`) — **no CSP violations** on core routes; pre-fix image-proxy Console noise was **orthogonal** to CSP burn-in PASS. **S2 burn-in: CONTINUE** (no clock reset).

## Chrome (desktop) — founder logo smoke post PR #24 (2026-06-04)

**Checkpoint UTC:** `2026-06-04T08:39:36Z`

**Context:** PR **#24** merged; logo cleanup chain deployed on `https://twin-sooty.vercel.app` (`18e6ce4` — `SafeCompanyLogo`, SI/`extraUrls` only, raster favicon helpers removed). **CSP unchanged** (report-only HOLD).

**Profile:** Chrome **Incognito**, extensions **disabled**.

**Route:** `/` (homepage + company logo marquee).

| Check | Result |
| ----- | ------ |
| Homepage renders | ✅ **OK** |
| Red `GET /_next/image?url=…` (logo hosts) | ✅ **None** |
| Red `GET https://icons.duckduckgo.com/ip3/…` | ✅ **None** |
| Red `GET https://www.google.com/s2/favicons…` | ✅ **None** |
| Red `GET https://t*.gstatic.com/faviconV2…` | ✅ **None** |
| Fallback initials (blocklisted / failed remote) | ✅ **Working** |
| Console CSP violations | ✅ **None** |
| Classification | **Non-CSP UX fixed** — does **not** reset S2 clock |
| Decision | **CONTINUE** |

**S2 burn-in:** **CONTINUE** (no clock reset). **S2 PASS:** **NO**. **Public launch:** **NO-GO** until `2026-06-05T14:18:33Z` 72h rollup + founder sign-off.

**Follow-up (founder Chrome `2026-06-04`):** No red favicon/`/_next/image` Console errors, but many marquee plates showed **empty white boxes** (initials hidden behind `opacity-0` loading images). **Fixed** in repo — layered visible initials until logo loads; **post-deploy smoke required**.

**Next:** Post-deploy `/` logo marquee smoke (visible initials on blocklisted/failed marks; no empty plates).

## Safari (desktop) — founder PASS 2026-06-04

**Checkpoint UTC:** `2026-06-04T08:47:35Z`

**Status:** **PASS** — core S2 routes; logo marquee spot-check on `/`.

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
| `/` | ✅ clean | none | [x] |
| `/login/candidate` | ✅ clean | none | [x] |
| `/register/candidate` | ✅ clean | none | [x] |
| `/dashboard` | ✅ clean | none | [x] |
| `/dashboard/calendar` | ✅ clean | none | [x] |
| `/demo` | ✅ clean | none | [x] |
| `/status` | ✅ clean | none | [x] |
| `/api/public-health` | n/a (Network) | none | [x] |

**Logo smoke (`/`):** No CSP violations; no red favicon/`/_next/image` errors; initials OK.

**Decision:** **CONTINUE** · **S2 PASS:** **NO** · **Public launch:** **NO-GO**

**Non-CSP:** `GET /api/v1/jobs/saved` → **422** without Console CSP is **not** a burn-in failure (same as Chrome `2026-06-03`).

## Firefox (desktop) — founder PASS 2026-06-04

**Checkpoint UTC:** `2026-06-04T08:47:35Z`

**Status:** **PASS** — core S2 routes; logo marquee spot-check on `/`.

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
| `/` | ✅ clean | none | [x] |
| `/login/candidate` | ✅ clean | none | [x] |
| `/register/candidate` | ✅ clean | none | [x] |
| `/dashboard` | ✅ clean | none | [x] |
| `/dashboard/calendar` | ✅ clean | none | [x] |
| `/demo` | ✅ clean | none | [x] |
| `/status` | ✅ clean | none | [x] |
| `/api/public-health` | n/a (Network) | none | [x] |

**Logo smoke (`/`):** No CSP violations; no red favicon/`/_next/image` errors; initials OK.

**Decision:** **CONTINUE** · **S2 PASS:** **NO** · **Public launch:** **NO-GO**

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

| Route | Chrome (`13:29:36Z`) | Safari (`08:47:35Z`) | Firefox (`08:47:35Z`) | Notes |
| ----- | -------------------- | -------------------- | ------------------- | ----- |
| `/` | ✅ PASS | ✅ PASS | ✅ PASS | Home + logo marquee |
| `/dashboard` | ✅ PASS | ✅ PASS | ✅ PASS | Repeat logged-in when possible |
| `/login/candidate` | ✅ PASS | ✅ PASS | ✅ PASS | OAuth buttons |
| `/register/candidate` | ✅ PASS | ✅ PASS | ✅ PASS | GDPR consent |
| `/demo` | ✅ PASS | ✅ PASS | ✅ PASS | |
| `/status` | ✅ PASS | ✅ PASS | ✅ PASS | |
| `/dashboard/calendar` | ✅ PASS | ✅ PASS | ✅ PASS | Calendar shell |
| `/api/public-health` | ✅ PASS (Network) | ✅ PASS (Network) | ✅ PASS (Network) | No Console CSP on JSON |
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

**Follow-up (non-CSP):** Logo fix chain shipped (PR **#24**, `18e6ce4`). Founder post-deploy smoke **`2026-06-04T08:39:36Z`** on `/` — Console clean; Chrome UX gap: **empty white logo plates** → **initials layer fix** (repo, post-deploy smoke). Safari + Firefox DevTools **`2026-06-04T08:47:35Z`** — **PASS** (core routes + `/` logo; no CSP violations). **CSP unchanged.** **S2 burn-in: CONTINUE** (no clock reset). **S2 PASS: NO.** **Public launch: NO-GO** until `2026-06-05T14:18:33Z` 72h rollup + founder enforce sign-off. **Remaining:** mobile browsers (optional), post-deploy initials smoke.
