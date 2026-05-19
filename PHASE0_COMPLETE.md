# Phase 0 Complete

**Branch:** `cursor/phase0-deploy-security`  
**Audit:** [MERGED-AUDIT-2026-05-19.md](docs/reviews/MERGED-AUDIT-2026-05-19.md)

## CRITICAL items addressed in code

| # | Issue | Status |
|---|--------|--------|
| 1 | Deploy drift (Vercel `CzechowskiD` vs `T`) | Documented in `docs/DEPLOY.md` — requires Vercel/Railway UI |
| 2 | Greenhouse webhook unsigned | **Fixed** — prod/staging rejects empty secret; HMAC required when set |
| 3 | `SECRET_KEY` production validation | **Fixed** — Pydantic `Settings` + `startup_checks` (DB URL, Stripe webhook) |
| 4 | Scrape access control | **Fixed** — `SCRAPE_OPS_USER_IDS` + `require_ops_user` on scrape routes |

## Additional hardening

- Lever/Ashby webhooks return **501** until signature validation exists
- `POST /auth/reset-password` rate limited (**3/minute**)
- `scripts/verify_phase0.sh` for repeatable checks

## Verification

```bash
./scripts/verify_phase0.sh
```

## Production deployment

Set on Railway (see `docs/DEPLOY.md`):

- `ENVIRONMENT=production`
- `SECRET_KEY` (≥32 chars, not dev default)
- `DATABASE_URL` (non-localhost)
- `GREENHOUSE_WEBHOOK_SECRET` (if using ATS webhooks)
- `SCRAPE_OPS_USER_IDS` (comma-separated user IDs)
- `STRIPE_WEBHOOK_SECRET` when `STRIPE_SECRET_KEY` is set
