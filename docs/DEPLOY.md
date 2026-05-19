# Deploying TWIN

**Beta online (Polish, step-by-step for founders):** [BETA_ONLINE_PL.md](./BETA_ONLINE_PL.md)  
**Scalony audyt techniczny (backlog):** [reviews/MERGED-AUDIT-2026-05-19.md](./reviews/MERGED-AUDIT-2026-05-19.md)

## Deploy truth (single source — update when you change hosts)

| What | Expected value |
|------|----------------|
| **GitHub repo (developers)** | `CzechowskiT/twin` |
| **Production git branch** | `cursor/phase1-monorepo-scaffold` (lub branch jawnie wybrany w Vercel → Production) |
| **Vercel project** | Root directory: `frontend/` |
| **Vercel Production URL** | `https://twin-sooty.vercel.app` (lub Twoja domena) |
| **Railway API** | Root: `backend/` — ten sam branch co frontend |
| **Verify deploy SHA** | Vercel → Deployments → commit **musi** = `git rev-parse origin/<branch>` |

**Common failure:** Vercel podpięty do **innego** repo (np. `CzechowskiD/twin` → 404 na GitHub) albo innej gałęzi — wtedy poprawki w `CzechowskiT` **nie trafiają** na produkcję.

### Sprint Day 1 — deploy drift + secrets (TODAY)

- [ ] Vercel → Settings → Git → repository = **`CzechowskiT/twin`**
- [ ] Environments → Production → branch = **`cursor/phase1-monorepo-scaffold`** (lub świadomie inna, zapisana w tabeli powyżej)
- [ ] Redeploy Production; porównaj **commit SHA** z `git fetch && git rev-parse origin/cursor/phase1-monorepo-scaffold`
- [ ] Railway: `SECRET_KEY` ustawiony (≥32 znaków, **nie** `dev-only-change-me`); `ENVIRONMENT=production`
- [ ] Railway: `REDIS_URL` + worker + beat (unikaj samego API z eager Celery na skalę)
- [ ] Smoke: `curl -s https://twin-sooty.vercel.app/api/v1/health` → `status: ok`; opcjonalnie `?db=true` na staging
- [ ] Smoke UI: DevTools na `/dashboard/billing` — klasa `twin-billing-surface` po deployu z fixem billing

```bash
# Lokalnie: oczekiwany commit na branchu produkcyjnym
git fetch origin cursor/phase1-monorepo-scaffold
git rev-parse --short origin/cursor/phase1-monorepo-scaffold

# Produkcja (proxy Vercel → Railway API)
curl -s "https://twin-sooty.vercel.app/api/v1/health" | jq .
# Jeśli API ma GIT_COMMIT_SHA / RAILWAY_GIT_COMMIT_SHA w env, health zwróci pole git_commit
```

Skrypt pomocniczy: `scripts/verify-deploy.sh` (read-only checks).

## Option 1: Docker Compose (VPS / local server)

1. Copy `.env.example` to `.env` and set:
   - `SECRET_KEY` (long random string)
   - `POSTGRES_PASSWORD`
   - `NEXT_PUBLIC_API_URL` (public API URL, e.g. `https://api.yourdomain.com`)
   - `CORS_ORIGINS` (frontend URL, e.g. `https://app.yourdomain.com`)
   - `ANTHROPIC_API_KEY` (optional, for CV parsing)
   - LinkedIn OAuth: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `FRONTEND_URL` (see [LINKEDIN_OAUTH.md](./LINKEDIN_OAUTH.md))

2. Start the stack:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

3. Run migrations once:

```bash
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

4. Open the frontend at `http://localhost:3000` (or your mapped port).

Services: **frontend** :3000, **api** :8000, Postgres, Redis, Celery worker + beat.

## Option 2: Vercel + Railway (recommended beta)

| Piece | Host | Config |
|-------|------|--------|
| Frontend | [Vercel](https://vercel.com) — root `frontend/` | `NEXT_PUBLIC_API_URL` → Railway API URL |
| API | Railway — `deploy/railway-api.toml` | Auto-migrate on start; health `/api/v1/health` |
| Worker | Railway — `deploy/railway-worker.toml` | Same env as API |
| Beat | Railway — `deploy/railway-beat.toml` | Same env as API |
| Postgres | Railway plugin | Reference `DATABASE_URL` on API/worker |
| Redis | Railway plugin | `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` |

Env template: `.env.production.example` in repo root.

`DATABASE_URL` from Railway (`postgres://`) is normalized to `postgresql+psycopg://` in `app/config.py`.

### Public investor metrics (`GET /api/v1/public/mvp-stats`)

Counters are **read from the live database** (validated job rows, users, applications, etc.). `linkedin_oauth_configured` and `stripe_checkout_ready` reflect whether the API host has the corresponding env vars wired — not marketing overrides.

To grow the **validated job corpus** toward six figures, use sustained ingestion: Celery worker + beat, higher per-board caps (`SCRAPE_JOBS_PER_BOARD`), and (when appropriate) bulk import — see comments in `app/config.py` around scraping and `docs/DEPLOY.md` Option 2 services.

LinkedIn: [LINKEDIN_OAUTH.md](./LINKEDIN_OAUTH.md). Stripe: [STRIPE.md](./STRIPE.md).

## Option 3: Railway / Render (manual commands)

| Service | Command | Notes |
|---------|---------|--------|
| Postgres | managed plugin | Copy `DATABASE_URL` |
| Redis | managed plugin | Copy `REDIS_URL` |
| API | `/app/scripts/start-api.sh` (Docker) | Migrations + uvicorn on `$PORT` |
| Worker | `celery -A app.tasks.celery_app worker` | Same env as API |
| Beat | `celery -A app.tasks.celery_app beat` | Same env as API |
| Frontend | Vercel or `npm run build && npm start` | Set `NEXT_PUBLIC_API_URL` |

## Health check

- API: `GET /api/v1/health`
- Docs: `/docs`

## GDPR

Use HTTPS in production. Update `CORS_ORIGINS` to your real frontend origin only.
