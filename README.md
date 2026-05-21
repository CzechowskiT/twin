# TWIN — Autonomous Career Agent

AI-powered career agent: scrape jobs (pracuj.pl, rocketjobs.pl, LinkedIn), match candidates, track applications, optional **nightly auto-apply** (consent + Celery beat — see [docs/NIGHTLY_AUTO_APPLY.md](docs/NIGHTLY_AUTO_APPLY.md)).

## Stack

| Layer | Tech |
|-------|------|
| API | FastAPI + SQLAlchemy + Alembic |
| Queue | Celery + Redis |
| DB | PostgreSQL |
| Scraping | Playwright + BeautifulSoup |
| AI | Anthropic Claude |
| Frontend | Next.js (TypeScript) |

## Beta online (share a link with testers) — P0

**Checklist (repo + Railway + Vercel):** **[docs/P0_CHECKLIST.md](docs/P0_CHECKLIST.md)**  
**Placement verification (design — no manual CS loops):** **[docs/PLACEMENT_VERIFICATION.md](docs/PLACEMENT_VERIFICATION.md)**  
**Start here (plain Polish):** **[docs/WDROZENIE_LINK.md](docs/WDROZENIE_LINK.md)**  
**Wersje Vercel + Railway:** ten sam **branch** GitHub na obu (np. `cursor/phase1-monorepo-scaffold`); na Railway **Root directory = `backend`**. Jeśli deploy się „skipuje”, w Railway użyj **Redeploy**.  
Terminal helper: `./scripts/wrzuc-na-github.sh CzechowskiT`  
Technical: [docs/BETA_ONLINE_PL.md](docs/BETA_ONLINE_PL.md), [docs/DEPLOY.md](docs/DEPLOY.md).

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

Celery (run **both** in separate terminals for automatic scraping every 2 minutes):

```bash
cd backend && source .venv/bin/activate
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info
```

Beat has **no** scheduled scrapes (no background polling). Run scrapes from the dashboard or `POST /api/v1/jobs/scrape/...`.

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

## Security

TWIN implements multiple security layers:

### Authentication

- JWT tokens with 24h expiry
- OAuth 2.0 (Google, GitHub, Apple, LinkedIn)
- Password hashing with bcrypt
- Rate limiting: 5 requests/minute on auth endpoints (SlowAPI)

### Authorization

- Row-level security (users can only access their own data)
- Ownership checks on sensitive endpoints (applications, interviews, exports)
- Placement history and CSV exports are scoped to the authenticated candidate

### Data Protection

- Encrypted Google Calendar refresh tokens (AES-256)
- GDPR-compliant consent tracking
- Secure password reset flow (1h token expiry)

### Known limitations (beta)

- No 2FA yet (planned)
- Per-IP rate limits are coarse; additional abuse protection may be needed at the edge
- Self-hosted email (consider SendGrid or similar for production)

Report security issues: **security@twin.app**

## Deploy online

See [docs/DEPLOY.md](docs/DEPLOY.md) for Docker Compose production stack and cloud hosting notes.

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

## CV upload (contextual matching)

On **Profile**, upload PDF/DOCX/TXT (max 5 MB). TWIN extracts text, enriches skills from the CV, and adds a contextual overlap score when ranking jobs. Optional: set `ANTHROPIC_API_KEY` in `.env` for smarter CV parsing via Claude.

After pulling CV changes, run `alembic upgrade head` in `backend/`.

## GDPR (MVP)

Registration requires explicit consent to the privacy policy (`gdpr_consent_at` stored on user).

## Job boards

- `pracuj.pl` — `app.scrapers.pracuj` (IT + sales variants)
- `rocketjobs.pl` — `app.scrapers.rocketjobs` (IT + sales variants)
- `linkedin.com` — `app.scrapers.linkedin` (public search only, best-effort)

### LinkedIn limitations (MVP)

- Uses **public** job search pages only — no login, no credentials in the repo.
- LinkedIn often **blocks headless browsers** or shows a login wall; you may get 0 jobs or an error message.
- Scraping may violate LinkedIn’s Terms of Service; for production consider [LinkedIn’s official APIs](https://developer.linkedin.com/) or manual import.
- Do not store LinkedIn passwords in `.env` unless you add a future authenticated integration.

Trigger scrape manually:

```bash
curl -X POST "http://localhost:8000/api/v1/jobs/scrape/pracuj?sync=true" \
  -H "Authorization: Bearer <token>"

curl -X POST "http://localhost:8000/api/v1/jobs/scrape/linkedin?sync=true" \
  -H "Authorization: Bearer <token>"
```
