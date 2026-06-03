# S2 CSP multi-browser DevTools burn-in checklist — 2026-06-01

Complete on the **preview alias** (preferred) or prod after narrowed report-only deploy.
Use **incognito/private** profiles with **extensions disabled**.
CSP must remain **Report-Only** — console shows violations as warnings, pages must not break.

**Prod alias:** `https://twin-sooty.vercel.app`

## Browsers

- [ ] Chrome (desktop) — **IN PROGRESS** (founder manual Console pass; agent pre-checks **partial PASS** 2026-06-03)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Mobile Safari (iOS) or responsive mode
- [ ] Mobile Chrome (Android) or responsive mode

**Automation note:** `scripts/audit-csp-headers.sh` + `npm run test:security-headers` verify CSP-RO headers and narrowed allowlists — **not** a substitute for per-browser DevTools console/network checks.

## Chrome (desktop) — founder pass 2026-06-03

**Profile:** incognito/private, extensions **disabled**.

**Routes (in order):** `/` → `/login/candidate` → `/register/candidate` → `/dashboard` (logged-out, then logged-in) → `/dashboard/calendar` → `/demo` → `/status` → `/api/public-health` (Network only).

### Out of scope for CSP burn-in

| Observation | CSP triage? |
| --- | --- |
| `GET /api/v1/jobs/saved` → **422** (or other 4xx/5xx **without** a CSP Console line) | **No** — API/auth/validation; **not** an S2 burn-in blocker |
| Network failure with no **Content-Security-Policy** message in Console | **No** |
| `POST /api/v1/csp-report` → **204** with matching Console `blocked-uri` | **Yes** — correlate with Railway `csp_report violation` |

## Routes (each browser)

Core S2 routes (must be checked in every browser): `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`, `/api/public-health`.

| Route | Agent pre-check (2026-06-03) | Console clean? | Network anomalies? | CSP reports POSTed? | Notes |
| ----- | ---------------------------- | -------------- | ------------------ | ------------------- | ----- |
| `/` | **partial PASS** — HTTP 200, CSP-RO | pending Chrome | pending | pending | Home + logo marquee |
| `/dashboard` | **partial PASS** — HTTP 200, CSP-RO | pending | pending | pending | Repeat **logged-in** in Chrome |
| `/login/candidate` | **partial PASS** — HTTP 200, CSP-RO | pending | pending | pending | OAuth buttons |
| `/register/candidate` | **partial PASS** — HTTP 200, CSP-RO | pending | pending | pending | GDPR consent |
| `/register/candidate` (logged-in) | n/a | pending | pending | pending | If applicable |
| `/waitlist` | not audited | pending | pending | pending | |
| `/demo` | **partial PASS** — HTTP 200, CSP-RO | pending | pending | pending | |
| `/status` | **partial PASS** — HTTP 200, CSP-RO | pending | pending | pending | |
| `/dashboard/calendar` | **partial PASS** — HTTP 200, CSP-RO | pending | pending | pending | Calendar shell; logged-in DevTools |
| `/api/public-health` | **partial PASS** — HTTP 200, JSON `ok` | n/a | n/a | n/a | No Console CSP expected on JSON |
| `/privacy` | **partial PASS** — HTTP 200 | pending | pending | pending | Legal surface |
| `/terms` | **partial PASS** — HTTP 200 | pending | pending | pending | Legal surface |
| `/first-1000` | not audited | pending | pending | pending | YouTube embed if env set |
| `/pricing` | not audited | pending | pending | pending | |
| `/for-candidates` | not audited | pending | pending | pending | |
| `/for-companies` | not audited | pending | pending | pending | |
| `/recruiter/inbox` | not audited | pending | pending | pending | If accessible |

**Agent pre-check legend:** HTTP 200 + `audit-csp-headers.sh` CSP-RO on route (or health JSON OK). **Does not** close Chrome row — founder must still complete Console/Network columns.

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

Until both complete: **S2 NOT READY**, public launch **NO-GO**.
