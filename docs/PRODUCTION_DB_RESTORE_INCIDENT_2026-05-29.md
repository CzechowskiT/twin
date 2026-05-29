# Production database restore incident — 2026-05-29

**Incident ID:** `INC-DB-2026-05-29-001`  
**Severity:** **S0** (suspected production data rollback / partial data loss)  
**Status:** **OPEN — recovery decision pending founder**  
**Operator (reported):** founder  
**Agent role:** read-only verification + documentation (no deploy, no DB mutation)

## Summary

Founder likely triggered a **manual Railway Postgres backup restore** on project **`responsible-success` / production** Postgres. UI showed **"Restoring backup…"**. Source backup: **2026-05-25 07:33 UTC** (~120 MB).

After restore:

- API health surfaces remain **green** (`status=ok`, `db_ok=true`, Celery worker active).
- **Founder dashboard shows zeros** (feed/jobs, matches, applications, pipeline).
- **`GET /api/v1/public/mvp-stats` returns HTTP 500** (read-only check 2026-05-29 UTC) — regression vs prior baseline when endpoint returned 200.
- **`validated_jobs=652`** still visible on `public-health` / `health?ops=1` — job-corpus aggregate may differ from per-user dashboard rows.

**Classification:** production data incident — **NOT** gate O7 staging drill. O7 remains **INVALID / FAIL** for this event.

## Founder-reported evidence

| Field | Value |
| ----- | ----- |
| Railway project | `responsible-success` / production |
| Service | Postgres |
| Backup restored | Manual backup **2026-05-25 07:33 UTC**, ~120 MB |
| UI state | "Restoring backup…" observed |
| Pre-incident (founder) | Dashboard non-zero; `validated_jobs` ~652 on health |
| Post-incident (founder) | Dashboard **zeros** across feed, matches, applications, pipeline |

## Read-only agent verification (2026-05-29 UTC)

| Check | Result |
| ----- | ------ |
| `GET https://twin-sooty.vercel.app/api/public-health` | `status=ok`, **`db_ok=true`**, `git_commit=df15618`, `validated_jobs=652`, `worker_active=true` |
| `GET /` (Vercel) | HTTP **200** |
| `GET /dashboard` (Vercel) | HTTP **200** |
| `GET https://twin-production-bcd9.up.railway.app/api/v1/health` | `status=ok`, `git_commit=df15618` |
| `GET …/api/v1/health?ops=1` | `status=ok`, `validated_jobs=652`, `market_coverage_active_validated=1727` |
| `GET …/api/v1/public/mvp-stats` | HTTP **500** — `{"detail":"Internal server error"}` |
| `GET …/api/v1/demo/snapshot` | HTTP 200, `source=static_fallback` (not live DB proof) |

### Prior baseline (docs, not re-measured on DB)

| Metric | Prior reference | Current public signal |
| ------ | ----------------- | --------------------- |
| `validated_jobs` | 652 (`public-health`, multiple 2026-05-29 docs) | **652** (unchanged on health) |
| `registered_users` | 3 (`CTO_PRODUCT_TECH_AUDIT_2026-05-26`, mvp-stats) | **Unknown** — mvp-stats 500 |
| Dashboard user data | Non-zero (founder smoke 2026-05-29) | **Zeros** (founder report) |
| Alembic head | `050_stripe_webhook_events` (founder SQL 2026-05-29) | **Unverified post-restore** — founder must re-run read-only SQL |

**Do not infer exact row loss** without founder read-only SQL on production Postgres.

## Hypothesis (unconfirmed)

1. **In-place restore** of production Postgres to **2026-05-25** snapshot → loss of user/match/application rows created **2026-05-25 → incident time**.
2. Possible **schema / migration drift** if restored volume predates migration `050` → may explain `mvp-stats` 500 while basic health queries succeed.
3. Job corpus counts may come from **different query paths** than per-candidate dashboard feed → health can look OK while user-facing data is empty.

## Railway founder checklist (screenshots required)

Execute in Railway Dashboard — **read-only / evidence only** until recovery option chosen.

| # | Where | Capture |
| - | ----- | ------- |
| 1 | Postgres → **Backups** | List of snapshots; highlight **2026-05-25 07:33 UTC** restore source |
| 2 | Postgres → **Settings / Restore history** (if shown) | Target: **in-place prod** vs **new database/clone** |
| 3 | Project → **Activity** | Restore event timestamp (UTC) |
| 4 | Postgres → **Deployments** | Any redeploy tied to restore |
| 5 | Postgres → **Volumes** | Current volume ID; created date |
| 6 | Project → **Recently deleted** | Old volume / service — recoverable? |
| 7 | API service → **Variables** | Confirm **`DATABASE_URL` unchanged** (do not paste values — screenshot redacted host only) |
| 8 | Railway **Support** | Open ticket if pre-restore volume recovery needed |

## Safe read-only endpoints (founder / ops)

**No auth required:**

