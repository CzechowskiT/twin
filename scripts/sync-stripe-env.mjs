#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const stripeConfig = join(homedir(), ".config/stripe/config.toml");

function readTomlKey(content, key) {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*["']([^"']+)["']`, "m"));
  return match?.[1];
}

if (!existsSync(stripeConfig)) {
  console.error("Brak ~/.config/stripe/config.toml — najpierw: stripe login");
  process.exit(1);
}

const toml = readFileSync(stripeConfig, "utf8");
const testKey =
  readTomlKey(toml, "test_mode_api_key") ?? readTomlKey(toml, "api_key");

if (!testKey?.startsWith("sk_test_")) {
  console.error("W config.toml nie ma test_mode_api_key. Uruchom: stripe login");
  process.exit(1);
}

let env = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
  : readFileSync(join(root, ".env.example"), "utf8");

if (/^STRIPE_SECRET_KEY=.*/m.test(env)) {
  env = env.replace(/^STRIPE_SECRET_KEY=.*/m, `STRIPE_SECRET_KEY=${testKey}`);
} else {
  env += `\nSTRIPE_SECRET_KEY=${testKey}\n`;
}

writeFileSync(envPath, env);
console.log("Zapisano STRIPE_SECRET_KEY do .env z Stripe CLI config.");
