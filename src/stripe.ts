import Stripe from "stripe";
import { config, requireStripeSecretKey } from "./config.js";

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(requireStripeSecretKey(), {
      ...(config.stripeApiVersion
        ? { apiVersion: config.stripeApiVersion as Stripe.LatestApiVersion }
        : {}),
      typescript: true,
    });
  }
  return client;
}
