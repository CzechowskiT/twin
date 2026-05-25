# Market coverage — 10k active validated jobs

Honest plan for reaching ~10,000 **active** (`is_validated` + scraped within 45 days) listings in the candidate feed.

## Phase 1 audit summary (2026-05-25)

| Item | Finding |
|------|---------|
| Registry adapters | **30** (`SCRAPE_REGISTRY`): 9 PL-local, 8 Greenhouse JSON, 13 global HTML |
| Theoretical single run | 30 × up to **200** rows/board ≈ **6,000** raw fetches (many boards return 0 due to bots/login) |
| Achievable 10k with code only? | **No** — needs **sustained prod Celery scrape-all** (beat + worker) over days/weeks |
| Achievable 10k with ops? | **Yes**, if PL sources (pracuj, rocketjobs, justjoin) + Greenhouse run daily and upserts refresh `scraped_at` |
| Dashboard ~1727 | `GET /api/v1/jobs/` **`total`** = all validated rows (no active window). Investor `mvp-stats` uses narrower **6 boards** (~637 historically). |
| After this sprint | Dashboard **W feedzie** uses **`active_feed_only=true`** (45-day window) — number drops stale rows until rescrape |

### Adapter matrix (registry)

| id | Country | Prod safe | Auth | ToS risk | Frequency |
|----|---------|-----------|------|----------|-----------|
| pracuj, pracuj-sales | PL | Yes | None | Medium HTML | On demand / beat |
| rocketjobs ×3 | PL | Yes | None | Medium | On demand / beat |
| justjoin | PL | Yes | None | Low (public JSON) | On demand / beat |
| praca | PL | Yes | None | Medium | On demand / beat |
| linkedin ×2 | Global | Caution | None (public) | **High** (robots) | Low cap **25**/run |
| gh-* (8) | Global | Yes | None (public API) | Low | On demand / beat |
| indeed, indeed-pl, glassdoor, … (13) | Mixed | Caution | None | High (anti-bot) | Best-effort |
| NoFluffJobs | — | **No adapter** | — | — | Roadmap only |

### SQL for prod counts (when `DATABASE_URL` set)

```sql
SELECT COUNT(*) FROM jobs WHERE is_validated = true;
SELECT COUNT(*) FROM jobs WHERE is_validated = true AND scraped_at >= NOW() - INTERVAL '45 days';
SELECT job_board, COUNT(*) FROM jobs WHERE is_validated = true GROUP BY 1 ORDER BY 2 DESC;
SELECT COUNT(*) FROM jobs WHERE is_validated = true AND scraped_at >= NOW() - INTERVAL '24 hours';
SELECT COUNT(*) FROM jobs WHERE is_validated = true AND scraped_at >= NOW() - INTERVAL '7 days';
```

## Phase 2–10 shipped in repo

1. **Active feed** — `job_feed_active_days=45`; `GET /jobs?active_feed_only=true`; matcher scan uses same window.
2. **Upsert refresh** — Re-seen `(job_board, external_id)` updates `scraped_at` (keeps corpus active after rescrape).
3. **Scrape caps** — `scrape_jobs_per_board` default **120**, hard max **200**; pracuj pagination up to **35** pages; LinkedIn capped at **25**.
4. **Matcher scan** — `match_jobs_scan_limit` default **8000** (env `MATCH_JOBS_SCAN_LIMIT`).
5. **Ops script** — `scripts/scrape-market-coverage.sh` → `backend/scripts/scrape_market_coverage.py` (`--dry-run` / `--persist`).
6. **Admin KPIs** — `GET /api/v1/admin/matching-quality` includes `active_validated_jobs`, `per_user_top_200_sample`, coverage by source.
7. **Dashboard** — Frontend sends `active_feed_only` + 45-day window for listing totals (**W feedzie**).
8. **Strong matches** — Still `limit=200`, `min_score=38`; rail shows visible count ≥38 after client filter.

## How to run scrape (no prod deploy without approval)

```bash
# Dry-run (no DB writes)
./scripts/scrape-market-coverage.sh dry-run

# Persist subset locally
SCRAPE_BOARDS=pracuj,justjoin,rocketjobs ./scripts/scrape-market-coverage.sh persist

# Full registry via API (logged-in user + Celery or API fallback)
# POST /api/v1/jobs/scrape/all
```

Prod: enable `SCRAPE_WORKER_READY`, Redis, `SCRAPE_BEAT_ENABLED=true`, tune `SCRAPE_JOBS_PER_BOARD=150` on worker — see `docs/SCRAPE_OPS.md`.

## Verify 10k after deploy

1. `GET /api/v1/admin/matching-quality` → `active_validated_jobs` ≥ 10000
2. Dashboard rail **W feedzie** matches that counter (with default filters)
3. `median_top_200_count` near 200 for sample candidates when corpus is large
4. Re-run scrape-all weekly so `scraped_at` stays inside 45-day window
