# Stripe — what founder must paste (one message)

**Status (2026-05-23):** Railway API service has **no** `STRIPE_*` vars. Stripe MCP confirms TWIN sandbox products/prices exist; secret key + webhook secret are still required from you.

## Paste into `.env.railway` (gitignored)

```bash
STRIPE_SECRET_KEY=sk_test_…          # Dashboard → Developers → API keys → Secret (test mode)
STRIPE_WEBHOOK_SECRET=whsec_…        # from bootstrap script output (see below)
STRIPE_PRICE_ID_PREMIUM=price_1TZtVB3eUhuXlKY97ZFiX4bE   # TWIN Premium $4.99/mo
STRIPE_PRICE_ID_PRO=price_1TZtVf3eUhuXlKY9aNh7o0s2       # TWIN Pro $9.99/mo (optional)
```

## Bootstrap webhook secret (after `STRIPE_SECRET_KEY` is set locally)

```bash
export STRIPE_SECRET_KEY=sk_test_…
python3 scripts/stripe-bootstrap-test.py
# Copy printed STRIPE_WEBHOOK_SECRET + confirm price IDs, then:
./scripts/railway-apply-stripe-env.sh
```

## Verify (no secrets in output)

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1" | jq '.stripe_checkout_ready'
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats" | jq '{stripe_checkout_ready, paid_subscribers, subscription_mrr_usd}'
```

Frontend: https://twin-sooty.vercel.app/status — Stripe row should show **configured**.

See also [`STRIPE_RAILWAY_SETUP.md`](./STRIPE_RAILWAY_SETUP.md).
