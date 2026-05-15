# Deploying TWIN

## Option 1: Docker Compose (VPS / local server)

1. Copy `.env.example` to `.env` and set:
   - `SECRET_KEY` (long random string)
   - `POSTGRES_PASSWORD`
   - `NEXT_PUBLIC_API_URL` (public API URL, e.g. `https://api.yourdomain.com`)
   - `CORS_ORIGINS` (frontend URL, e.g. `https://app.yourdomain.com`)
   - `ANTHROPIC_API_KEY` (optional, for CV parsing)

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

## Option 2: Railway / Render (split services)

| Service | Command | Notes |
|---------|---------|--------|
| Postgres | managed plugin | Copy `DATABASE_URL` |
| Redis | managed plugin | Copy `REDIS_URL` |
| API | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Root: `backend/` |
| Worker | `celery -A app.tasks.celery_app worker` | Same env as API |
| Beat | `celery -A app.tasks.celery_app beat` | Same env as API |
| Frontend | `npm run build && npm start` | Set `NEXT_PUBLIC_API_URL` |

After deploy, run `alembic upgrade head` against the production database.

## Health check

- API: `GET /api/v1/health`
- Docs: `/docs`

## GDPR

Use HTTPS in production. Update `CORS_ORIGINS` to your real frontend origin only.
