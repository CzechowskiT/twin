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
| `STRIPE_PRICE_ID_PREMIUM` | **Price** ID for the Premium monthly (or yearly) subscription (`price_…`). |
| `STRIPE_PRICE_ID_PRO` | Optional second paid tier; if empty, “Upgrade to Pro” stays disabled in the UI. |
| `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES` | Optional. Comma-separated Stripe Checkout `payment_method_types` (default `card,link`). |
| `FRONTEND_URL` | Used for Checkout success/cancel and Customer Portal return URL (no trailing slash). |

Do **not** commit keys. Configure them in Railway (API + worker if webhooks hit API only — webhooks go to the API service).

## Webhook URL

In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:

`https://<your-api-host>/api/v1/billing/webhook`

Subscribe to at least:

- `checkout.session.completed`
- `checkout.session.async_payment_failed` (async payment methods — logged; subscription refresh not applicable until Checkout completes)
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded` (referral retention accounting)
- `invoice.payment_failed` (syncs subscription status e.g. `past_due` / `unpaid` from Stripe)

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

`plan_tier` and `subscription_status` on `users` are updated from webhooks; the API treats you as paid only while Stripe reports an entitled subscription status (`active`, `trialing`, or `past_due`).

## `GET /api/v1/billing/plans` (list prices vs Checkout)

- **Checkout** always charges the **Price IDs** from `STRIPE_PRICE_ID_PREMIUM` / `STRIPE_PRICE_ID_PRO`.
- **Public “Stripe ready”** (`GET /api/v1/public/mvp-stats` → `stripe_checkout_ready`) matches **billing**: it is true only when **`STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID_PREMIUM`** are set. Pro alone is not enough to open Checkout.
- The plans payload includes **`list_price_monthly` + `list_price_currency`** when the API can `Price.retrieve` the configured id (same recurring basis as customers see, normalized to a monthly figure for yearly/week prices). If Stripe is unreachable, the API falls back to illustrative USD defaults and omits those fields; **`monthly_list_price_usd`** remains a rough USD hint for older clients.

## Local testing

Use Stripe **test mode** keys and the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:

```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

Paste the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` for local `.env`.
