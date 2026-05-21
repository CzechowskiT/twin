# Produkcja — autonomiczny runbook (agent / CI)

## Jedna komenda (Mac, po wypełnieniu `.env.railway`)

```bash
./scripts/apply-prod-autonomous.sh
```

Robi: uzupełnienie `.env.railway` → tokeny ops → Railway (CLI lub `RAILWAY_TOKEN`) → Vercel → smoke `/health?ops=1`.

## Bez logowania CLI (wklejka)

```bash
./scripts/copy-railway-vars-to-clipboard.sh
```

Railway → serwis **twin** (API) → **Variables** → **Raw Editor** → wklej → **Deploy**.

To ustawia m.in. `CELERY_BROKER_URL=${{Redis.REDIS_URL}}` i `CELERY_TASK_ALWAYS_EAGER=false` (bez tego API zostaje w trybie eager).

## GitHub Actions (w pełni bez Maca)

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Źródło |
|--------|--------|
| `RAILWAY_TOKEN` | Railway → Account → Tokens |
| `OPS_ADMIN_TOKEN` | `./scripts/generate-deploy-secrets.sh` → `.env.railway` |
| `SECRET_KEY` | j.w. |
| `RESEND_API_KEY` | Resend dashboard |
| opcjonalnie `RECRUITER_INBOX_TOKEN`, `PARTNER_EXPORT_TOKEN` | `.env.railway` |

Workflow: skopiuj `docs/github-workflow-prod-env-apply.yml.example` → `.github/workflows/prod-env-apply.yml` (push wymaga PAT z zakresem `workflow`).

## Worker Celery

Serwis **twin-worker** + `deploy/railway-worker.toml` → `./scripts/railway-apply-worker-env.sh`

## Weryfikacja

```bash
./scripts/verify-prod-health.sh
```

Oczekiwane: `ops_admin_configured: true`, `celery_task_always_eager: false`, `db_ok: true`.
