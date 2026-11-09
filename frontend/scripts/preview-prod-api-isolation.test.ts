/**
 * Offline security regression for Preview fail-closed API isolation.
 * This is an explicit build/source guard, NOT evidence of cloud infra isolation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getUpstreamApiBase, getPublicApiBase } from "../src/lib/public-api-base";

const original = Object.fromEntries(
  ["VERCEL_ENV", "NEXT_PUBLIC_VERCEL_ENV", "NEXT_PUBLIC_TWIN_PREVIEW_DEPLOYMENT",
   "TWIN_API_BASE_URL", "API_URL", "NEXT_PUBLIC_API_URL"]
    .map((key) => [key, process.env[key]]),
);
function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

try {
  process.env.TWIN_API_BASE_URL = "https://twin-production-bcd9.up.railway.app";
  process.env.NEXT_PUBLIC_API_URL = "https://twin-production-bcd9.up.railway.app";
  setEnv("API_URL", undefined);
  process.env.VERCEL_ENV = "preview";
  process.env.NEXT_PUBLIC_TWIN_PREVIEW_DEPLOYMENT = "true";

  assert.equal(getUpstreamApiBase(), null, "preview server may not proxy to production");
  assert.equal(getPublicApiBase(), null, "preview browser may not send direct requests to production");

  // Browser still needs the compiled flag when VERCEL_ENV is not available at runtime.
  setEnv("VERCEL_ENV", undefined);
  assert.equal(getPublicApiBase(), null, "compiled preview flag must disable client API");

  // Edge fallback: Vercel always knows its actual environment.
  process.env.VERCEL_ENV = "production";
  process.env.NEXT_PUBLIC_TWIN_PREVIEW_DEPLOYMENT = "false";
  process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
  assert.equal(getPublicApiBase(), null, "public preview metadata must also disable client API");

  // Normal production behavior remains intact.
  process.env.VERCEL_ENV = "production";
  process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
  assert.equal(getUpstreamApiBase(), "https://twin-production-bcd9.up.railway.app");
  assert.equal(getPublicApiBase(), "https://twin-production-bcd9.up.railway.app");

  const root = process.cwd();
  const middleware = readFileSync(join(root, "src/middleware.ts"), "utf8");
  assert.match(middleware, /process\.env\.VERCEL_ENV === "preview"/);
  assert.match(middleware, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(middleware, /"\/api\/:path\*"/, "middleware matcher must include all API routes");
  const config = readFileSync(join(root, "next.config.ts"), "utf8");
  assert.match(config, /NEXT_PUBLIC_TWIN_PREVIEW_DEPLOYMENT/);
  assert.match(config, /process\.env\.VERCEL_ENV === "preview" \? previewHeaders : securityHeaders/);
  console.log("Preview API isolation guard: PASS (source + runtime functions)");
} finally {
  for (const [key, value] of Object.entries(original)) setEnv(key, value);
}
