# Market coverage — 10k active validated jobs

Honest plan for reaching ~10,000 **active** (`is_validated` + `scraped_at` within **45 days**) listings in the candidate feed.

## Phase 1 audit (2026-05-25)

### 1. SCRAPE_REGISTRY — adapter count

**34** real adapters in `backend/app/scrapers/registry.py`:

| Group | Count | Board ids |
|-------|------:|-----------|
| PL-local | 10 | `pracuj`, `pracuj-cities`, `pracuj-sales`, `rocketjobs`, `rocketjobs-sales`, `rocketjobs-roles`, `justjoin`, `praca`, `linkedin`, `linkedin-sales` |
| Greenhouse JSON | 11 | `gh-stripe`, `gh-databricks`, `gh-airbnb`, `gh-duolingo`, `gh-cloudflare`, `gh-robinhood`, `gh-figma`, `gh-anthropic`, `gh-gitlab`, `gh-shopify`, `gh-notion` |
| Global HTML | 13 | `indeed`, `indeed-pl`, `glassdoor`, `monster`, `ziprecruiter`, `careerbuilder`, `simplyhired`, `jooble`, `reed`, `stepstone`, `seek`, `google-jobs`, `snagajob` |

**Not in registry:** NoFluffJobs, Wellfound, 37+ investor “W PLANIE” portals (`frontend/src/lib/investor-roadmap.ts` — roadmap marquee, not production scrapers).

### 2. Per-source matrix

| id | Region | Prod safe | Auth | ToS / robots risk | Typical frequency | Volume note |
|----|--------|-----------|------|-------------------|-------------------|-------------|
| pracuj, pracuj-cities, pracuj-sales | PL | Yes | None | Medium HTML | Beat / on demand | **High** — pagination to 35 pages, 8 cities, multi-keyword sales |
| rocketjobs ×3 | PL | Yes | None | Medium | Beat / on demand | **High** — 3 keyword profiles |
| justjoin | PL | Yes | None | Low (public JSON) | Beat / on demand | **High** — up to **3000** offers/run from `/api/offers` |
| praca | PL | Yes | None | Medium | On demand | Medium |
| linkedin ×2 | Global | Caution | None (public) | **High** — robots often block | Low cap **25**/run | Low yield |
| gh-* (11) | Global | Yes | None (public API) | Low | On demand | **Medium** — up to 200/board (Stripe, GitLab, Shopify, …) |
| indeed, glassdoor, … (13) | Mixed | Caution | None | High anti-bot | Best-effort | **Volatile** — many runs return 0 |

**Compliance:** `scrape_respect_robots_txt=true` by default; no CAPTCHA bypass, no LinkedIn login automation.

### 3. Which sources give most volume

1. **PL trio:** pracuj + rocketjobs variants + justjoin (repeatable, highest sustained upserts).
2. **Greenhouse:** 8 employers × up to 200 jobs each ≈ 1.6k theoretical per full run if all boards full.
3. **Global HTML:** bonus when smoke tests pass; not dependable for 10k alone.

**Single scrape-all ceiling (theory):** 34 boards × **200** cap + justjoin up to **3000** ≈ **~9–10k** raw rows/run — minus duplicates, validation drops, and zero-yield global HTML boards.

### 4. Can 10k be reached?

| Path | Verdict |
|------|---------|
| Code + one local run only | **No** — corpus needs **days/weeks** of prod Celery `scrape-all` + beat |
| Prod ops (worker + beat + rescrape) | **Yes** — if PL sources run daily and `upsert_jobs` refreshes `scraped_at` so rows stay inside 45-day window |
| New adapters / deeper pagination | **Accelerates** — still requires running scrapes in prod/staging with `DATABASE_URL` |

### 5. `match_jobs_scan_limit` vs 10k corpus

- Default in repo: **`15000`** (`MATCH_JOBS_SCAN_LIMIT` env).
- Matcher uses **`apply_active_feed_filter`** — same 45-day window as dashboard; scan is not “all-time validated”.
- Top **200** rail unchanged: `find_top_matches` → score → `dedupe_ranked_jobs` → `limit=200`, `min_score=38` (quality gate).

### 6. Why dashboard showed ~1727

