#!/usr/bin/env node
/**
 * Copies MICROSOFT_CLIENT_ID/SECRET from repo .env into .env.railway with production redirect URIs.
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

const clientId = readEnv(envPath, "MICROSOFT_CLIENT_ID");
const clientSecret = readEnv(envPath, "MICROSOFT_CLIENT_SECRET");
if (!clientId || !clientSecret) {
  console.error("Brak MICROSOFT_CLIENT_ID/SECRET w .env — uruchom scripts/setup-microsoft-azure.sh");
  process.exit(1);
}

upsert(railwayPath, {
  MICROSOFT_CLIENT_ID: clientId,
  MICROSOFT_CLIENT_SECRET: clientSecret,
  MICROSOFT_REDIRECT_URI: `${apiUrl}/api/v1/auth/microsoft/callback`,
  MICROSOFT_CALENDAR_REDIRECT_URI: `${apiUrl}/api/v1/calendar/microsoft/callback`,
  MICROSOFT_TENANT: readEnv(envPath, "MICROSOFT_TENANT") || "common",
});

console.log("Zapisano MICROSOFT_* do .env.railway (produkcja:", apiUrl, ")");
