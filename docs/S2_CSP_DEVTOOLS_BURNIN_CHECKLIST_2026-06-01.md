# S2 CSP multi-browser DevTools burn-in checklist — 2026-06-01

Complete on the **preview alias** (preferred) or prod after narrowed report-only deploy.
Use **incognito/private** profiles with **extensions disabled**.
CSP must remain **Report-Only** — console shows violations as warnings, pages must not break.

## Browsers

- [ ] Chrome (desktop) — **IN PROGRESS** (founder-directed 2026-06-03; see § Chrome below)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Mobile Safari (iOS) or responsive mode
- [ ] Mobile Chrome (Android) or responsive mode

**Automation note (2026-06-03):** `scripts/audit-csp-headers.sh` + `npm run test:security-headers` verify CSP-RO headers and narrowed allowlists on core routes — **not** a substitute for per-browser DevTools console/network checks below.

## Chrome (desktop) — founder pass 2026-06-03

**Alias:** `https://twin-sooty.vercel.app` · **Profile:** incognito/private, extensions **disabled** · CSP must stay **Report-Only** (warnings OK; pages must not break).

**Routes to check in Chrome (core S2, in order):**

1. `/` — home, logo marquee, cookie banner
2. `/login/candidate` — OAuth buttons
3. `/register/candidate` — GDPR consent
4. `/dashboard` — logged-out shell, then **logged-in** repeat
5. `/dashboard/calendar` — calendar UI shell (logged-in)
6. `/demo`
7. `/status`
8. `/api/public-health` — JSON via FE proxy (Network tab only; no console CSP expected on raw JSON)

**Optional dashboard-adjacent (same Chrome session):** `/dashboard` jobs panel while logged in — watch Console for CSP only.

### Out of scope for CSP burn-in (unless Console shows CSP)

| Observation | CSP triage? |
| --- | --- |
| `GET /api/v1/jobs/saved` → **422** (or other 4xx/5xx without a CSP console line) | **No** — API validation/auth/product issue; do **not** count as S2 violation |
| Failed fetch in Network tab with no **Content-Security-Policy** message in Console | **No** — triage separately from S2 |
| `POST /api/v1/csp-report` → **204** after a real violation | **Yes** — note `blocked-uri` + match Railway log |

**Chrome row completion:** fill the route table below for Chrome only when Console/Network pass is done; attach screenshots without tokens.

## Routes (each browser)

Core S2 routes (must be checked in every browser): `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`, `/api/public-health`.

| Route | Console clean? | Network anomalies? | CSP reports POSTed? | Notes |
| ----- | -------------- | ------------------ | ------------------- | ----- |
| `/` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 — DevTools pending |
| `/dashboard` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 — repeat logged-in in DevTools |
| `/login/candidate` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 |
| `/register/candidate` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 |
| `/register/candidate` (logged-in path if applicable) | | | | |
| `/waitlist` | | | | |
| `/demo` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 |
| `/status` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 |
| `/dashboard/calendar` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 — calendar UI DevTools pending |
| `/api/public-health` | n/a (curl) | n/a | n/a | **Header audit PASS** 2026-06-03 — JSON `status=ok` 2026-06-03 |
| `/first-1000` | | | | YouTube embed if env set |
| `/pricing` | | | | |
| `/for-candidates` | | | | |
| `/for-companies` | | | | |
| `/recruiter/inbox` | | | | If accessible |

## Per-route procedure

1. Open DevTools → **Console** — filter “Content Security Policy” / “CSP”.
2. **Network** tab — filter `csp-report`; expect occasional `POST /api/v1/csp-report` → **204** during violations.
3. Hard refresh (disable cache).
4. Accept cookie banner → **Analytics ON** on one pass — confirm Plausible/PostHog load without unexpected CSP console errors.
5. Screenshot console if any **blocked-uri** references a TWIN-required host (attach to evidence pack).

## Founder demo dry-run

Walk `docs/INVESTOR_DEMO_RUNBOOK.md` end-to-end on the same alias:

- [ ] No broken images (logo marquee, nature backgrounds)
- [ ] No missing fonts (Geist)
- [ ] Calendar connect flow loads (OAuth redirect, not CSP-blocked)
- [ ] Stripe billing CTA redirects (server-side; no embedded Stripe.js)
- [ ] Dashboard subpages render (P6 routes)
- [ ] YouTube embed on `/first-1000` if configured

Record: founder PASS / FAIL + date in burn-in daily log.

## Evidence to attach

- Browser + version per row
- Console export or screenshots (no tokens/cookies in captures)
- Any `csp_report violation` log lines from Railway matching DevTools blocked-uri

## Verdict integration

This checklist alone does **not** close S2. Pair with 72h log triage (`docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md`).

Until both complete: **S2 NOT READY**, public launch **NO-GO**.
