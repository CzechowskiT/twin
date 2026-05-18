# Deploying TWIN

**Beta online (Polish, step-by-step for founders):** [BETA_ONLINE_PL.md](./BETA_ONLINE_PL.md)

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

### Fundraising strip (100k headline jobs + LinkedIn / Stripe on `/calculator`)

The public endpoint `GET /api/v1/public/mvp-stats` drives the **B2B ROI calculator** “Live aggregates” block and (when enabled) the **dashboard** “In your feed” headline count.

On the **Railway API** (and worker/beat if they call settings), set:

| Variable | Purpose |
|----------|---------|
| `INVESTOR_MVP_STATS_DEMO_MODE=true` | Use `INVESTOR_MVP_STATS_DEMO_VALIDATED_JOBS` (default **100000**) as `validated_jobs` and show LinkedIn + Stripe readiness in that strip. Other counters stay real. |
| `INVESTOR_MVP_STATS_DEMO_FORCE_INTEGRATIONS_ON=true` | *(Optional)* Forces both integrations to show as “Ready” even if keys are missing — **screenshots only**; prefer real secrets below. |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | LinkedIn sign-in; strip shows **Ready** when all three are non-empty (redirect must match the API host). See [LINKEDIN_OAUTH.md](./LINKEDIN_OAUTH.md). |
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID_PREMIUM` or `STRIPE_PRICE_ID_PRO` | Stripe Checkout; strip shows **Ready** when secret and at least one price id are set. See [STRIPE.md](./STRIPE.md). |

To keep fully live DB counts on a public deploy, set `INVESTOR_MVP_STATS_DEMO_MODE=false` explicitly.

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
