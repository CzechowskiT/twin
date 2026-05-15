# TWIN — Autonomous Career Agent

AI-powered career agent: scrape jobs (pracuj.pl, rocketjobs.pl), match candidates, track applications.

## Stack

| Layer | Tech |
|-------|------|
| API | FastAPI + SQLAlchemy + Alembic |
| Queue | Celery + Redis |
| DB | PostgreSQL |
| Scraping | Playwright + BeautifulSoup |
| AI | Anthropic Claude |
| Frontend | Next.js (TypeScript) |

## Quick start

One command (setup + Docker + migrations; add `--launch` for macOS Terminal tabs):

```bash
cd ~/Projects/twin
chmod +x open-folder.sh
./open-folder.sh          # setup only
./open-folder.sh --launch # setup + 4 Terminal tabs + browsers
# or: make setup / make open
```

### 1. Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop (Postgres + Redis)

### 2. Environment

```bash
cp .env.example .env
# Edit .env — set SECRET_KEY and ANTHROPIC_API_KEY
```

Verify Anthropic key (optional):

```bash
curl "https://api.anthropic.com/v1/organizations/api_keys/$API_KEY_ID" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-Api-Key: $ANTHROPIC_ADMIN_API_KEY"
```

### 3. Infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
alembic upgrade head
uvicorn app.main:app --reload
```

Celery (separate terminals):

```bash
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info
```

### 5. Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local  # or set NEXT_PUBLIC_API_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Full stack via Docker

```bash
docker compose up --build
```

## Project layout

```
twin/
├── backend/          # FastAPI, Celery, scrapers, matching
├── frontend/         # Next.js dashboard
├── docker-compose.yml
└── .env.example
```

## API docs

With the API running: [http://localhost:8000/docs](http://localhost:8000/docs)

## GDPR (MVP)

Registration requires explicit consent to the privacy policy (`gdpr_consent_at` stored on user).

## Job boards

- `pracuj.pl` — `app.scrapers.pracuj`
- `rocketjobs.pl` — `app.scrapers.rocketjobs`

Trigger scrape manually:

```bash
curl -X POST http://localhost:8000/api/v1/jobs/scrape/pracuj \
  -H "Authorization: Bearer <token>"
```
