#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const envExample = join(root, ".env.example");

if (!existsSync(envPath)) {
  copyFileSync(envExample, envPath);
  console.log("Created .env from .env.example");
} else {
  console.log(".env already exists");
}

console.log("\nNext (one-time):");
console.log("  1. Add STRIPE_SECRET_KEY to .env");
console.log("     https://dashboard.stripe.com/test/apikeys");
console.log("  2. Terminal A: npm run dev");
console.log("  3. Terminal B: stripe listen --forward-to localhost:4242/webhook");
console.log("  4. Copy whsec_... into .env as STRIPE_WEBHOOK_SECRET\n");

try {
  execSync("git push twin main:cursor/stripe-checkout-app", {
    cwd: root,
    stdio: "inherit",
  });
} catch {
  console.log("Git push skipped (run manually: npm run push)");
}
