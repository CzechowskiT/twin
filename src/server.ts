import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { stripe } from "./stripe.js";
import { handleStripeWebhook } from "./webhooks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const app = express();

// Stripe webhooks require the raw body for signature verification.
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

app.use(express.json());
app.use(express.static(publicDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const quantity = Math.max(1, Number(req.body?.quantity) || 1);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: 2000,
            product_data: {
              name: "Demo product",
              description: "Sample one-time payment via Stripe Checkout",
            },
          },
        },
      ],
      success_url: `${config.appUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/cancel.html`,
      automatic_tax: { enabled: false },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Failed to create Checkout Session:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create checkout session";
    res.status(500).json({ error: message });
  }
});

app.get("/checkout-session/:sessionId", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.params.sessionId,
    );
    res.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve session";
    res.status(400).json({ error: message });
  }
});

app.listen(config.port, () => {
  console.log(`Stripe checkout app listening on ${config.appUrl}`);
  console.log(`  Checkout UI: ${config.appUrl}/`);
  console.log(`  Webhook URL: ${config.appUrl}/webhook`);
});
