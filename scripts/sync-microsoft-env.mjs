#!/usr/bin/env node
/**
 * Writes MICROSOFT_* vars into repo-root .env (from args or env).
 * Usage:
 *   node scripts/sync-microsoft-env.mjs <client_id> <client_secret>
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

const clientId = process.argv[2] || process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.argv[3] || process.env.MICROSOFT_CLIENT_SECRET;

if (!clientId?.trim() || !clientSecret?.trim()) {
  console.error("Usage: node scripts/sync-microsoft-env.mjs <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const defaults = {
  MICROSOFT_CLIENT_ID: clientId.trim(),
  MICROSOFT_CLIENT_SECRET: clientSecret.trim(),
  MICROSOFT_REDIRECT_URI: "http://localhost:8000/api/v1/auth/microsoft/callback",
  MICROSOFT_CALENDAR_REDIRECT_URI:
    "http://localhost:8000/api/v1/calendar/microsoft/callback",
  MICROSOFT_TENANT: "common",
};

let env = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
  : existsSync(examplePath)
    ? readFileSync(examplePath, "utf8")
    : "";

for (const [key, value] of Object.entries(defaults)) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) {
    env = env.replace(re, `${key}=${value}`);
  } else {
    env += `\n${key}=${value}\n`;
  }
}

writeFileSync(envPath, env);
console.log("Zapisano MICROSOFT_* do", envPath);
