# Production database restore incident — 2026-05-29

**Incident ID:** `INC-DB-2026-05-29-001`  
**Severity:** **S0** (wrong production Postgres volume temporarily mounted)  
**Status:** **RESOLVED** — original volume re-mounted; **post-recovery stabilization check PASSED** (read-only curl)
**Active volume:** **`postgres-volume`** (original production) mounted at `/var/lib/postgresql/data`
**Operator:** founder  
**Agent role:** read-only verification + documentation (no deploy, no DB mutation)

## Summary

On **2026-05-29**, founder accidentally activated a **wrong restored backup volume** (`postgres-2026-05-25 07:33 UTC`, ~120 MB) on Railway project **`responsible-success` / production** Postgres. The **original `postgres-volume` was unmounted** from `/var/lib/postgresql/data`.

**Impact while wrong volume was active:**

- API health remained **green** (`status=ok`, `db_ok=true`) but pointed at **stale/wrong data**.
- Founder dashboard: **zeros** (feed/jobs, matches, applications, pipeline).
- Google Calendar: **disconnected** / events not visible.
- `GET /api/v1/public/mvp-stats`: HTTP **500** (agent read-only, pre-recovery).

**Recovery (founder, same day):**

1. Created backup of incorrect state at **2026-05-29 14:09 UTC**.
2. **Re-mounted original `postgres-volume`** to `/var/lib/postgresql/data`.
3. Postgres online; Railway deploy successful (no agent deploy/migrations/env changes).
4. Dashboard recovered (founder visual): **feed 2501**, **matches 200**, **applications 12**, **pipeline 11**; Google Calendar events visible again.

**Classification:** production **incident** — **NOT** gate O7 staging drill. O7 closed separately (**2026-06-01** staging clone PASS — see `docs/BACKUP_RESTORE_DRILL_LOG.md`).

## Timeline

| UTC (approx) | Event |
| ------------ | ----- |
| 2026-05-25 07:33 | Source of wrong backup volume (stale snapshot) |
| 2026-05-29 (AM) | Wrong volume mounted; original `postgres-volume` unmounted |
| 2026-05-29 | Dashboard zeros; calendar disconnected; health OK but wrong DB |
| 2026-05-29 14:09 | Backup taken of incorrect state (safety snapshot) |
| 2026-05-29 14:09+ | Original `postgres-volume` re-mounted; Postgres online |
| 2026-05-29 (post-recovery) | Agent read-only curl: health green, `mvp-stats` **200**, `market_coverage_active_validated=2501` |

## Read-only agent verification

### Pre-recovery (2026-05-29 UTC, agent)

| Check | Result |
| ----- | ------ |
| `GET /api/public-health` | `db_ok=true`, `validated_jobs=652` |
| `GET /api/v1/public/mvp-stats` | HTTP **500** |
| Founder dashboard | Zeros (founder report) |

### Post-recovery (2026-05-29 UTC, agent)

| Check | Result |
| ----- | ------ |
| `GET https://twin-sooty.vercel.app/api/public-health` | `status=ok`, **`db_ok=true`**, `git_commit=df15618`, `validated_jobs=652`, `market_coverage_active_validated=**2501**`, `worker_active=true` |
| `GET /` (Vercel) | HTTP **200** |
| `GET /dashboard` (Vercel) | HTTP **200** |
| `GET …/api/v1/health` | `status=ok`, `git_commit=df15618` |
| `GET …/api/v1/public/mvp-stats` | HTTP **200** — `registered_users=3`, `total_applications=17`, `interviews_scheduled=3`, `profiles_with_cv=2`, `database_reachable=true` |

### Founder visual recovery (dashboard, post re-mount)

| Surface | Count (founder) |
| ------- | ----------------- |
| Feed / jobs | **2501** |
| Matches | **200** |
| Applications | **12** |
| Pipeline | **11** |
| Google Calendar | Events visible again |

*Note:* `mvp-stats.total_applications=17` is an **aggregate across all users**; founder dashboard **12** is per-session scope — both can be true.

## Root cause (founder-reported)