| Counter | What it counted |
|---------|-----------------|
| **Before** | `GET /api/v1/jobs/` **`total`** = all `is_validated` rows (no freshness window) — stale listings inflated or confused users |
| **Investor mvp-stats** | Narrower board subset (~637 in some envs) |
| **After sprint** | **`active_feed_only=true`** + **`active_within_days=45`** — only validated listings **rescraped within 45 days**; number may **drop** until beat rescrapes |

### SQL templates (prod / local with `DATABASE_URL`)

```sql
-- All-time validated
SELECT COUNT(*) FROM jobs WHERE is_validated = true;

-- Active feed (align with job_feed_active_days=45)
SELECT COUNT(*) FROM jobs
 WHERE is_validated = true AND scraped_at >= NOW() - INTERVAL '45 days';

-- By board (active)
SELECT job_board, COUNT(*) FROM jobs
 WHERE is_validated = true AND scraped_at >= NOW() - INTERVAL '45 days'
 GROUP BY 1 ORDER BY 2 DESC;

-- Freshness
SELECT COUNT(*) FROM jobs WHERE is_validated = true AND scraped_at >= NOW() - INTERVAL '24 hours';
SELECT COUNT(*) FROM jobs WHERE is_validated = true AND scraped_at >= NOW() - INTERVAL '7 days';
```

### Roadmap UI vs registry

- **50 global portals “W PLANIE”** — product roadmap (`investor-roadmap.ts`), not 50 scrapers.
- **Stripe, Duolingo, … “WDROŻONE”** — matches **`gh-*`** Greenhouse adapters in `SCRAPE_REGISTRY` (public JSON, no login).

---

## Autonomous daily engine (2026-05-25)

When `SCRAPE_BEAT_ENABLED=true` on the **Celery beat** process:

| Beat key | UTC (default) | Boards |
|----------|---------------|--------|
| `market-scrape-pl-daily` | 04:00 | pracuj, pracuj-cities, pracuj-sales, rocketjobs, rocketjobs-roles, justjoin, praca |
| `market-scrape-greenhouse-daily` | 05:10 | all `gh-*` Greenhouse adapters |
| `market-scrape-global-html` | 03:40 Mon+Thu | indeed, glassdoor, … (13 global HTML) |
| `market-scrape-linkedin-daily` | 06:20 | `linkedin` only, max **25**/run, skip on robots block |

- **Isolation:** scrape tasks only ingest jobs — they do **not** call auto-apply or nightly sweep.
- **Telemetry:** Redis keys `twin:scrape_run:latest` + history (no migration). Admin: `GET /api/v1/admin/market-coverage-status`.
- **Dashboard:** `GET /api/v1/jobs/feed-stats` adds `last_scrape_run_at`, `feed_stale`, `market_update_label`. Manual scrape panel is **ops-only** (`scrape_ops_elevated`).

---

## Phase 2 shipped (P0, safe)

1. **Active feed** — `job_feed_active_days=45`; API default `active_feed_only=true`; matcher scan same window.
2. **Upsert refresh** — Re-seen `(job_board, external_id)` updates `scraped_at` + `is_validated`.
3. **Scrape depth** — `scrape_jobs_per_board` default **200**; `pracuj-cities` (8 PL locations); pracuj up to **35** pages; justjoin up to **3000**; LinkedIn max **25**/run; +3 Greenhouse boards.
4. **`GET /api/v1/jobs/feed-stats`** — lightweight `active_validated_jobs` for ops/dashboard checks.
5. **Matcher scan** — `match_jobs_scan_limit` default **15000**.
6. **Ops** — `scripts/scrape-market-coverage.sh` → `backend/scripts/scrape_market_coverage.py` (`dry-run` / `persist`, `--boards`, inter-board delay).
7. **Admin KPIs** — `GET /api/v1/admin/matching-quality` + `build_market_coverage_report`: `active_validated_jobs`, `fresh_jobs_24h`/`7d`, `registry_board_ids`, scrape caps.
8. **Dashboard** — `frontend/src/lib/jobs.ts` sends `active_feed_only` + 45-day window; rail **W feedzie** = API `total`.
9. **Dedupe / not_relevant** — `feed_dedupe_key` + `excluded_feed_dedupe_keys` intact (commit `31e004f`).

