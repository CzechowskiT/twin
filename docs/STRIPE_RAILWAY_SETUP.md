# Stripe on Railway — founder setup (no secrets in git)

**Goal:** flip `stripe_checkout_ready: true` on prod so candidates can upgrade and investor surfaces show live subscription MRR.

**Last checked:** 2026-05-23 — Railway API has **no** `STRIPE_*` vars yet. LinkedIn OAuth and Celery are live; Stripe is the next monetization blocker.

---

## 1. Bootstrap test mode (recommended first)

Use the TWIN **Stripe sandbox** (test mode) before live keys.

```bash
# From repo root — paste sk_test_… into .env.railway (gitignored), never commit
export STRIPE_SECRET_KEY=sk_test_...
python3 scripts/stripe-bootstrap-test.py
```

The script creates (or reuses):

| Artifact | Nickname / URL |
|----------|----------------|
| Premium monthly price | `twin-premium-monthly` ($4.99 USD) |
| Webhook endpoint | `https://twin-production-bcd9.up.railway.app/api/v1/billing/webhook |

Copy printed values into `.env.railway`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STANDBY=price_...   # $0.99/mo — optional; card disabled if empty
STRIPE_PRICE_ID_STANDARD=price_...  # $1.99/mo — optional; card disabled if empty
STRIPE_PRICE_ID_PREMIUM=price_...
STRIPE_PRICE_ID_PRO=price_...   # optional — Pro tier UI stays disabled if empty
```

### Reference price IDs (TWIN sandbox, May 2026)

If bootstrap reuses existing products, expect IDs like:

| Plan | Example test price ID (partial) | List price |
|------|----------------------------------|------------|
| Premium | `price_1TZtVB…` | $4.99 / mo |
| Pro | `price_1TZtVf…` | $9.99 / mo |

Run `stripe prices list --limit 10` in test mode to confirm full IDs — **do not paste live keys into this doc**.

Optional Pro product nickname: `twin-pro-monthly` (create in Dashboard or extend `scripts/stripe-bootstrap-test.py`).

---

## 2. Apply to Railway

```bash
# Fill STRIPE_* in .env.railway, then:
./scripts/railway-apply-stripe-env.sh
```

Or full prod apply (includes mail, calendar, Celery refs):

```bash
./scripts/railway-apply-production-env.sh
```

---

## 3. Verify

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1" | jq '.stripe_checkout_ready'
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats" | jq '{stripe_checkout_ready, paid_subscribers, subscription_mrr_usd}'
```

Frontend: [https://twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status) — Stripe row should show **configured**.

E2E walkthrough: [`STRIPE_E2E.md`](./STRIPE_E2E.md).

---

## 4. Live mode (after test E2E)

1. Stripe Dashboard → **Live mode** → create Products/Prices (same $4.99 / $9.99 structure).
2. Live webhook: `https://twin-production-bcd9.up.railway.app/api/v1/billing/webhook`
3. Replace Railway vars with `sk_live_…`, live `whsec_…`, live `price_…` ids.
4. Redeploy API; repeat checkout with a real card on a staging account first.

See also [`STRIPE.md`](./STRIPE.md), [`RAILWAY_PROD_ENV_CHECKLIST.md`](./RAILWAY_PROD_ENV_CHECKLIST.md).
