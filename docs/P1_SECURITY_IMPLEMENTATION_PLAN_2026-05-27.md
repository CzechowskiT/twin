# P1 Security Implementation Plan — 2026-05-27

TASK 4 of the 2026-05-27 morning release-hygiene run.
Turns the backlog in `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md`
into a **sprint-ready, ticketable checklist** for the next
implementation window. Every item below has:

- explicit **scope** (what changes; what doesn't),
- explicit **non-scope** (what is deferred so the slice stays
  shippable),
- an **owner discipline** (FE / BE / CI),
- a **size estimate** (S / M / L),
- a **risk gate** (what blocks landing it on prod),
- a **verify** step (how we prove the fix works), and
- a **rollback** plan.

This doc is **plan only — no implementation in this run**.
None of the security primitives touched below are altered by
this commit; the production CSP stays `report-only`, auth still
uses `localStorage`, no edge rate-limit is wired in, etc.

## Scope policy

Items are sized to fit a **single PR each** so a reviewer can
hold the change in their head. No item below requires a DB
migration, a Railway redeploy of the API, or an env-var
rotation **as a side-effect** — anywhere a primary effect needs
one of those (e.g. cookie auth setting `Set-Cookie` for the
first time), it is called out under "Risk gate".

Hard bans for the implementation work itself:

- No `--no-verify`, no force-push.
- No PAT scope change inside the agent loop (founder rotates,
  agent waits — see TASK 2).
- No prod env value written from an agent — `.env.example`
  updates only; secret rotations are manual founder steps.
- No real candidate-side mutation fired during verify (no real
  apply / auto-apply / scrape).

## Checklist (priority order)

| # | Item                                                   | Disc.   | Size | Owner gate                | PR # / Notes                            |
| - | ------------------------------------------------------ | ------- | ---- | ------------------------- | --------------------------------------- |
| 1 | CSP enforce (drop `-Report-Only`)                      | FE + BE | M    | Next 16 nonce spike first | Slice 1 (spike) → Slice 2 (enforce)     |
| 2 | httpOnly auth cookie + CSRF token                      | FE + BE | L    | Cookie-domain decision    | Cut over in 4 steps; see § "Cookie auth"|
| 3 | Sentry (frontend + backend) with PII scrubber          | FE + BE | M    | Sentry project created    | Project step = founder; PR = agent      |
| 4 | `npm audit` + `pip-audit` baseline                     | CI      | S    | None                      | Two new CI jobs + ignore-list           |
| 5 | Edge rate-limit on candidate mutations (Vercel KV)     | FE      | M    | Vercel KV provisioning    | KV step = founder; PR = agent           |
| 6 | Stripe webhook signature audit + unit test             | BE      | S    | None                      | Read-only audit + 1 unit test           |
| 7 | Cookie-consent → analytics gating audit                | FE      | S    | None                      | Read-only audit + 1 frontend test       |

Each section below expands one row from the table.

## 1. CSP enforce (drop `-Report-Only`)

**Scope.** Replace the response header name
`Content-Security-Policy-Report-Only` with `Content-Security-
Policy` on **all** `frontend/` responses (router proxy +
static asset path), while **keeping the directive set
identical** to today. Add a `report-uri /api/v1/csp-report`
(and `report-to <group>`) directive so violations still flow
to the backend.

**Non-scope.** No directive change. We do **not** remove
`'unsafe-inline'` / `'unsafe-eval'` from `script-src` in the
same PR — that is a separate Next 16 nonce-spike slice (see
"Pre-req spike" below).

**Pre-req spike (separate PR).** Land a nonce-on-script-tag
flow on a feature flag (no user-facing change). Targets the
Next 16 nonce documentation in
`frontend/node_modules/next/dist/docs/`. Burn-in on the
preview deployment for 72h before flipping enforcement.

**Owner gate.** None — code-only change.

**Risk gate.** Browser console **must** be clean of CSP
violation reports on `/`, `/dashboard`, `/login/candidate`,
`/register/candidate`, `/waitlist`, `/demo`, `/status` for at
least 72h on the preview alias
(`twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app`)
**before** flipping the header name on prod.

**Verify.**

```
$ curl -sI https://twin-sooty.vercel.app/ | grep -i 'content-security-policy:'
content-security-policy: default-src 'self'; …
$ curl -X POST -d '{"csp-report":…}' \
       -H 'Content-Type: application/csp-report' \
       https://twin-sooty.vercel.app/api/v1/csp-report
{"received":true}
```

**Rollback.** Revert the one-character header-name change
(`-Report-Only` back on). No data side-effect.

**Files (expected).**

- `frontend/src/middleware.ts` (header name; if proxy sets it).
- `backend/app/main.py` or `backend/app/api/v1/security.py`
  (the `/api/v1/csp-report` endpoint).
- 1 unit test for the report endpoint shape.

## 2. httpOnly auth cookie + CSRF token

**Scope.** Move the JWT from `localStorage` (current shape in
`frontend/src/lib/auth.ts`) to an httpOnly, `Secure`,
`SameSite=Lax`, `Path=/`, domain-bound cookie set by the
backend on every successful login / OAuth callback /
refresh. Add a paired **double-submit CSRF token** for any
mutation endpoint (a non-httpOnly `csrf_token` cookie + an
`X-CSRF-Token` header, validated server-side).

**Non-scope.** No SSO change. No password-hash change. No
"refresh-token rotation" or sliding-session change. No OAuth
provider change. Only the **session transport** moves.

**Migration shape (4 PRs, in order — DO NOT collapse).**

1. **Backend dual-write** — `Set-Cookie: twin_session=...
   HttpOnly; Secure; SameSite=Lax`, **and** keep the JSON
   response body `{access_token, ...}` unchanged. Frontend
   keeps reading from JSON. Risk: 0 (FE behaviour unchanged).
2. **Backend cookie-accept** — every `Depends(get_current_user)`
   accepts the cookie **or** the `Authorization` header. Risk:
   0 (header path still works).
3. **Frontend cookie-first** — `apiFetch` uses
   `credentials: "include"`, drops the `Authorization` header
   when a cookie is set. CSRF header attached on mutations.
   Risk: M (any logout/login bug shows up here).
4. **Cleanup** — remove `setToken` / `getToken` / `clearToken`
   from `frontend/src/lib/auth.ts`; remove `localStorage`
   write. Risk: 0 if (3) burned for one release.

**Owner gate.** **Founder must confirm the cookie domain**
(`twin-sooty.vercel.app` today; will change if a custom
domain ships in P2). The cookie is **not** portable across
domains; landing it on the wrong domain logs everyone out the
next time the canonical alias moves.

**Risk gate.**

- Login + logout + OAuth callback must succeed on Chrome,
  Safari, Firefox, mobile-Safari iOS, mobile-Chrome Android
  (manual check, no auto e2e — Phase 1 hard ban on auto-login
  in CI).
- The `apiFetch` cookie path must be tested against a
  candidate session that **already has a JWT in
  localStorage** to prove migration works (no flush of
  existing sessions).
- The 4-PR migration is **gated** by a single release passing
  cleanly between PRs 1+2 (server tolerates both) and PR 3
  (client switches).

**Verify.** Browser DevTools → Application → Cookies →
`twin_session` row shows `HttpOnly ✓ Secure ✓ SameSite=Lax`.
`localStorage` no longer contains `twin_access_token`. A
manual `fetch('/api/v1/applications/me', {credentials:
'omit'})` returns `401` (proves cookie is required); same with
`credentials: 'include'` returns `200`.

**Rollback.** Revert PR 3 first (FE goes back to header). If
that's not enough, revert PR 1+2 too. No data change in the
cookie cutover, so revert is mechanical.

**Files (expected).** `frontend/src/lib/auth.ts`,
`frontend/src/lib/apiFetch.ts` (or wherever `apiFetch` lives),
`backend/app/api/v1/auth.py` (or equivalent),
`backend/app/dependencies.py` (or `get_current_user` site).

## 3. Sentry (FE + BE) with PII scrubber

**Scope.** Wire Sentry on both the Next.js frontend and the
FastAPI backend. Ship a **PII scrubber** (`beforeSend`) that
strips: candidate email, phone, full name, JWT, OAuth tokens,
session cookies, application body payloads, scraped job-board
URLs that contain candidate-identifying query params.

**Non-scope.** No alerting rules wired in this slice (Sentry's
default rules stay). No source-map upload tweak (Next.js
Sentry plugin auto-uploads on build; verify, don't redesign).

**Owner gate.** **Founder creates the Sentry project**
(twin-frontend + twin-backend) and pastes the DSN values into
`vercel env` + Railway. Agent waits.

**Risk gate.** No PII in the first 100 events. Pull
the first day's events the morning after merge and grep for
candidate-identifying fields. If anything leaks → revert.

**Verify.** Cause a synthetic error in a preview deploy
(`throw new Error("twin-prod-sentry-smoke")` behind a debug
flag), confirm the event arrives in Sentry with **no** email,
no name, no JWT in the breadcrumbs or extra context.

**Rollback.** Remove the SDK init call (FE: `instrumentation-
client.ts`; BE: `app/main.py`). Sentry stops receiving events.

**Files (expected).**
`frontend/instrumentation.ts`,
`frontend/instrumentation-client.ts`,
`frontend/next.config.ts` (Sentry plugin),
`backend/app/sentry.py`, `backend/app/main.py`.

## 4. `npm audit` + `pip-audit` baseline

**Scope.** Two new CI jobs that fail the build on `high` /
`critical` CVEs only:

- `npm audit --omit=dev --audit-level=high` in `frontend/`.
- `pip-audit -r backend/requirements.txt --strict --ignore-vuln <id>`
  with a committed ignore-list (`backend/.pip-audit-ignore`).

The audit jobs **do not run on every PR** — they run on
`schedule: cron("0 6 * * *")` and on push to
`cursor/phase1-monorepo-scaffold`. Keeps PR latency unchanged.

**Non-scope.** No actual dependency upgrade in the same PR.
The PR just lights up CI; the queue of "found CVEs" becomes a
follow-up.

**Owner gate.** None.

**Risk gate.** Ignore-list curated by a human before flipping
to "fail on high" (otherwise the first nightly run will block
all pushes for known-acceptable CVEs).

**Verify.** Push the new workflow file → first run completes,
either green (no high CVEs) or red with a clean list of
vulnerable packages.

**Rollback.** Delete the audit workflow file.

**Files (expected).** `.github/workflows/dep-audit.yml`,
`backend/.pip-audit-ignore`.

## 5. Edge rate-limit on candidate mutations

**Scope.** Vercel Routing Middleware (Edge runtime) with a
sliding-window token bucket backed by Vercel KV (Marketplace).
Keys:

- `POST /api/v1/applications/*` — 10/min/user, 60/hour/user.
- `POST /api/v1/candidates/me/match-feedback` — 30/min/user.
- `POST /api/v1/auth/register` — 3/min/IP, 10/hour/IP.
- `POST /api/v1/auth/login` — 5/min/IP, 20/hour/email.
- `POST /api/v1/auth/password-reset` — 3/min/IP,
  5/hour/email; respond `200` on every request to avoid email
  enumeration (only delay the actual email send).

**Non-scope.** No change to the existing `slowapi`
backend-side rate-limit (defence in depth — both run).

**Owner gate.** **Founder provisions Vercel KV** (Vercel
Marketplace → KV). One-time. Agent waits.

**Risk gate.**

- Middleware must not run on `GET` paths or static assets
  (don't degrade hot reads).
- Wide-open egress IPs from corporate firewalls — pair with a
  per-`user_id` key when the user is authenticated; per-IP
  only when anonymous.
- Bypass list for the founder's IP during demos (env var,
  not hard-coded).

**Verify.**

```
$ for i in $(seq 1 12); do
    curl -X POST -s -o /dev/null -w "%{http_code} " \
      https://twin-sooty.vercel.app/api/v1/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"smoke@example.com","password":"x"}'
  done
401 401 401 401 401 429 429 429 429 429 429 429
```

Real login attempts return `401` until the bucket fills, then
`429`. The endpoint never opens — `401`/`429` only, no `200`
with a wrong password.

**Rollback.** Disable the middleware (move the file out of
`frontend/src/middleware.ts` or guard with a `process.env.
RATE_LIMIT_DISABLED === "1"`).

**Files (expected).** `frontend/src/middleware.ts` (or a
helper at `frontend/src/lib/rate-limit/edge.ts`), Vercel KV
integration in `frontend/package.json`.

## 6. Stripe webhook signature audit + unit test

**Scope.** Read-only audit of
`backend/app/api/v1/stripe_webhook.py` (or wherever the route
lives) to confirm:

a. The **only** ingestion path uses
   `stripe.Webhook.construct_event(body, sig, secret)`. No
   `try/except` that "falls back" to accepting unsigned
   payloads.
b. The `endpoint_secret` is read from env, not hard-coded.
c. Replay protection: every accepted event's `id` is recorded
   to a small dedup table or LRU; subsequent duplicates are
   no-ops with `200`.

Add one **unit test** asserting `POST` with no signature
returns `401`, and `POST` with a bad signature returns `401`.

**Non-scope.** No Stripe API version bump. No new event
handler. No idempotency-table migration (only LRU in-memory
is on the table — DB-backed dedup is a P2 item).

**Owner gate.** None.

**Risk gate.** Audit must not change behaviour — only the
test is new.

**Verify.** `pytest backend/tests/test_stripe_webhook_signature.py
-q` passes. Hit the live webhook with a real Stripe test event
from `stripe trigger checkout.session.completed --resource …`
(local CLI; no agent step) — backend logs show
`signature_verified=true`.

**Rollback.** Drop the new test file. No production-code
change in this slice.

**Files (expected).** `backend/tests/test_stripe_webhook_
signature.py`, a doc-comment edit on the webhook route.

## 7. Cookie-consent → analytics gating audit

**Scope.** Read-only audit of:

- Where every analytics script (`gtag`, Plausible, PostHog,
  Vercel Web Analytics) is mounted.
- Whether each mount is gated on `consent === "granted"`.
- The default state of the consent banner on first load
  (must be **denied** until the user chooses).
- The server-side analytics routes (`/api/v1/analytics/*`)
  must honour the same flag (or simply not exist).

Add **one frontend test** (a `vitest` or `tsx` script
following the existing pattern in
`frontend/scripts/cookie-consent-parse.test.ts`) that
asserts the default decision is `denied`.

**Non-scope.** No new analytics provider. No UI copy change
on the banner.

**Owner gate.** None.

**Risk gate.** Audit must catch every analytics provider,
not just the obvious ones — grep for the SDK names listed
above + any `<Script src="…">` in the layout.

**Verify.** Run the new script in CI as part of
`frontend-checks` (the existing job has a pattern for
`tsx`-based unit checks). Manual DevTools check: load
`twin-sooty.vercel.app/` in an incognito tab, **don't**
click consent, confirm no analytics request fires in
Network.

**Rollback.** Drop the new test. No prod change.

**Files (expected).** `frontend/scripts/cookie-consent-
default-denied.test.ts`, doc edits to
`docs/COOKIE_CONSENT.md`.

## What is **not** in this plan (and why)

- **Auto-apply queue audit-log.** Covered separately by
  `docs/PLACEMENT_VERIFICATION.md` + the backend
  `placement_events` test. Not a security primitive per se;
  more an integrity primitive.
- **SAST scan (e.g. Semgrep, CodeQL).** Defer to P2.
  `npm audit` + `pip-audit` give us the CVE story; SAST is a
  bigger investment.
- **WAF in front of Vercel.** P2. Vercel's edge already
  filters obvious abuse; we add edge rate-limit (item 5) for
  fine-grained control. A real WAF is a separate decision.

## Hard bans honoured (this run)

- No code change to `auth.ts`, CSP header,
  middleware, OAuth callbacks, Stripe webhook, rate-limit
  config, Sentry init, or analytics gating.
- No `npm audit` / `pip-audit` workflow file added.
- No env / secret change.
- No PAT scope change.
- No `.env` / token / JWT content in this doc.
- No prod redeploy.

## Files

- This doc (new).

## Related

- `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` — source
  backlog; superseded by this doc as the **actionable**
  checklist (the older doc keeps the prose rationale).
- `docs/P1_OBSERVABILITY_PLAN_2026-05-26.md` — pairs with
  item 3 (Sentry is also the observability backbone).
- `docs/COOKIE_CONSENT.md` — input to item 7.
- `docs/AUTH_PASSWORD.md` — input to item 2.
- `docs/PLACEMENT_VERIFICATION.md` — pairs with the
  audit-log primitive not in this plan but related.
- `docs/P1_RELEASE_BASELINE_2026-05-27.md` (TASK 1 of this
  run) — confirms current security headers and CSP report-
  only state.
