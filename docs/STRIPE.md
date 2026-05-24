# Stripe billing (TWIN)

Subscriptions use **Stripe Checkout** (hosted payment page). Which rails appear is controlled by **`STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES`** (comma-separated `payment_method_types`). Defaults to **`card,link`**.

- **`card`**: major cards plus **Apple Pay** and **Google Pay** when the Stripe account, domain, and browser support wallets (they are not separate type ids).
- **`link`**: [Stripe Link](https://stripe.com/docs/payments/link) one-tap checkout where enabled.

Other methods (e.g. `ideal`, `sepa_debit`, `paypal`, `amazon_pay`) may be added if your Stripe account and **Price currency** support them for **subscription** Checkout; invalid values are ignored at startup (see server logs).

## Environment variables (API / Railway)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Secret API key (`sk_live_…` / `sk_test_…`). |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from the Stripe Dashboard webhook endpoint (`whsec_…`). |
| `STRIPE_PRICE_STANDBY` / `STRIPE_PRICE_ID_STANDBY` | **Price** ID for Standby ($0.99/mo) — frozen profile, data retained. |
| `STRIPE_PRICE_STANDARD` / `STRIPE_PRICE_ID_STANDARD` | **Price** ID for Standard ($1.99/mo) — apply + 80%+ matches. |
| `STRIPE_PRICE_ID_PREMIUM` | **Price** ID for Premium ($4.99/mo) — full AI, coach, gamification. |
| `STRIPE_PRICE_ID_PRO` | Optional top tier ($9.99/mo); if empty, Pro checkout stays disabled in the UI. |
| `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES` | Optional. Comma-separated Stripe Checkout `payment_method_types` (default `card,link`). |
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

| Plan | Tracked applications (non-`rejected`) | Apply / search |
|------|--------------------------------------|----------------|
| Free | Up to 25 | Preview counts only |
| Standby | Up to 25 | Data kept; active search paused |
| Standard | Unlimited | Apply + ~80%+ match feed |
| Premium / Pro | Unlimited | Full AI + coach + gamification |

`plan_tier` and `subscription_status` on `users` are updated from webhooks; the API treats you as paid only while Stripe reports an entitled subscription status.

## Local testing

Use Stripe **test mode** keys and the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:

```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

Paste the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` for local `.env`.
