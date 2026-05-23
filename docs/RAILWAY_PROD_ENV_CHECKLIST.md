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
- `GOOGLE_CALENDAR_REDIRECT_URI` — must match **exactly** what the API sends (no trailing `/`). If unset, API derives from `API_URL` + `/api/v1/calendar/google/callback`.
- **Production redirect URI (whitelist in Google Cloud Console):**  
  `https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback`
- **Verify at runtime:** `GET /api/v1/calendar/oauth-config` or `GET /api/v1/health?ops=1` → `google_calendar_redirect_uri`
- **Local dev (add both if you use Next proxy):**  
  `http://localhost:8000/api/v1/calendar/google/callback`  
  `http://localhost:3000/api/v1/calendar/google/callback`

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

## Greenhouse Harvest OAuth (recruiter connect; optional)

- `GREENHOUSE_CLIENT_ID`
- `GREENHOUSE_CLIENT_SECRET`
- `GREENHOUSE_OAUTH_REDIRECT_URI` (must match Greenhouse app; e.g. `https://<api>/api/v1/integrations/ats/greenhouse/callback`)
- `GREENHOUSE_OAUTH_SCOPES` (optional)

## Investor data room S3 (optional; presigned PUT when set)

- `S3_ENDPOINT_URL` (Cloudflare R2 or AWS)
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION`

## Greenhouse Harvest OAuth (recruiter connect)

- `GREENHOUSE_CLIENT_ID`
- `GREENHOUSE_CLIENT_SECRET`
- `GREENHOUSE_OAUTH_REDIRECT_URI` (e.g. `https://<api-host>/api/v1/integrations/ats/greenhouse/callback`)
- `GREENHOUSE_OAUTH_SCOPES` (optional; default Harvest read scopes)

## Investor data room / auto-apply blobs (S3-compatible)

- `S3_BUCKET_NAME`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT_URL` (Cloudflare R2 or MinIO; omit for AWS)
- `S3_REGION` (e.g. `auto` for R2, `eu-central-1` for AWS)

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

**Agent note (2026-05-22):** local `.env.railway` had `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` missing and `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` empty — skipped `railway-apply-production-env.sh` (no invented secrets). Paste those four plus `STRIPE_PRICE_ID_PREMIUM` (or `STRIPE_PRICE_ID_PRO`) and `MICROSOFT_CALENDAR_REDIRECT_URI` + `MICROSOFT_TENANT` in Railway to flip `stripe_checkout_ready` and `microsoft_calendar_configured` on `/api/v1/health?ops=1`.

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

### Greenhouse Harvest OAuth (recruiter ATS connect)

```
GREENHOUSE_CLIENT_ID=
GREENHOUSE_CLIENT_SECRET=
GREENHOUSE_OAUTH_REDIRECT_URI=
GREENHOUSE_OAUTH_SCOPES=
GREENHOUSE_WEBHOOK_SECRET=
```

### S3 / R2 (data room uploads + auto-apply packages)

```
S3_BUCKET_NAME=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT_URL=
S3_REGION=
```
