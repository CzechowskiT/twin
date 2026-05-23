#!/usr/bin/env node
/**
 * Copies Google/GitHub/Apple OAuth credentials from repo .env into .env.railway
 * with production redirect URIs derived from RAILWAY_API_URL.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const railwayPath = path.join(root, ".env.railway");

function readEnv(file, key) {
  if (!fs.existsSync(file)) return "";
  const line = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  if (!line) return "";
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

function upsert(file, updates) {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n") : [];
  const keys = new Set(Object.keys(updates));
  const out = lines.filter((line) => {
    const k = line.split("=")[0];
    return !keys.has(k);
  });
  for (const [k, v] of Object.entries(updates)) {
    out.push(`${k}=${v}`);
  }
  fs.writeFileSync(file, out.join("\n").replace(/\n*$/, "\n"));
}

const apiUrl =
  readEnv(railwayPath, "RAILWAY_API_URL") ||
  readEnv(railwayPath, "API_URL") ||
  "https://twin-production-bcd9.up.railway.app";

const updates = {
  GOOGLE_REDIRECT_URI: `${apiUrl}/api/v1/auth/google/callback`,
  GOOGLE_CALENDAR_REDIRECT_URI: `${apiUrl}/api/v1/calendar/google/callback`,
  GITHUB_REDIRECT_URI: `${apiUrl}/api/v1/auth/github/callback`,
  APPLE_REDIRECT_URI: `${apiUrl}/api/v1/auth/apple/callback`,
};

const copyKeys = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
];

let copied = 0;
for (const key of copyKeys) {
  const val = readEnv(envPath, key);
  if (val) {
    updates[key] = val;
    copied += 1;
  }
}

upsert(railwayPath, updates);

const providers = [];
if (updates.GOOGLE_CLIENT_ID) providers.push("Google");
if (updates.GITHUB_CLIENT_ID) providers.push("GitHub");
if (updates.APPLE_CLIENT_ID) providers.push("Apple");

console.log(
  `Zapisano redirect URI OAuth do .env.railway (${apiUrl}). Skopiowano ${copied} sekretów z .env.`,
);
if (providers.length) {
  console.log("Providery z credentials:", providers.join(", "));
} else {
  console.log(
    "Brak GOOGLE/GITHUB/APPLE credentials w .env — uzupełnij .env i uruchom ponownie, potem ./scripts/railway-apply-production-env.sh",
  );
}
