# Incident — `/api/public-health` HTTP 500 (2026-07-13)

> **Status:** CLOSED (transient; no hotfix merge required)  
> **Severity:** P1 probe / P0 if sustained  
> **Launch stance:** NO-GO unchanged · Gate F PENDING

---

## Summary

Reported production failures on `/api/public-health` were **not reproduced** on the canonical alias during this batch. Sustained probes returned **HTTP 200** with valid JSON. The prior 500 was **transient** — consistent with upstream Railway latency spikes and the known sequential-fetch timeout class documented in `frontend/scripts/public-health-route-stability.test.ts`.

**Wrong alias trap:** `twin-career.vercel.app` returns `DEPLOYMENT_NOT_FOUND` (404), not 500. Always probe `twin-sooty.vercel.app`.

---

## Probe evidence (batch 2026-07-13, 9× each route)

| Route | HTTP | Latency (typical) | Body (safe) |
|-------|------|-----------------|-------------|
| `https://twin-sooty.vercel.app/api/public-health` | 200 | 4.5–5.1s | `status: ok`, `db_ok: true`, `git_commit: c2a08b0…` |
| `https://twin-sooty.vercel.app/` | 200 | 0.15–0.88s | HTML marketing shell |
| `https://twin-sooty.vercel.app/login` | 200 | 0.15–0.56s | HTML login shell |
| `https://twin-sooty.vercel.app/status` | 200 | 0.15–0.47s | HTML status page |
| `https://twin-production-bcd9.up.railway.app/api/v1/health` | 200 | 0.21–0.27s | `status: ok`, `git_commit: c2a08b0…` |
| `https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1` | 200 | 0.21–0.27s | ops flags present, no secrets |
| `https://twin-career.vercel.app/api/public-health` | 404 | ~0.10s | `DEPLOYMENT_NOT_FOUND` |

**Deploy alignment:** Vercel FE + Railway API both report scaffold `c2a08b025ca950b341540f0bc80f710825c778ce`.

---

## Root cause (historical, code-level)

| Class | Mechanism | Mitigation (in repo) |
|-------|-----------|----------------------|
| Empty 500 | Unguarded `celeryRes.json()` on empty body | `safeReadJson` + soft-fail celery branch |
| 502 / timeout | Sequential health + celery (~8–10s total) | Parallel `Promise.allSettled`, celery soft-fail |
| Slow but OK | Celery introspection ~4–5s + Railway health ~0.2s | `CELERY_TIMEOUT_MS=5000`, health authoritative |

Route: `frontend/src/app/api/public-health/route.ts` — regression locked in `public-health-route-stability.test.ts`.

---

## Hotfix decision

| Criterion | Result |
|-----------|--------|
| Sustained 500 on canonical alias? | **NO** |
| Scaffold `c2a08b0` already contains fixes? | **YES** |
| Hotfix PR from scaffold required? | **NO** |

No hotfix branch opened. Observability hardening added in #451 (latency guard + prod probe script).

---

## Follow-ups

1. Monitor `public-health` p95; alert if >8s or non-200 for 3 consecutive probes.
2. Document canonical alias in runbooks (`docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md`).
3. Re-run founder smoke only when credentials SET — not required for this incident closure.

### Batch 2026-07-13 (extended) — re-verification

| Probe | Result | Notes |
|-------|--------|-------|
| `twin-sooty.vercel.app/api/public-health` | 200 | p95 ~4.5–5.1s — within soft-fail band; no liveness/readiness split warranted |
| Railway `/api/v1/health` | 200 | ~0.2s |
| Wrong alias `twin-career.vercel.app` | 404 | `DEPLOYMENT_NOT_FOUND` |

**Liveness/readiness split:** not warranted at p95≤5.1s on canonical alias; monitor only.

---

## Hard bans (unchanged)

Launch **NO-GO** · Gate F **PENDING** · no product PR merges without smoke · no fake PASS.
