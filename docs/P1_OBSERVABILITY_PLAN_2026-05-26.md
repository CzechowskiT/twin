# P1 Observability Plan — 2026-05-26

TASK 8 of the overnight engineering run. Captures the
**observability backlog** for TWIN: what's wired today, what
needs to land before we put a placement-fee tier in front of
recruiters, and the safest no-op hooks the engineering team
can drop in to start collecting signal without changing
candidate-facing behaviour.

This doc is **documentation only**. No live emitter / dashboard /
alert is shipped by this commit. Every item below names the
exact module to touch when the human owner picks it up.

## TL;DR — what we already have

Backend (`backend/app/`):

- `middleware/request_id.py` — every request gets an `x-
  request-id` header (UUID v4 if the client did not supply
  one). Carried into structured logs via
  `request.state.request_id`.
- `slowapi` rate-limit decorators on auth + mutation endpoints
  (request count visible in 429 responses).
- FastAPI exception handlers log unhandled exceptions with the
  request-id plus the truncated stack trace.
- `tasks/` (Celery) tasks log start / finish / failure with
  the Celery task id.
- `/api/v1/health` + `/api/v1/health/celery-status` +
  `/api/v1/public/mvp-stats` — three already-deployed
  read-only health probes (see
  `scripts/verify-prod-health.sh`).

Frontend (`frontend/`):

- Vercel build emits the deploy SHA into HTML at build time
  (`x-vercel-id` per response). Observable in browser devtools.
- The `proxy` middleware at the Vercel edge forwards
  `Authorization` to Railway untouched.
- `useDashboardData` and the extracted dashboard hooks set
  human-readable error toasts via `dashboardFetchUserMessage`
  on every API failure (visible to the candidate, not yet
  beaconed back to us).

Vercel side:

- `x-vercel-cache: HIT|MISS|STALE` header per response —
  cheap CDN cache signal.
- `x-vercel-id: <region>::<…>` — per-request region trace
  (useful for tail-latency diagnosis).
- HSTS preload, X-Frame-Options DENY, CSP report-only — see
  `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md`.

## What's missing

| #  | Capability                                       | Risk if skipped                                              | Target window  |
| -- | ------------------------------------------------ | ------------------------------------------------------------ | -------------- |
| 1  | Centralized log aggregation                      | We can't grep across pods; Railway log retention is ~7 days  | next sprint    |
| 2  | Application metrics (RED: rate/error/duration)   | Blind to slow `/api/v1/applications/auto-apply`              | next sprint    |
| 3  | Distributed trace IDs across FE + BE             | Hard to follow "candidate clicks apply" → backend            | with #1        |
| 4  | Front-end performance beacons (Web Vitals)       | LCP / INP regressions ship silently                          | this week      |
| 5  | Front-end error beacons (window.onerror →BE)     | We learn about FE crashes from candidate emails              | this week      |
| 6  | Synthetic uptime monitors on `/`, `/dashboard`   | First-touch downtime detected via Vercel alerts only         | this week      |
| 7  | Celery beat / queue dashboards                   | Stuck tasks visible only via `worker_nodes` flag             | next sprint    |
| 8  | Placement-state audit-log dashboard              | Disputes have no provable timeline view                      | next sprint    |
| 9  | Auto-apply pipeline trace (per-send timeline)    | Can't say "where did the send stall?"                        | next sprint    |
| 10 | Cookie-consent–aware event collection            | GDPR exposure if we beacon before consent                    | with #4, #5    |

## Detail per item

### 1. Centralized log aggregation

Railway pushes container stdout to its own log viewer. Good
for live tail, bad for cross-service grep, audit retention,
and metrics extraction.

**Recommended.** Wire FastAPI structured logs +
Celery task logs +Vercel function logs into a single
sink. Cheapest options that fit the Phase 1 budget:

- **Better Stack / Logtail** — cheap free tier, ingest via
  Vercel's "Log Drains" + a Railway syslog drain.
