# Market coverage audit & top-200 ranking

Honest inventory of scrape sources vs product copy, and how the dashboard ranked feed is built.

## Market coverage table (2026-05)

| Source | Registry id | Enabled | Frequency | Job count | Validated | Market | Relevance (PL) | Quality | ToS risk | Apply mode | Prod safe | Roadmap |
|--------|-------------|---------|-----------|-------------|-----------|--------|----------------|---------|----------|------------|-----------|---------|
| pracuj.pl | pracuj, pracuj-sales | Yes (Celery scrape-all) | On demand / scheduled | Per scrape batch | On ingest | Poland | High | High | Medium (HTML) | External link | Yes | Live |
| rocketjobs.pl | rocketjobs, rocketjobs-sales, rocketjobs-roles | Yes | On demand | Batch | On ingest | Poland | High | High | Medium | External | Yes | Live |
| justjoin.it | justjoin | Yes | On demand | Batch | On ingest | Poland | High | High | Medium | External | Yes | Live |
| praca.pl | praca | Yes | On demand | Batch | On ingest | Poland | Medium | Medium | Medium | External | Yes | Live |
| LinkedIn | linkedin, linkedin-sales | Yes (conservative) | On demand | Low cap | On ingest | Global / PL | High | Variable | **High** | External | Caution | Live, rate-limited |
| Indeed PL | indeed-pl | Yes | On demand | Batch | On ingest | Poland | Medium | Medium | High | External | Caution | Live |
| Indeed US/global | indeed | Yes | On demand | Batch | On ingest | Global | Low for PL | Medium | High | External | Caution | Live |
| Glassdoor, Monster, ZipRecruiter, etc. | global_boards ids | Yes | On demand | Batch | On ingest | US/EU | Low–medium | Medium | High | External | Caution | Live (best-effort HTML) |
| Greenhouse employers | gh-* (8 tokens) | Yes | On demand | JSON API | On ingest | Global | Medium | High | Low (public API) | External | Yes | Live |
| Lever | — | No scraper | — | — | — | — | — | — | Medium | — | — | **Roadmap** (OAuth stub only) |
| Workday | — | No scraper | — | — | — | — | — | — | High | — | — | **Roadmap** |
| 50 marquee portals (investor UI) | INVESTOR_PORTALS map | Partial | — | — | — | Mixed | — | — | — | — | — | **Aspiration** (~30 registry adapters today) |

**Counts today:** `SCRAPE_REGISTRY` = 30 adapters (9 PL-focused local, 8 Greenhouse, 13 global HTML boards). Investor “50 portals” is a **roadmap/marquee** — not 50 independent production scrapers.

## Dashboard top-200 feed

| Parameter | Value |
|-----------|-------|
| API limit | `limit=200` |
| min_score | `38` (rule-based composite; not 15 noise, not 45-too-strict for wide feed) |
| UI highlight | Top **20** (`TOP_MATCHES_HIGHLIGHT_COUNT`) |
| UI remainder | Up to **180** in “More recommendations” |
| Corpus filter | `is_validated=true` only — **no random unranked job dump** |

## final_score (minimal composite)

Weights in `backend/app/matching/ranking.py`:

| Component | Weight | Notes |
|-----------|--------|-------|
| candidate_fit_score | 0.55 | Matcher v1 / v2 / TF-IDF |
| source_quality_score | 0.12 | Board priors (pracuj, rocketjobs, …) |
| freshness_score | 0.10 | `scraped_at` decay |
| completeness_score | 0.10 | description, requirements, location, salary, url |
| market_priority | 0.13 | PL location → boost PL boards + Greenhouse |
| feedback_adjustment | additive | see below |
| duplicate_penalty | −8 | Reserved; feed dedupe runs after scoring |

Displayed `score` and persisted `JobMatch.score` use **final_score** (0–100).

## Feedback → ranking

| Value | Effect |
|-------|--------|
| not_relevant | Excluded from feed |
| apply_intent | +3 |
| relevant | +2 |
| not_now | −2 |

## Deduplication

1. **Ingest:** `job_storage._soft_dedupe_key` — board + title + company per batch; DB unique `(job_board, external_id)`.
2. **Feed:** `feed_dedupe_key` — normalized title+company+location, else URL path; `dedupe_ranked_jobs` keeps highest score per key.

## Admin metrics

`GET /api/v1/admin/matching-quality` adds: `total_jobs_by_source`, `fresh_jobs_24h`, `fresh_jobs_7d`, `top_200_limit`, `median_top_200_count`, `median_top_200_score`, `duplicate_rate_pct`, `apply_intent_in_top_20`, `apply_intent_in_top_200`.

## UI badges

`direct_employer`, `fresh`, `high_fit`, `remote`, `salary_visible` — i18n under `dashboard.badge*`.