- Wrong backup volume from **2026-05-25** temporarily replaced production data path.
- Original production volume was **unmounted**, not destroyed.
- Recovery = **volume re-mount** (Option B from incident playbook), not accept-stale-data (A) or clone-swap (C).

## Recovery actions taken (founder — no agent execution)

| Step | Action |
| ---- | ------ |
| 1 | Backup incorrect DB state **2026-05-29 14:09 UTC** |
| 2 | Re-mount **`postgres-volume`** → `/var/lib/postgresql/data` |
| 3 | Confirm Postgres online + deploy success |
| 4 | Verify dashboard + calendar in browser |

**Not performed (by design this session):** deploy, migrations, env changes, scrape, apply/auto-apply.

## Post-recovery stabilization (read-only)

**Verdict:** **PASSED** — production recovered after volume re-mount; health surfaces green; no agent deploy/migrations/env/DB mutations.

| Check (agent, read-only) | Result |
| ------------------------ | ------ |
| `GET /api/public-health` | `status=ok`, **`db_ok=true`**, `validated_jobs=652`, `market_coverage_active_validated=2551`, Celery `worker_active=true` |
| `GET /api/v1/health` | `status=ok` |
| `GET /api/v1/public/mvp-stats` | HTTP **200** — `database_reachable=true`, `registered_users=3`, `total_applications=17`, `interviews_scheduled=3` |
| Frontend `/`, `/dashboard` | HTTP **200** |

Founder dashboard (unchanged from recovery): feed **2501**, matches **200**, applications **12**, pipeline **11**, Google Calendar OK. Corpus metric may drift slightly (2551 vs 2501) as scrape/validation runs — not treated as regression.

### Backup retention (until post-mortem closed)

| Backup | UTC | Retain |
| ------ | --- | ------ |
| Wrong-volume source | **2026-05-25 07:33** | **Yes** — do not delete until post-mortem signed off |
| Incorrect-state safety snapshot | **2026-05-29 14:09** | **Yes** — taken before re-mount; keep for forensics |

## Remaining founder actions (optional hardening)

1. Attach Railway **screenshots** (volumes before/after, activity log) to Evidence log.
2. Re-run read-only SQL: `alembic_version`, row counts — confirm `050_stripe_webhook_events` still current.
3. Keep backups **2026-05-25** and **2026-05-29 14:09 UTC** until post-mortem closed (see table above).
4. ~~Execute **O7 staging clone drill** separately~~ — **done 2026-06-01** (staging PASS; separate from this incident).

## Gate / launch verdicts (post-recovery stabilization)

| Surface | Verdict |
| ------- | ------- |
| O7 backup/restore drill | ✅ **PASS** (2026-06-01 staging drill — separate from this incident) |
| Controlled pilot | **GO** — read-only health green; founder dashboard non-zero |
| Investor/demo | **GO** — `mvp-stats` 200; live DB metrics restored (curated demo posture unchanged) |
| Public launch | **NO-GO** — **`S2`** (CSP enforce) and remaining gates; O7 closed 2026-06-01 |

## Evidence log (append-only)

| UTC | Actor | Action | Result |
| --- | ----- | ------ | ------ |
| 2026-05-29 | founder | Wrong volume `postgres-2026-05-25 07:33 UTC` mounted | Dashboard zeros; calendar disconnected |
| 2026-05-29 | agent (read-only) | Pre-recovery curl | `db_ok=true`; **mvp-stats 500** |
| 2026-05-29 14:09 | founder | Backup of incorrect state | Safety snapshot before re-mount |
| 2026-05-29 14:09+ | founder | Re-mount **`postgres-volume`** | Dashboard: feed 2501, matches 200, apps 12, pipeline 11; calendar OK |
| 2026-05-29 | agent (read-only) | Post-recovery curl | `db_ok=true`, `mvp-stats` **200**, `market_coverage_active_validated=2501` |
| 2026-05-29 | agent (read-only) | **Stabilization check** | **PASSED** — `db_ok=true`, `mvp-stats` **200**, corpus **2551**, FE **200**; original `postgres-volume` active |

## Hard bans honoured (agent sessions)

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
