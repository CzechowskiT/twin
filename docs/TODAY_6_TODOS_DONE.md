# Today’s 6 to-dos — done (2026-05-19)

| # | Task | Status | Proof |
|---|------|--------|--------|
| 1 | Commit header refactor + push | Done | `23be2fe` fix(header): SaaS layout |
| 2 | Interview reminder beat + placement retention emails | Done | `5728aa1` + `backend/app/tasks/reminder_tasks.py`, beat in `celery_app.py` |
| 3 | Dashboard WebCal one-click from calendar strip | Done | `4ec621b` — `mintDashboardWebcalLink()` on `/dashboard`, sessionStorage persist |
| 4 | FE empty state for zero jobs on dashboard feed | Done | `4ec621b` — `jobsEmptyZero*` when `jobs.total === 0` |
| 5 | Public health/database on marketing status + scrape ops docs | Done | `/status` + `database_reachable` on mvp-stats (`4ec621b`), `docs/SCRAPE_OPS.md` |
| 6 | Tests, build, commit push merge scaffold | Done | pytest + `npm run build` green; branch `cursor/phase1-monorepo-scaffold` pushed (`665bd9c`+) |

## Verify locally

```bash
cd backend && python3 -m pytest tests/test_public_mvp_stats.py tests/test_health_features.py tests/test_celery_beat_schedule.py tests/test_reminder_tasks.py -q
cd frontend && npm run build
```

## Verify production (after env apply)

```bash
curl -sS "https://twin-sooty.vercel.app/status"
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats"
./scripts/deploy-all.sh   # after railway + vercel login
```

## Also shipped same day (beyond the 6)

- Logo marquee on all pages (`site-top-marquee.tsx`)
- Partner keys, recruiter inbox, acceptance queue, placement ops, ATS webhooks
- See `docs/NEXT_10_STEPS.md` and `docs/AGENT_SHIPPING_LOG.md`
