import Stripe from "stripe";
import { config } from "./config.js";

export const stripe = new Stripe(config.stripeSecretKey, {
  ...(config.stripeApiVersion
    ? { apiVersion: config.stripeApiVersion as Stripe.LatestApiVersion }
    : {}),
  typescript: true,
});