**Out of scope (per sprint constraints):** P0 submission truth/048, auto-apply, application statuses, prod deploy.

---

## How to run scrape (no prod deploy without approval)

```bash
# Dry-run (no DB writes), per-board JSON logs
./scripts/scrape-market-coverage.sh dry-run

# Persist subset locally
SCRAPE_BOARDS=pracuj,justjoin,rocketjobs ./scripts/scrape-market-coverage.sh persist

# API (authenticated): POST /api/v1/jobs/scrape/all
```

Prod path: `SCRAPE_WORKER_READY=true`, Redis, `SCRAPE_BEAT_ENABLED=true`, tune `SCRAPE_JOBS_PER_BOARD` — see `docs/SCRAPE_OPS.md`.

**Autonomous beat (shipped):** four Celery tasks — PL core daily, Greenhouse daily, global HTML Mon/Thu, LinkedIn low cap (skip on robots block). Telemetry: Redis `scrape_run_tracking` + `GET /api/v1/admin/market-coverage-status`. Dashboard shows “updated today/yesterday” via `GET /api/v1/jobs/feed-stats` (`market_update_label`).

---

## Verify 10k after deploy

1. `GET /api/v1/admin/matching-quality` → `active_validated_jobs` ≥ 10000  
2. Dashboard **W feedzie** matches that counter (default filters, no extra board filter)  
3. `median_top_200_count` ≈ 200 for sample candidates when corpus is large  
4. Weekly `scrape-all` so `scraped_at` stays inside 45-day window  

---

## Raport końcowy (PL) — 15 punktów

1. **Czy 10k jest osiągalne?** Tak **operacyjnie** (Celery beat + worker, codzienne PL + Greenhouse), nie jednym lokalnym skryptem. Sam kod daje sufit ~6k/ przebieg scrape-all.
2. **Aktualne liczby w prod** — Agent nie ma `DATABASE_URL` prod; użyj SQL powyżej lub `GET /admin/matching-quality`. Lokalnie testy używają SQLite — nie są licznikiem prod.
3. **Źródła** — 34 adaptery (10 PL, 11 Greenhouse, 13 global HTML); największy wolumen: justjoin, pracuj (+ cities/sales), rocketjobs.
4. **Co zaimplementowano** — `pracuj-cities`, justjoin 3k cap, +3 Greenhouse, `feed-stats`, aktywny feed 45 dni, scan 15k, skrypt coverage z delay, testy feed-stats/scan.
5. **Jak odpalić scrape** — `./scripts/scrape-market-coverage.sh dry-run|persist` lub POST `scrape/all` + prod beat.
6. **Fix licznika dashboard** — `total` z API z `active_feed_only=true` (nie all-time validated); **W feedzie** w bocznym railu.
7. **Top 200 nadal ranking?** Tak — `find_top_matches` + `dedupe_ranked_jobs` + limit 200 + min_score 38; skan na aktywnym korpusie.
8. **Dedupe** — `feed_dedupe_key` (tytuł+firma+lokalizacja / URL); batch soft-dedupe przy zapisie; `not_relevant` ukrywa rodzeństwo po kluczu.
9. **Metryki ops** — `matching-quality`: `active_validated_jobs`, `fresh_jobs_24h`, `fresh_jobs_7d`, `total_jobs_by_source`, `active_jobs_by_source`, `match_jobs_scan_limit`, `registry_adapter_count`.
10. **Testy** — `test_market_coverage.py`, `test_match_jobs_scan_limit.py`, `test_job_feed_stats.py`, scrape-all — **11+ passed** w pakiecie coverage.
11. **Frontend build** — `npm run build` OK.
12. **Commit** — Branch `cursor/phase1-monorepo-scaffold`; config caps 200/15000 + doc + UI cel 10k.
13. **Push** — Po commicie na `origin/cursor/phase1-monorepo-scaffold`.
14. **Safe deploy?** **Nie deployowano prod** (zgodnie z constraint). Deploy wymaga Railway worker + beat + env — bez zmian w P0 submission/auto-apply.
15. **Weryfikacja 10k po deploy** — Admin KPI ≥ 10k active; dashboard zgodny; utrzymać beat; po wdrożeniu liczba może chwilowo spaść dopóki rescrape nie odświeży `scraped_at`.
