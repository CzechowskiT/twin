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
| `SCRAPE_BEAT_ENABLED` | `true` | **API + worker** | Autonomous market scrape windows on beat (see below). **Both** services — API exposes truth in `/health?ops=1`; worker runs the schedule. |
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

---

## Regularny rescrape (45 dni) — founder (PL)

### Dlaczego beat musi chodzić

Aktywny feed kandydata = oferty **`is_validated=true`** ze **`scraped_at` w ostatnich 45 dniach** (`JOB_FEED_ACTIVE_DAYS=45`, domyślnie). Matcher i dashboard używają tego samego okna. Bez codziennego rescrape `scraped_at` nie jest odświeżane — oferty **wypadają z feedu**, nawet jeśli nadal istnieją w bazie.

**pracuj.pl** i **rocketjobs.pl** są w batchu **`market-scrape-pl-daily`** (razem z pracuj-cities, pracuj-sales, rocketjobs-sales, rocketjobs-roles, justjoin, praca).

### Harmonogram beat (domyślne UTC)

| Klucz beat | Kiedy (UTC) | Tablice |
|------------|-------------|---------|
| `market-scrape-pl-daily` | 04:00 | pracuj*, rocketjobs*, justjoin, praca |
| `market-scrape-greenhouse-daily` | 05:10 | wszystkie `gh-*` |
| `market-scrape-global-html` | 03:40 | indeed, glassdoor, … (pon + czw) |
| `market-scrape-linkedin-daily` | 06:20 | tylko gdy `LINKEDIN_SCRAPE_ENABLED=true` |

Worker uruchamia beat wbudowany: `celery worker --beat` (`deploy/railway-worker.toml`). Osobny serwis `deploy/railway-beat.toml` tylko gdy **nie** używasz `--beat` na workerze.

### Railway — checklist (prod)

1. **Redis** — plugin w projekcie; `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` = `${{Redis.REDIS_URL}}` na **API** i **worker**.
2. **Serwis worker** — root `backend`, config `deploy/railway-worker.toml`, logi: `celery@… ready` + `Beat: Starting…`.
3. **Zmienne (API + worker):**

| Zmienna | Wartość prod |
|---------|----------------|
| `CELERY_TASK_ALWAYS_EAGER` | `false` |
| `SCRAPE_WORKER_READY` | `true` |
| `SCRAPE_BEAT_ENABLED` | `true` |
| `SCRAPE_JOBS_PER_BOARD` | `200` (opcjonalnie) |
| `SCRAPE_DELAY_BETWEEN_BOARDS_SECONDS` | `1.5` |

4. **Redeploy** worker po zmianie beat env (harmonogram wczytuje się przy starcie procesu).
5. Skrypt (CLI): `./scripts/railway-apply-worker-env.sh` + `./scripts/railway-apply-production-env.sh` (ustawia m.in. `SCRAPE_BEAT_ENABLED=true`).

### Jak zweryfikować, że rescrape działa

| Krok | Endpoint / akcja | Oczekiwany sygnał |
|------|------------------|-------------------|
| 1 | `GET /api/v1/health?ops=1` | `scrape_worker_ready: true`, `scrape_beat_enabled: true`, `market_coverage_feed_stale: false` |
| 2 | `GET /api/v1/health/celery-status` | `worker_active: true`, `beat_schedule_has_market_scrape_pl: true`, `beat_schedule_market_tasks` zawiera `market-scrape-pl-daily` |
| 3 | `GET /api/v1/jobs/feed-stats` (Bearer, zalogowany user) | `last_scrape_run_at` z dzisiaj/wczoraj, `feed_stale: false`, `market_update_label`: `today` / `yesterday` |
| 4 | `GET /api/v1/admin/market-coverage-status` (Bearer ops) | `latest_scrape_run.run_kind: pl_core_daily`, per-source `pracuj` / `rocketjobs` z metrykami `new`/`updated` |
| 5 | `./scripts/verify-prod-health.sh` | `scrape_beat_enabled=True`, `market_coverage_feed_stale=False`, `worker_active=True` |
| 6 | Railway → worker → Logs | po ~04:00 UTC wpisy `pl_core_daily`, brak crash loop |

**Próg „stale”:** brak udanego scrape dłużej niż `max(24h, 45 dni × 12h)` ≈ **22 dni** — wtedy `feed_stale: true` i hint w health.

### Oczekiwany wpływ na licznik feedu

- **Dzień 0 (włączenie beat):** po pierwszym `market-scrape-pl-daily` rośnie `fresh_jobs_24h`, `last_scrape_run_at` się aktualizuje; `active_validated_jobs` może **skoczyć** (re-seen oferty wracają do okna 45 dni).
- **Tydzień 1:** licznik **stabilizuje się** — codzienny upsert odświeża `scraped_at` na istniejących ofertach + dodaje nowe.
- **Bez beat:** spadek ~liniowy — oferty starsze niż 45 dni z `scraped_at` znikają z feedu mimo że są w DB; po ~6 tygodniach bez rescrape większość PL core może wypaść z aktywnego okna.

Ręczny scrape (`POST /api/v1/jobs/scrape/*`) jest **wyłączony** domyślnie (`SCRAPE_USER_TRIGGER_ENABLED=false`). Awaryjnie: `./scripts/scrape-market-coverage.sh persist` lokalnie lub tymczasowo włączyć user trigger — nie zastępuje beat w prod.
