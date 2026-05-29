# P1 — CSP Report Endpoint (Design + Safe Impl) — 2026-05-27

**Scope:** TASK 4 of the 3-hour security session on
`cursor/phase1-monorepo-scaffold`. **Both** the design and a
**safe, no-storage backend implementation** are shipped in this
commit — no CSP enforcement flip, no frontend `report-uri`
wiring (next slice).

## Why we need it now

`frontend/next.config.ts` already ships a
`Content-Security-Policy-Report-Only` header with a fully-formed
policy (see `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`). The
header tells browsers to send violation reports — but **the
header has no `report-uri` / `report-to` target today**. Result:
every CSP violation the browser could tell us about is dropped
on the floor. We can't measure burn-in (the gate before we flip
to enforcing mode), and we can't tune the directives without
guessing.

This commit ships the sink. The next slice will add the
`report-uri /api/v1/csp-report` directive in `next.config.ts`
so reports actually arrive.

## What this commit ships

### `POST /api/v1/csp-report`

`backend/app/api/csp_reports.py`:

```python
@router.post("/csp-report", status_code=204)
@limiter.limit("60/minute")
async def csp_report(request: Request) -> Response:
    raw = await request.body()
    if not raw:
        return Response(status_code=204)
    try:
        payload = json.loads(raw.decode("utf-8", errors="replace"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.debug("csp_report: undecodable payload, %d bytes", len(raw))
        return Response(status_code=204)
    summary = _summarise_report(payload)
    if summary:
        logger.warning("csp_report violation: %s", summary)
    return Response(status_code=204)
```

Properties:

- **Always 204.** Browsers send CSP reports fire-and-forget. A
  4xx/5xx would surface as a console error on the user's page
  and would tell the browser to drop the report. We never want
  either, so we acknowledge every payload.
- **No DB write.** No new table, no migration, no PII storage.
  Reports go to the same stdlib `logging` pipe as the rest of
  the app; ops can pivot them into Datadog / Sentry from there.
- **Lenient parser.** `_summarise_report` accepts:
  - Legacy `{"csp-report": {...}}` envelope (Chrome/Safari
    today, `application/csp-report`).
  - Modern Reporting API array
    `[{"type": "csp-violation", "body": {...}}]` (Firefox,
    Chrome via `report-to`, content-type
    `application/reports+json`).
  - Anything else → DEBUG log, still 204.
- **Field allowlist.** Only the documented CSP report fields
  are passed to the log line
  (`document-uri`, `blocked-uri`, `violated-directive`, etc.).
  Headers, cookies, page snippets that bot operators might
  inject into a fake report are dropped before they touch the
  log pipeline.
- **Rate-limited 60/min per IP.** SlowAPI sliding window. Same
  primitive that guards `/auth/login` and `/beta/join`. Stops a
  misconfigured page in one tab from hammering the endpoint, but
  is generous enough that real burn-in traffic (a few-violation
  page reloaded by a tester) never hits the cap.
- **Mounted with no prefix.** `api_router.include_router(csp_reports.router, tags=["Security"])`.
  Final URL is `POST /api/v1/csp-report`, mirroring how
  `health.router` is mounted.

### Tests

`backend/tests/test_csp_report.py` (5 tests, all PASS):

1. Legacy `{"csp-report": {...}}` payload → 204 + log line
   contains `blocked-uri`.
2. Reporting-API array payload → 204 + log line contains
   `blockedURL`.
3. Empty body → 204 (browsers POST `b""` on `clear`).
4. Garbled bytes / undecodable JSON → 204 (never fail closed).
5. 61st POST in a minute → 429 (rate-limit holds).

```
$ python -m pytest backend/tests/test_csp_report.py -v
tests/test_csp_report.py::test_csp_report_accepts_legacy_envelope_and_logs PASSED
tests/test_csp_report.py::test_csp_report_accepts_reporting_api_array PASSED
tests/test_csp_report.py::test_csp_report_accepts_empty_body_silently PASSED
tests/test_csp_report.py::test_csp_report_accepts_garbled_payload_silently PASSED
tests/test_csp_report.py::test_csp_report_is_rate_limited_after_60_per_minute PASSED
5 passed
```

## Why this is safe to ship today

