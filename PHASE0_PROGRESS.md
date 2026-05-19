# Phase 0 Progress Tracker

Started: 2026-05-19  
Completed: 2026-05-19

## Status

- [x] Task 1: Branch setup
- [x] Task 2: Webhook security (Greenhouse HMAC; Lever/Ashby 501)
- [x] Task 3: Secret validation (`Settings` + `startup_checks` on lifespan)
- [x] Task 4: Rate limiting (`POST /auth/reset-password` 3/min)
- [x] Task 5: Scrape access (`SCRAPE_OPS_USER_IDS` + `require_ops_user`)
- [x] Task 6: Deploy docs (`docs/DEPLOY.md` env checklist)
- [x] Task 7: Tests & verification (`scripts/verify_phase0.sh`)

## Progress Log

- 2026-05-19 Started Phase 0 on `cursor/phase0-deploy-security`
- 2026-05-19 Task 2–5: security code + 26 targeted tests green
- 2026-05-19 Task 6–7: DEPLOY.md, verify script, full suite 210 passed (2 pre-existing unrelated failures)

## Final Test Results

```text
pytest tests/test_integrations_ats.py tests/test_startup_validation.py \
  tests/test_auth_reset_password_rate_limit.py tests/test_scrape_authorization.py \
  tests/test_config.py → 26 passed
```

## Deploy drift (Task 1 — human / Vercel UI)

Code cannot fix Vercel repo wiring. Checklist in `docs/DEPLOY.md` Sprint Day 1.

## Next Steps

1. Merge `cursor/phase0-deploy-security` → `cursor/phase1-monorepo-scaffold`
2. Railway: set `SCRAPE_OPS_USER_IDS`, `GREENHOUSE_WEBHOOK_SECRET`, production `DATABASE_URL`
3. Vercel: connect `CzechowskiT/twin`, redeploy Production
