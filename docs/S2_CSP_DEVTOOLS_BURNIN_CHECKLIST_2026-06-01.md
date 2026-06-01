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

## Routes (each browser)

| Route | Console clean? | Network anomalies? | CSP reports POSTed? | Notes |
| ----- | -------------- | ------------------ | ------------------- | ----- |
| `/` | | | | Home + logo marquee |
| `/dashboard` | | | | Logged-out OK; repeat logged-in |
| `/login/candidate` | | | | OAuth buttons |
| `/register/candidate` | | | | GDPR consent |
| `/register/candidate` (logged-in path if applicable) | | | | |
| `/waitlist` | | | | |
| `/demo` | | | | |
| `/status` | | | | |
| `/dashboard/calendar` | | | | Calendar UI shell |
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