| Question                                  | Answer                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Does it flip CSP enforce?                 | **No.** Frontend keeps `Content-Security-Policy-Report-Only`.                                                       |
| Does it add a `report-uri` to the header? | **No** — that's the next slice. Until that lands, the new endpoint just sits there idle (which is the desired state). |
| Does it write to the DB?                  | **No.** No table, no migration.                                                                                     |
| Does it accept unauthenticated traffic?   | **Yes by design.** Browsers can't authenticate CSP reports. Rate-limit + field allowlist are the defence.           |
| What if a bot abuses it?                  | 60/min per IP cap. Worst case: someone burns a few log lines a second; the SlowAPI key is the IP, not a global limit. |
| Could it leak data?                       | Only the documented CSP report fields are logged. URLs in `document-uri` are the user's own page URLs, which are already in our HTTP access logs. No new exposure. |
| Does it require new env vars?             | No.                                                                                                                 |
| Does it require new dependencies?         | No — SlowAPI is already wired.                                                                                       |

## What this commit does **not** do (intentional)

- **No `report-uri` / `report-to` in `next.config.ts`.** That
  flip is one line in the existing CSP value
  (`report-uri /api/v1/csp-report;`), but it changes the
  behaviour of every running frontend the moment we deploy: real
  reports start streaming. Separate slice so we can ship the
  sink first, watch it under synthetic traffic, then turn the
  hose on.
- **No `report-to` group header.** The newer `Report-To` /
  `Reporting-Endpoints` header lets the browser batch and retry
  CSP reports. Useful, but the legacy `report-uri` covers
  Chrome/Safari today; we'll add the modern header in the same
  slice that adds the directive.
- **No Datadog / Sentry forwarder.** The reports land in stdlib
  `logging`. Whichever log aggregator the ops slice picks
  (Datadog vs Vercel Log Drain vs Railway logs) gets them for
  free.
- **No persistence layer.** A future migration could add a
  `csp_violations` table with `(directive, blocked_uri, count, last_seen_at)`
  if we want a dashboard. **Out of scope** — design only:
  - PK on `(directive, blocked_uri)`.
  - `INSERT ... ON CONFLICT (directive, blocked_uri) DO UPDATE
    SET count = count + 1, last_seen_at = now();`.
  - Worker reads stdlib log, calls a write helper. Avoids
    putting DB latency in front of the browser POST.

## Roll-out plan (next slice — not in this commit)

1. **Ship report-uri.** `frontend/next.config.ts`: append
   `report-uri /api/v1/csp-report;` to the existing
   `Content-Security-Policy-Report-Only` value. One-line diff.
2. **Verify on preview alias.** Visit `/`, `/dashboard`,
   `/login/candidate`, `/register/candidate`, `/waitlist`,
   `/demo`, `/status`, `/pricing`. Check Railway logs for
   `csp_report violation:` lines. Expect: a handful from the
   `unsafe-inline` script blocks Next.js still uses.
3. **Tune directives.** Add specific hosts to `connect-src` /
   `img-src` / `script-src` based on the actual reports.
4. **Iterate to zero violations for 72h.**
5. **Flip header** from `-Report-Only` to enforcing in
   `next.config.ts`. One-character diff.

Gate (4) is the meaningful one — it's the burn-in described in
`docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` §"Risk gates".
Today's commit is the precondition for it.

## Hard bans honoured (this run)

- No Railway deploy / redeploy.
- No DB migration / schema change.
- No `.env` change / new prod env var.
- No CSP enforce flip.
- No frontend `next.config.ts` change (the `report-uri` slice is
  next, intentionally separate).
- No `.github/workflows/smoke.yml` edit.
- No secrets in this doc or in test fixtures.

## Files changed

- `backend/app/api/csp_reports.py` (new, 102 lines incl docstring).
- `backend/app/api/router.py` (2 lines: import + `include_router`).
- `backend/tests/test_csp_report.py` (new, 5 tests).
- `docs/P1_CSP_REPORTING_ENDPOINT_2026-05-27.md` (this doc).

## Related

- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` — the parent
  plan. This commit ships the report sink it depends on.
- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md` item 1 —
  CSP nonce / enforce flip. Still gated on burn-in.
