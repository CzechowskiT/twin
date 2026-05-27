# P1 CSP `report-uri` wiring (Report-Only) — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 1 of the long autonomous security session
(2026-05-27). Wires the `report-uri` directive into the
existing `Content-Security-Policy-Report-Only` header so the
already-shipped `POST /api/v1/csp-report` sink starts receiving
browser violation telemetry. **No enforce flip.**

## What changed (one-character + one-test)

```diff
- "default-src 'self'; … ; form-action 'self'"
+ "default-src 'self'; … ; form-action 'self'; report-uri /api/v1/csp-report"
```

`frontend/next.config.ts` only. The string still lives under
`Content-Security-Policy-Report-Only`; no enforce-mode CSP yet.

A new structural assertion was added to
`frontend/scripts/security-headers.test.ts`:

```text
ok CSP report-uri points at the backend sink
```

## Why this is safe

- **Endpoint is storage-free** — `backend/app/api/csp_reports.py`
  returns `HTTP 204` for every request, drops the body after a
  best-effort summarise/log, and ignores unrecognised payload
  shapes (CSP2 legacy envelope + CSP3 / Reporting API array).
  See `docs/P1_CSP_REPORTING_ENDPOINT_2026-05-27.md`.
- **Endpoint is rate-limited** — `@limiter.limit("60/minute")`
  per IP. A misconfigured page or a hostile bot cannot flood
  the logs.
- **Path is proxy-safe** — `/api/v1/csp-report` is matched by
  `frontend/src/app/api/v1/[[...path]]/route.ts` and forwarded
  to the FastAPI backend exactly like every other `/api/v1/*`
  request. No new CORS surface; the browser POSTs to its own
  origin.
- **Header stays Report-Only** — browsers send violation
  reports but **do not block** any content. Zero behaviour
  change for end users; the only observable diff is an outbound
  `POST /api/v1/csp-report` from offending pages.
- **No DB migration, no schema change, no Vercel env change,
  no Railway env change.**

## Why now

Step 4 of the burn-in described in
`docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` required the
`report-uri` directive to be wired before the 72-hour preview
burn-in could start. The sink endpoint shipped in commit
`0dfc6c9` (TASK 4 of the prior session); this commit closes
the wiring loop so the burn-in clock can start.

## Frontend gates re-run after the change

```
$ npm run lint            # 0 errors, 0 warnings
$ npx tsc --noEmit        # 0 errors
$ npm run test:security-headers
ok headers() exists and covers all paths
ok X-Frame-Options is DENY
ok X-Content-Type-Options is nosniff
ok Referrer-Policy is strict-origin-when-cross-origin
ok Permissions-Policy disables camera/mic/geo/interest-cohort
ok CSP is currently in report-only mode (P1 baseline)
ok CSP directives are present and explicit
ok frame-ancestors is locked to 'none'
ok CSP report-uri points at the backend sink
$ npm run build           # success, all routes prerendered/dynamic as before
```

## Burn-in expectations (operator-only)

Once Vercel auto-deploys this branch / promotes it to
production, browsers running the report-only CSP will start
POSTing violation reports. The backend logger emits one
structured `csp_report violation: { … }` line per report at
WARNING level. Watch for 72 hours; look for:

| Pattern                                          | Meaning                                                    | Action |
| ------------------------------------------------ | ---------------------------------------------------------- | ------ |
| `blocked-uri: https://images.unsplash.com/…`     | already on the allowlist in the enforce-mode draft         | no-op  |
| `blocked-uri: https://*.gstatic.com/…`           | already on the allowlist in the enforce-mode draft         | no-op  |
| `blocked-uri: https://<new third-party host>/…`  | new origin not in the enforce-mode draft                   | add to `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`, then to `next.config.ts` |
| `blocked-uri: inline`, `script-src` violation    | the nonce work (item 1 of the security plan) is the fix    | track for the nonce slice, not for this burn-in |
| Sudden spike to 1000s of reports / minute        | likely a misconfigured route or a bot probing              | tighten the rate limit on the endpoint and triage logs |

Per the plan, the enforce flip is gated on **zero unexpected
hosts for 72 hours** on production traffic.

## Hard bans honoured

- No Railway deploy / redeploy.
- No backend code change in this commit.
- No DB migration.
- No `.env` committed.
- No secrets in this doc.
- No UX / copy change.
- No new product feature.
- **No CSP enforce flip** — header name unchanged.

## Files changed

- `frontend/next.config.ts` — `report-uri /api/v1/csp-report`
  appended to the existing Report-Only string.
- `frontend/scripts/security-headers.test.ts` — one new
  structural assertion.
- `docs/P1_CSP_REPORT_URI_WIRING_2026-05-27.md` (this doc).

## Related

- `docs/P1_CSP_REPORTING_ENDPOINT_2026-05-27.md` — the sink
  endpoint that now receives the reports.
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` — inventory +
  enforce-mode shape + burn-in plan.
- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md` —
  parent task list; item 1.
