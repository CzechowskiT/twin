# Railway — Celery worker + beat (produkcja)

Scraping i zadania w tle **nie działają na samym API** — potrzebujesz osobnego serwisu **worker** (i opcjonalnie **beat**).

## 1. Serwis `twin-worker`

1. Railway → projekt **responsible-success** → **+ New** → **GitHub Repo** → ten sam repo co API.
2. **Settings → Root Directory:** `backend`
3. **Settings → Config file:** `deploy/railway-worker.toml`
4. **Variables** — skopiuj z serwisu **twin** (API):
   - `DATABASE_URL` (reference Postgres)
   - `CELERY_BROKER_URL` = `${{Redis.REDIS_URL}}`
   - `CELERY_RESULT_BACKEND` = `${{Redis.REDIS_URL}}`
   - `SECRET_KEY`, `ENVIRONMENT=production`, `ANTHROPIC_API_KEY`
   - `AUTO_APPLY_HEADLESS=true`
5. **Networking** — worker **nie potrzebuje** publicznej domeny.
6. **Deploy**.

## 2. Beat (wbudowany w worker)

`deploy/railway-worker.toml` uruchamia **`worker --beat`** (jeden serwis zamiast osobnego `twin-beat`).

Na API i worker ustaw m.in.:

- `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` = `${{Redis.REDIS_URL}}`
- `CELERY_TASK_ALWAYS_EAGER=false`
- `SCRAPE_WORKER_READY=true`
- `SCRAPE_BEAT_ENABLED=true`

Opcjonalnie osobny serwis: **Config** `deploy/railway-beat.toml` (tylko gdy nie używasz `--beat` na workerze).

## 3. Weryfikacja

- Railway → **twin-worker** → Logs: `celery@... ready`
- Dashboard → **Twin for your job** — po scrape liczba ofert rośnie (nie tylko przy ręcznym odświeżeniu).

## 4. Placement retention (MVP)

Task `app.tasks.placement_tasks.placement_retention_sweep` runs daily on **twin-beat** (06:15 Europe/Warsaw by default). Disable with `PLACEMENT_RETENTION_BEAT_ENABLED=false`.

When API runs with `CELERY_TASK_ALWAYS_EAGER=false`, set **`SCRAPE_WORKER_READY=true`** on the API after the worker service is live so the dashboard scrape button stays enabled for ops users.
