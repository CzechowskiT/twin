# One-shot deploy setup

## 1. Generate secrets (local, gitignored `.env.railway`)

```bash
./scripts/generate-deploy-secrets.sh
```

## 2. Apply to Railway API (requires login once)

```bash
npx @railway/cli login
npx @railway/cli link   # project twin → API service
./scripts/railway-apply-production-env.sh
```

Sets mail, calendar, Stripe (if filled), Celery, **`OPS_ADMIN_TOKEN`**, **`RECRUITER_INBOX_TOKEN`**, **`PARTNER_EXPORT_TOKEN`**.

Run migrations on API after deploy:

```bash
npx @railway/cli run alembic upgrade head
```

## 3. Vercel frontend env

```bash
cd frontend && npx vercel login
cd .. && ./scripts/vercel-apply-production-env.sh
```

Or all-in-one:

```bash
./scripts/deploy-all.sh
```

## 4. Verify

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1"
```

Expect `recruiter_inbox_configured`, `ops_admin_configured` true after Railway apply.

## Admin URLs (production)

| Page | Path |
|------|------|
| Partner keys | `/admin/partner-keys` |
| Recruiter company tokens | `/admin/recruiter-tokens` |
| Recruiter inbox (pilot) | `/recruiter/inbox?token=…&company_slug=…` |

Use the same `OPS_ADMIN_TOKEN` from `.env.railway` in the admin UI password field.
