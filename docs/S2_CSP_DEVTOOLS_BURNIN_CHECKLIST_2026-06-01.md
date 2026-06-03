# S2 CSP multi-browser DevTools burn-in checklist — 2026-06-01

Complete on the **preview alias** (preferred) or prod after narrowed report-only deploy.
Use **incognito/private** profiles with **extensions disabled**.
CSP must remain **Report-Only** — console shows violations as warnings, pages must not break.

## Browsers

- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Mobile Safari (iOS) or responsive mode
- [ ] Mobile Chrome (Android) or responsive mode

**Automation note (2026-06-03):** `scripts/audit-csp-headers.sh` + `npm run test:security-headers` verify CSP-RO headers and narrowed allowlists on core routes — **not** a substitute for per-browser DevTools console/network checks below.

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
