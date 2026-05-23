import type { Request, Response } from "express";
import type Stripe from "stripe";
import { config } from "./config.js";
import { stripe } from "./stripe.js";

export async function handleStripeWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    res.status(400).send("Missing Stripe-Signature header");
    return;
  }

  if (!Buffer.isBuffer(req.body)) {
    res.status(400).send("Webhook requires raw request body");
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripeWebhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  try {
    await processWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).send("Webhook handler failed");
  }
}

async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `[webhook] checkout.session.completed id=${session.id} payment_status=${session.payment_status}`,
      );
      // Fulfill the order: grant access, send email, update your database, etc.
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `[webhook] async payment succeeded for session ${session.id}`,
      );
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[webhook] async payment failed for session ${session.id}`);
      break;
    }
    default:
      console.log(`[webhook] unhandled event type: ${event.type}`);
  }
}
