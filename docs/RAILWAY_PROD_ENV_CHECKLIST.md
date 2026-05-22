# Railway production env checklist (names only)

Paste values in Railway → **twin** (API) → Variables → Raw Editor. Do not commit secrets. See `docs/RAILWAY_PROD_ENV_PL.md` (PL) and `.env.railway.example` for setup notes.

## Health flags (verify after deploy)

```bash
./scripts/verify-prod-health.sh
```

| Health field | Required env vars (names) |
|--------------|---------------------------|
| `mail_configured` | `RESEND_API_KEY` + `MAIL_FROM`, or `SMTP_HOST` + `SMTP_PORT` + `SMTP_USER` + `SMTP_PASSWORD` + `SMTP_FROM` |
| `google_calendar_configured` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI` |
| `microsoft_calendar_configured` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALENDAR_REDIRECT_URI`, `MICROSOFT_TENANT` |
| `stripe_checkout_ready` | `STRIPE_SECRET_KEY` + (`STRIPE_PRICE_ID_PREMIUM` or `STRIPE_PRICE_ID_PRO`); production also needs `STRIPE_WEBHOOK_SECRET` when `STRIPE_SECRET_KEY` is set |
| `scrape_worker_ready` | `SCRAPE_WORKER_READY`, `CELERY_TASK_ALWAYS_EAGER=false`, `CELERY_BROKER_URL`, worker service with beat |
| `celery` / nightly beat | `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_URL`, `nightly_auto_apply_beat_enabled` (default on) |

Optional: `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES` (default `card,link`).

## Core API (always)

- `API_URL`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `ENVIRONMENT`
- `SECRET_KEY`
- `DATABASE_URL` (Railway Postgres plugin)

## Mail

- `RESEND_API_KEY`
- `MAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

## Google Calendar OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`

## Microsoft 365 Calendar OAuth

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_CALENDAR_REDIRECT_URI`
- `MICROSOFT_TENANT`

## Celery + scrape worker

- `CELERY_BROKER_URL` (e.g. `${{Redis.REDIS_URL}}`)
- `CELERY_RESULT_BACKEND`
- `REDIS_URL`
- `CELERY_TASK_ALWAYS_EAGER`
- `SCRAPE_WORKER_READY`
- `SCRAPE_BEAT_ENABLED`
- `AUTO_APPLY_HEADLESS`

## Stripe Checkout

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PREMIUM`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES`

## Ops / recruiter / partner

- `OPS_ADMIN_TOKEN`
- `BETA_ADMIN_TOKEN`
- `RECRUITER_INBOX_TOKEN`
- `PARTNER_EXPORT_TOKEN`

## ATS hire webhooks (optional; per provider)

- `GREENHOUSE_WEBHOOK_SECRET`
- `LEVER_WEBHOOK_SECRET`
- `ASHBY_WEBHOOK_SECRET`

## CLI / apply scripts (local only, not Railway service vars)

- `RAILWAY_TOKEN` (in `.env.railway` for `railway-apply-production-env.sh`)
- `RAILWAY_API_URL` (in `.env.railway`)
- `VERCEL_TOKEN` (optional, Vercel frontend)

## Apply from local `.env.railway`

When secrets are filled locally (never print values):

```bash
./scripts/railway-apply-production-env.sh
./scripts/railway-apply-worker-env.sh
```

If Stripe/Microsoft keys are empty in `.env.railway`, paste the **Stripe** and **Microsoft** blocks below into Railway Raw Editor manually, then redeploy API.

## Copy-paste blocks (variable names only)

Paste into Railway → **twin** (API) → Variables → Raw Editor. Fill values in Railway UI — never commit secrets.

### Stripe Checkout

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PREMIUM=
STRIPE_PRICE_ID_PRO=
STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES=
```

### Microsoft 365 Calendar OAuth

```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_CALENDAR_REDIRECT_URI=
MICROSOFT_TENANT=
```

### Mail (if `mail_configured` is false)

```
RESEND_API_KEY=
MAIL_FROM=
```

### Google Calendar OAuth (if `google_calendar_configured` is false)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=
```
