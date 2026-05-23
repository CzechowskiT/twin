import "dotenv/config";

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4242),
  appUrl: (optionalEnv("APP_URL") ?? "http://localhost:4242").replace(/\/$/, ""),
  stripeSecretKey: optionalEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET"),
  stripeApiVersion: optionalEnv("STRIPE_API_VERSION"),
  stripeDashboardKeysUrl:
    "https://dashboard.stripe.com/test/apikeys",
} as const;

export function isStripeConfigured(): boolean {
  return Boolean(config.stripeSecretKey);
}

export function requireStripeSecretKey(): string {
  if (!config.stripeSecretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Copy .env.example to .env and add your test key, or run: npm run setup",
    );
  }
  return config.stripeSecretKey;
}

export function requireWebhookSecret(): string {
  if (!config.stripeWebhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. Run: stripe listen --forward-to localhost:4242/webhook",
    );
  }
  return config.stripeWebhookSecret;
}
