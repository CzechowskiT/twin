# Stripe checkout E2E (test mode)

End-to-end verification for Premium upgrade before live keys on Railway.

## 1. Bootstrap test products (local)

```bash
export STRIPE_SECRET_KEY=sk_test_...
python3 scripts/stripe-bootstrap-test.py
```

Copy printed `STRIPE_PRICE_ID_PREMIUM` and `STRIPE_WEBHOOK_SECRET` into `backend/.env` or `.env.railway`.

## 2. Local API + webhook forward

Terminal A — API:

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Terminal B — Stripe CLI:

```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

Use the CLI `whsec_…` as `STRIPE_WEBHOOK_SECRET` in `.env`.

## 3. Frontend

```bash
cd frontend && npm run dev
```

Log in → **Dashboard → Billing** → **Upgrade to Premium**.

## 4. Assert

| Check | Expected |
|-------|----------|
| Checkout opens | Stripe hosted page (test card `4242 4242 4242 4242`) |
| Webhook | `customer.subscription.created` → user `plan_tier=premium` |
| `GET /api/v1/auth/me` | `subscription_status` active or trialing |
| `GET /api/v1/health?ops=1` | `stripe_checkout_ready: true` when keys set |
| Public `/status` | Stripe row **configured** |

## 5. Production (live)

1. Create live **Price** ids in Stripe Dashboard.
2. Set `STRIPE_SECRET_KEY=sk_live_…`, price ids, webhook endpoint  
   `https://<api-host>/api/v1/billing/webhook` on Railway.
3. Run `./scripts/railway-apply-production-env.sh` after filling `.env.railway`.
4. Repeat checkout with a real card in a staging account first.

See also [`STRIPE.md`](./STRIPE.md).
