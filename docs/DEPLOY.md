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

### Public investor metrics (`GET /api/v1/public/mvp-stats`)

Counters are **read from the live database** (validated job rows, users, applications, etc.). `validated_jobs` and `validated_jobs_by_board` use the same traction-scope board list (Poland-first adapters + LinkedIn); per-board counts sum to the headline total. `linkedin_oauth_configured` reflects LinkedIn OIDC env wiring. `stripe_checkout_ready` is true only when **`STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID_PREMIUM`** are set (same gate as Checkout — Pro alone is not enough).

To grow the **validated job corpus** toward six figures, use sustained ingestion: Celery worker + beat, higher per-board caps (`SCRAPE_JOBS_PER_BOARD`), and (when appropriate) bulk import — see comments in `app/config.py` around scraping and `docs/DEPLOY.md` Option 2 services.

### Match scoring (optional)

Candidate→job ranking defaults to rule-based v1. Optional layers (field names in `app/config.py`):

- `MATCH_SCORING_V2=true` — small salary-band overlap bonus on top of v1.
- `MATCHING_V2_TFIDF=true` — bounded TF–IDF cosine similarity (scikit-learn; listed in `backend/requirements.txt`). With both flags set, TF–IDF stacks on v2.
- `MATCH_JOBS_SCAN_LIMIT` — max newest validated jobs considered per match request (default 4000).

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

### CI (GitHub Actions)

Canonical workflow (backend `pytest` + frontend `npm run build`): **[ci-workflow.example.yml](./ci-workflow.example.yml)**.

**Why this file lives under `docs/`:** GitHub rejects pushes that *introduce* new paths under `.github/workflows/` when the credential is a **Personal Access Token** without the **`workflow` scope** (`refusing to allow … without workflow scope`). Keeping the YAML here avoids that trap; copy it when you are ready:

```bash
mkdir -p .github/workflows
cp docs/ci-workflow.example.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
# use HTTPS/SSH with a token that has `workflow`, or SSH deploy keys that allow workflow updates
git commit -m "ci: add GitHub Actions workflow"
git push
```

SSH keys or a PAT **with** `workflow` can push `.github/workflows/` normally.

## GDPR

Use HTTPS in production. Update `CORS_ORIGINS` to your real frontend origin only.