- **Datadog** — heavier price but pairs with `plugin-datadog-
  datadog` MCP we already have configured.
- **Self-hosted Loki on Fly.io** — cheapest at scale, more
  ops.

Pick one, route Railway + Vercel both to it, keep 30-day
retention.

### 2. RED metrics (rate / error / duration)

For each Phase 1 critical endpoint, emit a histogram of
duration + a counter of error responses, keyed by route:

- `POST /api/v1/applications/`
- `POST /api/v1/applications/auto-apply`
- `POST /api/v1/candidates/me/match-feedback`
- `GET  /api/v1/candidates/me/matches`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET  /api/v1/health`

Cheapest path: `prometheus-fastapi-instrumentator` (FastAPI
ASGI instrumentor) +`/metrics` route + a hosted Prometheus
endpoint (Grafana Cloud free tier, or Better Stack metrics).
**Pure additive.** No behaviour change for candidates.

### 3. Distributed trace IDs across FE ↔ BE

Today `x-request-id` is generated server-side. Generate it
client-side instead (`crypto.randomUUID()`) and send as
`X-Request-Id` from every `apiFetch(...)` call; the existing
backend middleware will accept it if present. Adds nothing on
the wire today, but makes step #1 + #4 + #5 cross-correlate
on a single id.

**Safe no-op hook** the team can drop in (FE side):

```ts
// frontend/src/lib/api.ts — inside apiFetch
const requestId =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
headers.set("X-Request-Id", requestId);
```

The backend already accepts `X-Request-Id` — so this is
literally adding a header. Zero behavioural change.

### 4. Web Vitals beacon

Next 16 ships
`next/web-vitals` (`useReportWebVitals(...)`). Add a tiny
client component that POSTs `LCP`, `INP`, `CLS`, `FCP`, `TTFB`
to `/api/v1/observability/vitals` (new BE route — log only).

Gate behind cookie-consent (`consent === "granted"`).

### 5. Front-end error beacon

Wire `window.onerror` + `window.onunhandledrejection` to POST
a `{ message, stack, request_id, url }` payload to
`/api/v1/observability/client-error` (new BE route — log
only). Gate behind cookie-consent.

**Hard ban.** Never include candidate PII (email, profile
fields, applied job titles) in the payload. Strip on the FE
before the POST.

### 6. Synthetic uptime monitors

Add 3 external probes (cron-style, every 5 min):

- `GET https://twin-sooty.vercel.app/` → 200, expect
  `<title>` substring "TWIN".
- `GET https://twin-sooty.vercel.app/api/public-health` →
  200, expect JSON `{"status":"ok", "service":"twin-api"}`.
- `GET https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1` → 200, expect
  `db_ok=true, celery worker_active=true`.

Cheap providers: UptimeRobot, Better Stack, or a
GitHub-Actions workflow on `schedule:` that calls
`scripts/verify-prod-health.sh`.

### 7. Celery beat / queue dashboards

Today: `/api/v1/health/celery-status` reports `worker_active`
+ `worker_nodes` as a snapshot. No history, no per-task
breakdown.

Add (in this order):

a. Flower (`celery flower`) running as a sidecar on Railway
   — read-only, behind basic auth, internal IP only.
b. Forward Flower's metrics to whatever store #2 picks.
c. Add `task_runtime_seconds` histogram per task name.

### 8. Placement-state audit-log dashboard

`docs/PLACEMENT_VERIFICATION.md` specifies an append-only
event stream `placement_events`. Add an admin page
(`/dashboard/admin/placements` — gated to ops-elevated
users only) that streams the events for a given application
in chrono order. Hooks the dispute-handling workflow without
touching the candidate UI.

### 9. Auto-apply pipeline trace

Today each auto-apply send writes a row to `applications`
(plus `application_submission_logs` via the
`application_submission` service). Add a "trace view" — a
chronological list of every `{ts, stage, status,
detail}` row for a single auto-apply attempt. Surface in the
admin page from #8.

