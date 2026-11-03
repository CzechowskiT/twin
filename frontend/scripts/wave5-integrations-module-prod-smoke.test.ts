/**
 * Wave 5 per-module calendar/integrations prod smoke.
 * Email draft enqueue is idempotent on dedupe_key (re-smoke safe).
 *
 * Env:
 *   TWIN_PROD_TEST_JWT — required (fail-closed if missing)
 *   TWIN_PROD_SMOKE_WRITE=1 — required for mutation modules
 *   WAVE5_SMOKE_MODULES — comma list or "all"
 *
 * Never prints JWT. Excluded metrics account only.
 * No real email / Google write / Microsoft write / ATS write.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";
import {
  parseModuleSelection,
  runModuleSmoke,
  WAVE5_POLICY_HELD_MODULES,
  WAVE5_SMOKEABLE_MODULES,
  wave5SmokeFailClosedReasons,
} from "./lib/wave5-module-smoke-handlers";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadLocalEnv(): void {
  const envPath = join(repoRoot, "frontend/.env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = val;
    }
  }
}
loadLocalEnv();

const API_BASE = (process.env.TWIN_PROD_API_BASE_URL ?? "https://twin-production-bcd9.up.railway.app").replace(
  /\/$/,
  "",
);
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";
const MODULES = parseModuleSelection(process.env.WAVE5_SMOKE_MODULES);

async function fetchApi(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(45_000),
  });
  return { status: res.status, body: await res.text() };
}

test("0 harness artifacts + fail-closed contract", () => {
  assert.ok(WAVE5_SMOKEABLE_MODULES.length === 18);
  assert.ok(WAVE5_POLICY_HELD_MODULES.includes("plat_ms_calendar_write"));
  assert.ok(WAVE5_POLICY_HELD_MODULES.includes("plat_ats_live_sync_write"));
  assert.match(
    readFileSync(join(repoRoot, "frontend/package.json"), "utf8"),
    /test:wave5-integrations-module-prod-smoke/,
  );
  assert.deepEqual(
    wave5SmokeFailClosedReasons({ hasJwt: false, metricsExcluded: true }),
    ["no_jwt"],
  );
});

test("1 unauthenticated wave5 paths return 401", async () => {
  for (const path of [
    "/api/v1/platform/wave5/status",
    "/api/v1/platform/wave5/integration-inventory",
    "/api/v1/platform/wave5/google/honesty",
    "/api/v1/platform/wave5/microsoft/honesty",
    "/api/v1/platform/wave5/ats/honesty",
  ]) {
    const { status } = await fetchApi(path);
    assert.ok(status === 401 || status === 404, `${path} → ${status}`);
  }
});

test("2 public enrollment + policy still blocked", async () => {
  await logProdSmokeCommitGate();
  const en = await fetchApi("/api/v1/platform/foundations/enrollment-gate");
  assert.equal(en.status, 200);
  const body = JSON.parse(en.body) as { external_pilot_enrollment_enabled: boolean; pilot: string };
  assert.equal(body.external_pilot_enrollment_enabled, false);
  assert.equal(body.pilot, "READY_FOR_CONTROLLED_PILOT");
});

test("3 per-module authenticated smoke (selected modules)", async (t) => {
  if (!JWT) {
    t.skip("FAIL-CLOSED skip — set TWIN_PROD_TEST_JWT on excluded metrics account");
    return;
  }
  const failClosed = wave5SmokeFailClosedReasons({
    hasJwt: true,
    metricsExcluded: true,
    realEmailSend: false,
    realCalendarWrite: false,
    realAtsWrite: false,
  });
  assert.equal(failClosed.length, 0);

  const headers = {
    Authorization: `Bearer ${JWT}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };

  const statusRes = await fetchApi("/api/v1/platform/wave5/status", { headers });
  assert.equal(statusRes.status, 200);
  const statusBody = JSON.parse(statusRes.body) as {
    microsoft_write: string;
    ats_live_sync: string;
    stripe_public: string;
    authologic_kyc: string;
    live_claim: boolean;
  };
  assert.equal(statusBody.live_claim, false);
  assert.equal(statusBody.microsoft_write, "BLOCKED");
  assert.equal(statusBody.ats_live_sync, "BLOCKED");
  assert.equal(statusBody.stripe_public, "NOT_LIVE");
  assert.equal(statusBody.authologic_kyc, "OFF");

  const results: Array<{ module_id: string; ok: boolean; reason?: string }> = [];
  for (const moduleId of MODULES) {
    const result = await runModuleSmoke(moduleId, {
      fetchApi,
      headers,
      write: SMOKE_WRITE,
    });
    results.push(result.ok ? { module_id: moduleId, ok: true } : result);
  }

  const failed = results.filter((r) => !r.ok);
  assert.equal(
    failed.length,
    0,
    failed.map((f) => `${f.module_id}:${(f as { reason?: string }).reason}`).join("; "),
  );
  assert.ok(results.length >= 1);
});
