# Stripe Checkout + Webhooks

**Kod na GitHubie:** https://github.com/CzechowskiT/twin/tree/cursor/stripe-checkout-app

Minimal production-style integration using **Stripe Checkout Sessions** (hosted checkout) and **webhook signature verification**.

**Szybki start:** `npm install && npm run setup && npm run dev` — potem wklej klucze Stripe do `.env` (link wypisze `setup`).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A [Stripe account](https://dashboard.stripe.com/register) (test mode is fine)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) (recommended for local webhooks)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment template and add your keys:

   ```bash
   cp .env.example .env
   ```

   | Variable | Where to get it |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | [Dashboard → API keys](https://dashboard.stripe.com/test/apikeys) (prefer a [restricted key](https://docs.stripe.com/keys/restricted-api-keys) scoped to Checkout + webhooks) |
   | `STRIPE_WEBHOOK_SECRET` | From Stripe CLI (`stripe listen`, see below) or Dashboard → Webhooks → signing secret |
   | `APP_URL` | `http://localhost:4242` for local dev |
   | `PORT` | `4242` (default) |

3. Forward webhooks to your local server (separate terminal):

   ```bash
   stripe listen --forward-to localhost:4242/webhook
   ```

   Copy the `whsec_...` signing secret into `.env` as `STRIPE_WEBHOOK_SECRET`.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:4242](http://localhost:4242), click **Pay with Stripe**, and complete checkout with a [test card](https://docs.stripe.com/testing#cards) (e.g. `4242 4242 4242 4242`).

## API routes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Demo checkout UI |
| `POST` | `/create-checkout-session` | Creates a Checkout Session, returns `{ url, sessionId }` |
| `GET` | `/checkout-session/:sessionId` | Retrieves session status (success page) |
| `POST` | `/webhook` | Stripe webhook endpoint (raw body + signature verification) |
| `GET` | `/health` | Health check |

## Webhook events handled

- `checkout.session.completed` — fulfill orders here
- `checkout.session.async_payment_succeeded` / `async_payment_failed` — delayed payment methods

## Production notes

- Set `APP_URL` to your public HTTPS origin.
- Register your webhook URL in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks) pointing to `https://your-domain.com/webhook`.
- Use live keys (`sk_live_...`) only in production; never commit `.env`.
- Omit `payment_method_types` on Checkout Sessions so [dynamic payment methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods) stay enabled.

## Scripts

- `npm run dev` — development server with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled production build
- `npm run typecheck` — type check without emit