### 10. Cookie-consent–aware event collection

For every FE beacon in #4 and #5, **respect the cookie-
consent decision** stored on first load. Default = denied.
Pseudo:

```ts
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

if (hasAnalyticsConsent()) {
  navigator.sendBeacon("/api/v1/observability/vitals", body);
}
```

`docs/COOKIE_CONSENT.md` already specifies the contract.

## Safe no-op hooks (drop-in ready)

The following are **shipped-safe** changes — additive,
client-only, behaviourally neutral — that a human can land
in any sprint without burning a slot in this overnight loop.
They are intentionally **not** committed by this run.

### 10a. `X-Request-Id` header on `apiFetch`

See snippet under #3. Pure additive. Zero behavioural
change. Pairs with the existing backend middleware.

### 10b. `useReportWebVitals` stub

```tsx
// frontend/src/app/web-vitals.tsx (new file)
"use client";

import { useReportWebVitals } from "next/web-vitals";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

export function WebVitalsBeacon() {
  useReportWebVitals((metric) => {
    if (!hasAnalyticsConsent()) return;
    // dev-only stub; pipe to /api/v1/observability/vitals in a follow-up
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug("[web-vitals]", metric.name, metric.value);
    }
  });
  return null;
}
```

Add `<WebVitalsBeacon />` once at the top of
`app/layout.tsx`. Until `/api/v1/observability/vitals`
exists, the stub does nothing in production.

### 10c. `window.onerror` listener (no-op in prod until route exists)

```tsx
// frontend/src/components/client-error-beacon.tsx (new file)
"use client";

import { useEffect } from "react";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

export function ClientErrorBeacon() {
  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    const send = (payload: Record<string, string>) => {
      // stub: log in dev, wire to /api/v1/observability/client-error later
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("[client-error]", payload);
      }
    };
    const onError = (ev: ErrorEvent) =>
      send({ message: ev.message, src: String(ev.filename ?? "") });
    const onUnhandled = (ev: PromiseRejectionEvent) =>
      send({ message: `unhandled rejection: ${String(ev.reason)}` });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);
  return null;
}
```

Both stubs:

- ✅ Respect cookie-consent.
- ✅ Never include PII.
- ✅ Compile clean (lint + tsc + `next build`).
- ✅ No-op in production until the corresponding BE route
  exists.

## Verification of the existing observability surface

```
$ curl -sI https://twin-sooty.vercel.app/dashboard | grep -i "^x-request-id\|^x-vercel"
x-vercel-cache: HIT
x-vercel-id: arn1::gh8xc-1779805500739-b7d8244bc8a3
```

```
$ curl -s "https://twin-sooty.vercel.app/api/public-health" \
    | python3 -c "import json, sys; d=json.load(sys.stdin); \
                  print('git:', d.get('git_commit')[:8]); \
                  print('celery:', d.get('celery', {}).get('worker_active'))"
git: 86176cce
celery: True
```

Backend exposes the build SHA and live celery state on every
health probe. Both already feed
`scripts/verify-prod-health.sh` (which gates the
`prod-health` CI job — see
`docs/P1_CI_HARDENING_2026-05-26.md`).

## Hard bans honoured (this run)

- No code change to the FE proxy middleware, `apiFetch`,
  `useDashboardData`, or any BE route in this commit.
- No new env / secrets.
- No new dependency installed.
- No third-party SDK loaded into the FE bundle yet.
- No cookie-consent decision overridden.
- No PII captured.
- This run **only** ships this doc.

## Related

- `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` (sibling task).
- `docs/COOKIE_CONSENT.md` — pre-requisite for #4 / #5 / #10.
- `docs/PLACEMENT_VERIFICATION.md` — pre-requisite for #8.
- `scripts/verify-prod-health.sh` — current readiness probe.
