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

## 2. Serwis `twin-beat` (opcjonalnie)

Tylko jeśli `SCRAPE_BEAT_ENABLED=true` na API/worker.

1. Trzeci serwis z repo, **Root:** `backend`, **Config:** `deploy/railway-beat.toml`
2. Te same `CELERY_*` + Redis co worker.
3. Start: `celery -A app.tasks.celery_app beat --loglevel=info`

## 3. Weryfikacja

- Railway → **twin-worker** → Logs: `celery@... ready`
- Dashboard → **Twin for your job** — po scrape liczba ofert rośnie (nie tylko przy ręcznym odświeżeniu).

## 4. Placement retention (MVP)

Task `app.tasks.placement_tasks.placement_retention_sweep` jest zarejestrowany — wywołaj ręcznie z Railway shell lub dodaj beat entry w kolejnej fazie.
