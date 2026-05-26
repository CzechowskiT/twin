# Scrape operations (production)

**Product default:** listings refresh via **Celery beat** (`market-scrape-pl-daily`, `market-scrape-greenhouse-daily`, `market-scrape-global-html`). Manual `POST /api/v1/jobs/scrape/*` is **off** unless `SCRAPE_USER_TRIGGER_ENABLED=true` (and dashboard `NEXT_PUBLIC_SHOW_SCRAPE=true`).

**LinkedIn jobs:** **disabled by default** (`LINKEDIN_SCRAPE_ENABLED=false`). LinkedIn’s robots.txt disallows generic crawlers with `SCRAPE_RESPECT_ROBOTS_TXT=true` (default). Do **not** bypass CAPTCHA, auth walls, or anti-bot controls. Permitted paths: **official LinkedIn / hiring APIs** you are entitled to use, **written crawl permission**, or **manual** job entry — not Playwright stealth. To run the optional beat task: `LINKEDIN_SCRAPE_ENABLED=true` **and** explicit ops sign-off (or include `linkedin` in `SCRAPE_ENABLED_BOARD_IDS`).

The optional allowlist tags **ops / elevated** accounts on `/auth/me` for monitoring only — not a scrape gate.

## Railway variables (founder checklist)

Set on the **API** service unless noted.

| Variable | Example | Service | Notes |
|----------|---------|---------|--------|
| `SCRAPE_OPS_EMAILS` | `you@company.com,ops@company.com` | API | Optional — flags ops accounts on `/auth/me`. |
| `SCRAPE_OPS_USER_IDS` | `1,42` | API | Alternative to emails; ids from `GET /api/v1/auth/me`. |
| `SCRAPE_WORKER_READY` | `true` | API | Set after a Celery worker is live (`false` until then). |
| `CELERY_TASK_ALWAYS_EAGER` | `false` | API | `true` only for solo API (no worker). |
| `CELERY_BROKER_URL` | `${{Redis.REDIS_URL}}` | API + **worker** | Redis plugin reference on Railway. |
| `CELERY_RESULT_BACKEND` | `${{Redis.REDIS_URL}}` | API + **worker** | Same Redis as broker. |
| `SCRAPE_WORKER_READY` | `true` | **worker** | Mirror API when worker service exists. |
| `SCRAPE_BEAT_ENABLED` | `true` | **worker** | Autonomous market scrape windows on beat (see below). |
| `SCRAPE_BEAT_PL_HOUR_UTC` | `4` | **worker** | PL core boards (~06:00 Warsaw winter). |
| `SCRAPE_BEAT_GREENHOUSE_HOUR_UTC` | `5` | **worker** | Greenhouse JSON boards. |
| `SCRAPE_BEAT_GLOBAL_HOUR_UTC` | `3` | **worker** | Global HTML (Mon + Thu). |
| `LINKEDIN_SCRAPE_ENABLED` | `false` | API + worker | When `true`, schedules `market-scrape-linkedin-daily` (max 25/run). |
| `SCRAPE_BEAT_LINKEDIN_HOUR_UTC` | `6` | **worker** | Only used when `LINKEDIN_SCRAPE_ENABLED=true`. |
| `SCRAPE_BEAT_LEGACY_SCRAPE_ALL` | `false` | **worker** | Optional legacy single `scrape-all` task. |
| `LINKEDIN_SCRAPE_MAX_PER_RUN` | `25` | API + worker | Hard cap per LinkedIn beat run. |
| `SCRAPE_JOBS_PER_BOARD` | `200` | API + worker | Per-board fetch cap. |
| `SCRAPE_DELAY_BETWEEN_BOARDS_SECONDS` | `1.5` | API + worker | Serial pause between boards. |
| `SCRAPE_RESPECT_ROBOTS_TXT` | `true` | API + worker | Honour robots.txt (LinkedIn often blocks). |
| `MARKET_COVERAGE_TARGET_JOBS` | `10000` | API | Ops KPI target (`active_validated_jobs`). |
| `SCRAPE_USER_TRIGGER_ENABLED` | `false` | API | Dashboard/API manual scrape-all. |

After changing API vars, redeploy API. After worker vars, redeploy **twin-worker** (see `deploy/railway-worker.toml`).

## Optional ops allowlist

Set **one** of (only if you want to flag specific operator accounts):

| Variable | Example | Notes |
|----------|---------|--------|
| `SCRAPE_OPS_EMAILS` | `you@company.com,ops@company.com` | Comma-separated account emails. |
| `SCRAPE_OPS_USER_IDS` | `1,42` | Numeric `users.id` from `GET /api/v1/auth/me` |

Also required for hosted scrape (non-eager):

| Variable | Purpose |
|----------|---------|
| `SCRAPE_WORKER_READY` | `true` when a Celery worker service exists |
| `SCRAPE_BEAT_ENABLED` | Autonomous daily PL / Greenhouse / global / LinkedIn beat tasks |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis |

## Verify

1. Log in with core consents completed at registration.
2. `GET /api/v1/auth/me` → `can_trigger_scrape: true` only when `SCRAPE_USER_TRIGGER_ENABLED=true`, consents, and worker ready.
3. `GET /api/v1/health?ops=1` → `scrape_worker_ready`, `scrape_beat_enabled`, `validated_jobs`, `market_coverage_ops_hint`.
4. `GET /api/v1/admin/market-coverage-status` (Bearer ops token) → last scrape run, per-source outcomes, `progress_to_10k_pct`.
4. Public dashboard: [https://your-frontend/status](https://your-frontend/status) — **Validated jobs** counter and **Scrape worker** row.
5. `./scripts/verify-prod-health.sh` — CI smoke on push to `cursor/phase1-monorepo-scaffold`. Celery worker check **retries up to 5×** (12 s apart) so a Railway redeploy restart does not flake the job; a genuinely stopped worker still fails after ~60 s.

### CI `prod-health` vs worker restart

Push to scaffold triggers **both** GitHub Actions `prod-health` and Railway auto-deploy. During worker restart (`celery worker --beat`), `GET /api/v1/health/celery-status` may briefly return `worker_active: false`, `mode: no_workers` — that is an honest signal, not a false negative. If CI fails with that message **outside** a deploy window, check Railway → worker service logs (`celery@… ready`) and that API + worker share the same `CELERY_BROKER_URL` / `REDIS_URL`.

Allowlisted emails additionally get `scrape_ops_elevated: true` when `SCRAPE_OPS_*` is set.
