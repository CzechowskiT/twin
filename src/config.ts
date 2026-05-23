import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export const config = {
  port: Number(process.env.PORT ?? 4242),
  appUrl: requireEnv("APP_URL").replace(/\/$/, ""),
  stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
  stripeApiVersion: process.env.STRIPE_API_VERSION,
} as const;
