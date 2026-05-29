# P1 Security Next Steps — 2026-05-26

TASK 7 of the overnight engineering run. Frames the **Phase 1
security backlog** for TWIN: what's already shipped, what we
deliberately ship as "report-only" today, and the safest order
in which to move from the current state to "investor-grade
controlled pilot" without breaking the candidate dashboard,
auto-apply, or placement pipeline.

This doc is **documentation only**. No security-sensitive code,
config, or env change is shipped by this commit. Every item
below has an owner-and-window column so the next maintenance
session has a clean queue.

## TL;DR — current security posture (canonical alias)

Already shipped (`https://twin-sooty.vercel.app`):

- HTTPS-only with **HSTS preload**
  (`max-age=63072000; includeSubDomains; preload`).
- `X-Frame-Options: DENY` — anti-clickjacking, paired with CSP
  `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(),
  geolocation=(), interest-cohort=()` — no FLoC, no
  unattended sensor access.
- `Content-Security-Policy` (`report-only` — see "CSP
  enforcement", below).
- Backend FastAPI: `slowapi` rate limiter on auth + mutation
  endpoints, request-id middleware, structured logs without
  secrets.
- Celery: broker URL pulled from env, no hard-coded creds,
  `celery_task_always_eager=False` enforced in prod via
  `scripts/verify-prod-health.sh`.
- Auto-apply pipeline: every send is `human_acknowledged: true`
  + `Idempotency-Key`, no live LinkedIn scrape
  (`SCRAPE_RESPECT_ROBOT=1`).

Open gaps to close before "controlled pilot" and "investor":

1. **CSP enforcement (turn off `report-only`).**
2. **Move auth token off `localStorage` to httpOnly,
   `Secure`, `SameSite=Lax` cookie.**
3. **Add CSP report endpoint + ingest reports.**
4. **Rate-limit the candidate-side mutation endpoints from the
   edge (Vercel routing middleware) on top of the existing
   backend `slowapi`.**
5. **Audit-log every placement state transition + every
   auto-apply send to an append-only stream
   (docs/PLACEMENT_VERIFICATION.md already specifies the
   shape; verify it is enforced).**
6. **Stripe webhook signature verification on the live
   `/api/v1/stripe/webhook` route — confirm
   `stripe.Webhook.construct_event(...)` is the only ingestion
   path.**
7. **OAuth callback redirect-URI allow-list audit.**
8. **Periodic dependency scan (`npm audit`,
   `pip-audit`).**
9. **Cookie-consent → analytics gating** — confirm no analytics
   pixel fires before consent.
10. **Bot / abuse rate-limit on `/api/v1/auth/register` and
    `/api/v1/auth/login`** — `slowapi` exists; verify rules.

## Priority queue

| # | Item                                                            | Risk if skipped                             | Window         | Owner          |
| - | --------------------------------------------------------------- | ------------------------------------------- | -------------- | -------------- |
| 1 | CSP enforcement (drop `-Report-Only`)                           | XSS surface stays full-trust                | next sprint    | FE             |
| 2 | httpOnly cookie auth (replace localStorage)                     | XSS = token theft                           | next sprint    | FE + BE        |
| 3 | CSP report ingest                                               | Blind XSS attempts                          | with #1        | BE             |
| 4 | Edge rate-limit on candidate mutations                          | Abuse / DOS                                 | next sprint    | FE (middleware)|
| 5 | Placement event audit-log assertion                             | Disputes have no provable history           | next sprint    | BE             |
| 6 | Stripe webhook signature audit                                  | Forged payment events                       | this week      | BE             |
| 7 | OAuth redirect-URI allow-list audit                             | Open-redirect → phishing                    | this week      | BE             |
| 8 | `npm audit` + `pip-audit` baseline                              | Stale CVE                                   | this week      | CI             |
| 9 | Cookie-consent → analytics gating audit                         | GDPR fines                                  | this week      | FE             |
| 10| Auth rate-limit rule review                                     | Credential stuffing                         | this week      | BE             |

## Detail per item

### 1. CSP enforcement (drop `-Report-Only`)

**Today.** The canonical alias serves
`Content-Security-Policy-Report-Only:` with the directive
set:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data: https:;
connect-src 'self' https:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

**Risk if skipped.** `report-only` means a browser does
**not** block a CSP violation — it logs it. Real XSS would
not be blocked at the browser layer.

**Why we have not enforced yet.**
`'unsafe-inline'` + `'unsafe-eval'` are still required by
Next.js 16 production builds (next-router-prefetch chunks,
Turbopack inline thunks). Switching to a nonce-based or
hash-based script policy needs a Next 16 spike (see
`docs/AGENTS.md` "Next 16 has breaking changes").

**Recommended order.**

a. Land CSP report endpoint (#3) on a temporary path
   (`/api/v1/csp-report`) and confirm reports show up in
   logs.
b. Spike the Next 16 nonce-on-script-tag flow on a feature
   flag (no user-facing change).
c. Replace `'unsafe-inline'` + `'unsafe-eval'` with the
   nonce + a strict-dynamic policy on a preview deployment.
d. Once preview burns clean for 72h, flip
   `Content-Security-Policy-Report-Only` → `Content-Security-
   Policy` (enforcement).
e. Keep `default-src 'self'`, `frame-ancestors 'none'`,
   `base-uri 'self'`, `form-action 'self'` exactly as today.

### 2. httpOnly cookie auth (replace localStorage)

**Today.** `frontend/src/lib/auth.ts` stores the JWT in
`window.localStorage` with a `sessionStorage` fallback. Every
authenticated `apiFetch(...)` call reads the token via
`getToken()` and attaches it as `Authorization: Bearer …`.

**Risk if skipped.** Any successful XSS injection (which CSP
report-only does **not** block today — see #1) can read the
token via `localStorage.getItem("twin_access_token")` and
exfiltrate the candidate's session.

**Migration plan (zero-downtime).**

a. Backend: add a `Set-Cookie` on the existing
   `POST /api/v1/auth/login` and OAuth-callback flows. Set
   `HttpOnly; Secure; SameSite=Lax; Path=/; Domain=.twin-sooty.vercel.app`
   (or whatever the final canonical domain is). Keep the
   JSON response body (`{access_token, ...}`) unchanged so
   existing FE keeps working during the cutover.
b. Frontend: keep `getToken()` for one release; add a
   `credentials: "include"` opt-in to `apiFetch` so the new
   cookie is sent on `fetch`.
c. Backend: add an `Authorization` header **OR** cookie
   acceptance path on every protected route (already trivial
   if FastAPI dependencies are factored that way).
d. Flip the default in `apiFetch`: cookie-first, header as
   fallback.
e. Remove `setToken` / `getToken` / `clearToken` and the
   `localStorage` write after one full release cycle without
   error reports.

**Hard ban for this overnight run.** Do NOT touch
`auth.ts` in an unattended agent loop; the cutover is a
multi-step, observable rollout.

### 3. CSP report ingest

Add `POST /api/v1/csp-report` (FastAPI, `application/csp-
report` content type) that logs the report to the existing
structured-log stream. The CSP header gains
`report-uri /api/v1/csp-report` and (modern browsers)
`report-to <group>`. Cheap, blast-radius-tiny.

### 4. Edge rate-limit on candidate mutations

Today: `slowapi` runs on the backend FastAPI process. Single
worker, single pod, modest rate budget. An attacker can
saturate the **Vercel proxy** with `/api/v1/applications/auto-
apply` POSTs and exhaust the worker.

Vercel Routing Middleware (Edge runtime) lets us add a
**per-IP + per-user** sliding window on candidate-side
mutations **before** the request hits Railway. Recommended
keys:

- `POST /api/v1/applications/*`
- `POST /api/v1/candidates/me/match-feedback`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/password-reset`

Use Vercel's `runtime-cache` (Vercel KV-style) for the token
bucket — see `Vercel runtime-cache` skill for the exact
pattern (`@vercel/functions` + `getRequestContext()`).

### 5. Placement event audit-log assertion

`docs/PLACEMENT_VERIFICATION.md` already specifies an
append-only event stream
(`placement_events`) for every state transition (`declare →
verify_start → employer_attest → dispute`). Verify in code
that:

a. No DB write to `applications.placement_status` happens
   without a matching `placement_events` insert in the same
   transaction.
b. The events table is `INSERT`-only at the application layer
   (no `UPDATE`, no `DELETE`) — enforced via SQLAlchemy event
   listener, optionally also via Postgres `REVOKE UPDATE,
   DELETE ON placement_events`.
c. Dispute filing always carries a candidate-supplied
   `dispute_reason` text + optional `evidence_url[]`.

Test file already exists: `backend/tests/test_placement_
verification.py`. Add a property-style assertion that every
state transition writes exactly one event.

### 6. Stripe webhook signature audit

Confirm the **only** ingestion path on
`/api/v1/stripe/webhook` is
`stripe.Webhook.construct_event(body, sig_header,
endpoint_secret)` — i.e. no fallback that accepts
unsigned requests. Add a unit test that posts an unsigned
payload and asserts `401`. Stripe rotates webhook secrets;
log the **last successful event timestamp** so we notice if
the webhook silently stops.

### 7. OAuth redirect-URI allow-list audit

Every provider (Google, Microsoft, Apple, GitHub, LinkedIn)
takes a `redirect_uri` param at the start of the flow. Today
the backend constructs that from `request.url_for(...)` or
the configured base URL. **Risk:** open redirect (we forward
the user to `attacker.com/?token=...` after success).

Audit:

- `app/api/v1/web_oauth.py` (and equivalent provider modules)
  must validate `redirect_uri` against an explicit allow-list,
  not just `startswith(BASE_URL)`.
- Same for `password-reset` confirm links — never echo a
  user-supplied `next=` without allow-list.

### 8. `npm audit` + `pip-audit` baseline

Add two CI jobs:

- `npm audit --omit=dev --audit-level=high` in `frontend/`.
- `pip-audit -r backend/requirements.txt --ignore-vuln <id>`
  with a curated ignore list (committed alongside).

Run nightly via `schedule:` on a separate workflow so a single
high-severity CVE shows up the next morning.

### 9. Cookie-consent → analytics gating audit

Existing cookie-consent banner stores the consent decision.
Audit:

- No `<script>` tag fires `gtag` / Plausible / PostHog before
  `consent === "granted"`.
- The default state on first load is **denied** (Polish
  / German privacy norm; UK + US can opt-in later if needed).
- Server-side analytics (`/api/v1/analytics/*`) honour the
  same flag.

Spec test: `test_cookie_consent_api.py` already exists.
Extend it to assert the default decision is "denied".

### 10. Bot / abuse rate-limit on auth endpoints

Review the existing `slowapi` rules:

- `/api/v1/auth/login` — proposed: 5/min/IP, 20/hour/email.
- `/api/v1/auth/register` — proposed: 3/min/IP, 10/hour/IP.
- `/api/v1/auth/password-reset/request` — proposed:
  3/min/IP, 5/hour/email (silently 200 on every request to
  avoid email-enumeration).

Combine with #4 (edge rate-limit) for defence in depth.

## Hard bans honoured (this run)

- No code change to `auth.ts`, CSP header,
  middleware, OAuth callbacks, Stripe webhook, or rate-limit
  config.
- No env / secret change.
- No PAT scope change.
- No `.env` / token / JWT contents in this doc.
- No public statement of unfixed vulnerability (this is an
  internal doc; do not link it from marketing copy).

## Related

- `docs/COOKIE_CONSENT.md`
- `docs/AUTH_PASSWORD.md`
- `docs/PLACEMENT_VERIFICATION.md`
- `docs/I18N.md`
- `docs/CTO_PRODUCT_TECH_AUDIT_2026-05-26.md`
- `docs/CTO_AUDIT_P0_FOLLOWUP_2026-05-26.md`
- `docs/P1_OBSERVABILITY_PLAN_2026-05-26.md` (sibling task in
  this overnight run — covers logging / metrics / tracing
  that pairs with the items above)
