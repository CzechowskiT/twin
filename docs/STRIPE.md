# Stripe billing (TWIN)

Subscriptions use **Stripe Checkout** (hosted payment page). Checkout automatically offers **Apple Pay** and **Google Pay** when the shopper’s browser and wallet support them, alongside cards — no separate PayPal integration is required for those wallets.

## Environment variables (API / Railway)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Secret API key (`sk_live_…` / `sk_test_…`). |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from the Stripe Dashboard webhook endpoint (`whsec_…`). |
| `STRIPE_PRICE_ID_PREMIUM` | **Price** ID for the Premium monthly (or yearly) subscription (`price_…`). |
| `STRIPE_PRICE_ID_PRO` | Optional second paid tier; if empty, “Upgrade to Pro” stays disabled in the UI. |
| `FRONTEND_URL` | Used for Checkout success/cancel and Customer Portal return URL (no trailing slash). |

Do **not** commit keys. Configure them in Railway (API + worker if webhooks hit API only — webhooks go to the API service).

## Webhook URL

In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:

`https://<your-api-host>/api/v1/billing/webhook`

Subscribe to at least:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Use the endpoint’s **signing secret** as `STRIPE_WEBHOOK_SECRET`.

## Product setup (Dashboard)

1. Create **Products** (e.g. “TWIN Premium”, “TWIN Pro”) and attach **recurring Prices**.
2. Copy each **Price id** (`price_…`) into `STRIPE_PRICE_ID_PREMIUM` (and optionally `STRIPE_PRICE_ID_PRO`).
3. Enable **Customer portal** (Settings → Billing → Customer portal) so `/billing/portal-session` works.

## Plan behaviour in the app

| Plan | Tracked applications (non-`rejected`) | Auto-apply |
|------|--------------------------------------|------------|
| Free | Up to 25 | Not allowed |
| Premium / Pro (active / trialing / past_due) | Unlimited | Allowed |

`plan_tier` and `subscription_status` on `users` are updated from webhooks; the API treats you as paid only while Stripe reports an entitled subscription status.

## Local testing

Use Stripe **test mode** keys and the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:

```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

Paste the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` for local `.env`.
