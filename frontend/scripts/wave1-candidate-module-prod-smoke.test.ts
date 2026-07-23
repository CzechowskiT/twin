/**
 * Wave 1 per-module candidate prod smoke.
 *
 * Env:
 *   TWIN_PROD_TEST_JWT — required for authenticated checks (fail-closed if missing)
 *   TWIN_PROD_SMOKE_WRITE=1 — required for mutation modules
 *   WAVE1_SMOKE_MODULES — comma list or "all" (default all smokeable pending modules)
 *
 * Never prints JWT. Excluded metrics account only. No Authologic start / no real outbound.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";
import {
  parseModuleSelection,
  runModuleSmoke,
  WAVE1_SMOKEABLE_MODULES,
} from "./lib/wave1-module-smoke-handlers";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const API_BASE = (process.env.TWIN_PROD_API_BASE_URL ?? "https://twin-production-bcd9.up.railway.app").replace(
  /\/$/,
  "",
);
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";
const MODULES = parseModuleSelection(process.env.WAVE1_SMOKE_MODULES);

async function fetchApi(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(45_000),
  });
  return { status: res.status, body: await res.text() };
}

test("0 harness artifacts + fail-closed without JWT documented", () => {
  assert.ok(WAVE1_SMOKEABLE_MODULES.length >= 6);
  assert.match(
    readFileSync(join(repoRoot, "frontend/package.json"), "utf8"),
    /test:wave1-candidate-module-prod-smoke/,
  );
  assert.ok(
    readFileSync(join(repoRoot, "frontend/scripts/lib/wave1-module-smoke-handlers.ts"), "utf8").includes(
      "identity_review",
    ),
  );
});

test("1 unauthenticated module paths return 401", async () => {
  for (const path of [
    "/api/v1/candidates/me/export.json",
    "/api/v1/candidates/me/trust/live-bundle",
    "/api/v1/kyc/status",
    "/api/v1/candidate-visibility-preferences",
    "/api/v1/candidates/me/matches",
    "/api/v1/candidates/me/match-feedback",
  ]) {
    const { status } = await fetchApi(path);
    assert.ok(status === 401 || status === 404, `${path} → ${status}`);
  }
});

test("2 public-health + enrollment still blocked", async () => {
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
  const headers = {
    Authorization: `Bearer ${JWT}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
  const bundle = await fetchApi("/api/v1/candidates/me/trust/live-bundle", { headers });
  assert.equal(bundle.status, 200, bundle.body.slice(0, 200));
  const data = JSON.parse(bundle.body) as {
    candidate_id: number;
    demo_fixture: boolean;
    identity: { workflow: string; fake_kyc_forbidden: boolean };
    export_lifecycle?: { ops_fulfillment_auto: boolean };
  };
  assert.equal(data.demo_fixture, false);
  assert.ok(data.candidate_id > 0);
  assert.equal(data.identity.fake_kyc_forbidden, true);
  assert.equal(data.identity.workflow, "manual_identity_review_status");
  if (data.export_lifecycle) {
    assert.equal(data.export_lifecycle.ops_fulfillment_auto, false);
  }

  if (!SMOKE_WRITE) {
    t.skip("SKIPPED writes — set TWIN_PROD_SMOKE_WRITE=1");
    return;
  }

  const ctx = {
    fetchApi,
    headers,
    write: true,
    candidateId: data.candidate_id,
  };

  const results = [];
  for (const moduleId of MODULES) {
    const result = await runModuleSmoke(moduleId, ctx);
    results.push(result);
    assert.equal(result.ok, true, `${moduleId}: ${"reason" in result ? result.reason : "ok"}`);
  }

  const passed = results.filter((r) => r.ok).map((r) => r.module_id);
  assert.ok(passed.length === MODULES.length, `expected ${MODULES.length} PASS, got ${passed.length}`);
  console.log(`wave1 module smoke PASS ${passed.length}/${MODULES.length}: ${passed.join(",")}`);
});
