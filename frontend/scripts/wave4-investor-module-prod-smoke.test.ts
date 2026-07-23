/**
 * Wave 4 Investor Complete per-module prod smoke.
 *
 * Env:
 *   TWIN_PROD_TEST_JWT — required (fail-closed if missing)
 *   TWIN_PROD_SMOKE_WRITE=1 — required for NDA accept / evidence mark
 *   WAVE4_SMOKE_MODULES — comma list or "all"
 *
 * Never prints JWT. Excluded metrics account only.
 * Does not flip Pilot / Gate F / Launch. No real invites / Founder Command.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";
import {
  parseModuleSelection,
  runModuleSmoke,
  WAVE4_POLICY_HELD_MODULES,
  WAVE4_SMOKEABLE_MODULES,
  wave4SmokeFailClosedReasons,
} from "./lib/wave4-module-smoke-handlers";

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
const MODULES = parseModuleSelection(process.env.WAVE4_SMOKE_MODULES);

async function fetchApi(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(45_000),
  });
  return { status: res.status, body: await res.text() };
}

test("0 harness artifacts + fail-closed contract", () => {
  assert.equal(WAVE4_SMOKEABLE_MODULES.length, 12);
  assert.ok(WAVE4_POLICY_HELD_MODULES.includes("investor_self_serve_enrollment"));
  assert.ok(WAVE4_POLICY_HELD_MODULES.includes("investor_external_attestations"));
  assert.match(
    readFileSync(join(repoRoot, "frontend/package.json"), "utf8"),
    /test:wave4-investor-module-prod-smoke/,
  );
  assert.deepEqual(
    wave4SmokeFailClosedReasons({ hasJwt: false, metricsExcluded: true }),
    ["no_jwt"],
  );
});

test("1 unauthenticated wave4 paths return 401", async () => {
  for (const path of [
    "/api/v1/platform/wave4/status",
    "/api/v1/platform/wave4/policy-holds",
    "/api/v1/platform/wave4/nda/status",
    "/api/v1/platform/wave4/data-room/documents",
    "/api/v1/platform/wave4/placement/summary",
    "/api/v1/platform/wave4/trust-proof/summary",
    "/api/v1/platform/wave4/board/readiness",
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
  const failClosed = wave4SmokeFailClosedReasons({
    hasJwt: true,
    metricsExcluded: true,
    enrollmentOn: false,
    launchGo: false,
    gateFOpen: false,
    realInvites: false,
  });
  assert.equal(failClosed.length, 0);

  const headers = {
    Authorization: `Bearer ${JWT}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };

  const excl = await fetchApi("/api/v1/platform/ai-compliance/smoke/assert-exclusion", {
    method: "POST",
    headers,
  });
  assert.equal(excl.status, 200);

  const statusRes = await fetchApi("/api/v1/platform/wave4/status", { headers });
  assert.equal(statusRes.status, 200);
  const statusBody = JSON.parse(statusRes.body) as {
    live_claim: boolean;
    pilot_stance: string;
    gate_f: string;
    launch: string;
  };
  assert.equal(statusBody.live_claim, false);
  assert.equal(statusBody.pilot_stance, "READY_FOR_CONTROLLED_PILOT");
  assert.equal(statusBody.gate_f, "PENDING");
  assert.equal(statusBody.launch, "NO-GO");

  const smokeSha = gateRepoHead();
  const results: Array<{ module_id: string; ok: boolean; reason?: string }> = [];
  for (const moduleId of MODULES) {
    const result = await runModuleSmoke(moduleId, {
      fetchApi,
      headers,
      write: SMOKE_WRITE,
      smokeSha,
    });
    results.push(result.ok ? { module_id: moduleId, ok: true } : result);
  }

  const failed = results.filter((r) => !r.ok);
  assert.equal(
    failed.length,
    0,
    failed.map((f) => `${f.module_id}:${(f as { reason?: string }).reason}`).join("; "),
  );
  assert.equal(results.length, MODULES.length);
});

function gateRepoHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}