| URL | Purpose |
| --- | ------- |
| `https://twin-sooty.vercel.app/api/public-health` | Ops payload: `db_ok`, `validated_jobs`, Celery |
| `https://twin-production-bcd9.up.railway.app/api/v1/health` | Minimal API liveness |
| `https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1` | Extended ops booleans + job counts |
| `https://twin-production-bcd9.up.railway.app/api/v1/health/celery-status` | Worker/broker snapshot |
| `https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats` | Aggregate DB counts (**currently 500 — incident signal**) |
| `https://twin-production-bcd9.up.railway.app/api/v1/demo/snapshot` | Demo mode snapshot (may be static fallback) |

**Bearer token required** (`Authorization: Bearer <OPS_ADMIN_TOKEN>` — use Railway/env locally, **never commit**):

| URL | Purpose |
| --- | ------- |
| `GET /api/v1/admin/metrics` | Users, matches, applications totals |
| `GET /api/v1/admin/data-quality` | Data quality KPIs |
| `GET /api/v1/admin/market-coverage-status` | Scrape corpus coverage |
| `GET /api/v1/admin/matching-quality` | Match pipeline health |
| `GET /api/v1/admin/deploy-health` | Deploy + wiring extensions |

**Auth required (founder session — browser or JWT):**

| URL | Purpose |
| --- | ------- |
| `GET /api/v1/candidates/me/matches` | Per-user match feed |
| `GET /api/v1/applications` | Application pipeline |
| `GET /api/v1/jobs/feed-stats` | Feed stats |
| `GET /api/v1/candidates/me/verified-readiness` | Readiness gate state |

**Read-only SQL (Postgres shell — founder only):**

```sql
SELECT version_num FROM alembic_version;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM candidates;
SELECT COUNT(*) FROM job_matches;
SELECT COUNT(*) FROM applications;
SELECT COUNT(*) FROM jobs WHERE validated_at IS NOT NULL;
```

## Recovery options (founder decision — no agent execution)

### Option A — Retain restored DB; rebuild forward (lowest blast radius if loss accepted)

- Accept **2026-05-25** state as current production truth.
- Document **loss window**: ~2026-05-25 07:33 UTC → restore execution time.
- Re-run **read-only** SQL sanity + `alembic current`; if behind `050`, plan **founder-approved** migration window (separate incident step).
- Re-seed **pilot/demo** users per `scripts/seed-investor-demo.py` runbook — **only after explicit approval**.
- Notify pilot users if personal data (matches, applications, calendar holds) was lost.
- **Do not** claim O7 PASS.

### Option B — Recover pre-restore volume (Railway / support)

- Check Railway **Recently deleted** volumes and Postgres service history for **pre-restore volume**.
- Open **Railway Support** ticket: accidental in-place restore; request volume recovery / PITR if plan supports it.
- **Do not** run another restore without pausing API + worker (see `docs/RUNBOOK_DB_RESTORE_2026-05-27.md` § Production restore).
- Validate on **clone first** before any prod pointer change.

### Option C — Restore newer snapshot to clone; validate; swap (controlled rollback forward)

- Identify **newest snapshot after 2026-05-25** (if any) in Backups list.
- **Restore to new database** (never in-place on prod again without incident commander sign-off).
- Point **temporary staging API clone** at new DB; run SQL sanity + authenticated smoke.
- If counts match pre-incident expectations, plan **maintenance window** to repoint production `DATABASE_URL` — founder-only, documented timeline.
- Keep failed/restored volumes until recovery verified.

## Gate / launch verdicts (this incident)

| Surface | Verdict |
| ------- | ------- |
| O7 backup/restore drill | **FAIL / INVALID** — prod restore ≠ staging drill |
| Controlled pilot | **HOLD** until recovery path chosen + dashboard non-zero verified |
| Investor/demo | **HOLD** — do not demo live DB until mvp-stats + founder dashboard green |
| Public launch | **NO-GO** (unchanged) |

## Immediate founder actions (ordered)

1. **Stop** further restore experiments on production Postgres.
2. Attach **screenshots** (backup list, restore target, activity log, volumes).
3. Run **read-only SQL** counts (above) + paste redacted results into this doc § Evidence log.
4. Run **`alembic current`** in API shell (read-only) — confirm revision vs `050_stripe_webhook_events`.
5. Call **`GET /api/v1/admin/metrics`** with ops token — compare to pre-incident baseline.
6. Choose recovery **A / B / C** and record decision below.
7. If pilot users affected, send **incident comms** per `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md`.

## Evidence log (append-only)

| UTC | Actor | Action | Result |
| --- | ----- | ------ | ------ |
| 2026-05-29 | founder (reported) | Manual Postgres restore from 2026-05-25 backup | Dashboard zeros; health OK |
| 2026-05-29 | agent (read-only) | Health + mvp-stats curl | `db_ok=true`, `validated_jobs=652`; **mvp-stats 500** |
| _pending_ | founder | Railway screenshots + SQL counts | — |
| _pending_ | founder | Recovery option A/B/C decision | — |

## Hard bans honoured (agent session)

- No deploy, Railway restart, migrations, env changes, DB mutation
- No scrape, apply, auto-apply, calendar mutations
- No secrets in this doc
- No O7 PASS; no public launch GO

## Related

- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md`
- `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`
- `docs/BACKUP_RESTORE_DRILL_LOG.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
