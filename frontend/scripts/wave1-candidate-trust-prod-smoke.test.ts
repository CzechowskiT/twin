/**
 * Wave 1 candidate trust prod smoke — unauth 401 by default;
 * authenticated mutations only with TWIN_PROD_TEST_JWT + TWIN_PROD_SMOKE_WRITE=1
 * on an exclude_from_product_metrics account. No outbound email / NS pollution.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PROD_BASE = (process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app").replace(/\/$/, "");
const API_BASE = (process.env.TWIN_PROD_API_BASE_URL ?? "https://twin-production-bcd9.up.railway.app").replace(
  /\/$/,
  "",
);
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";

async function fetchApi(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
  });
  return { status: res.status, body: await res.text() };
}

test("1 wave1 smoke artifacts exist", () => {
  assert.ok(readFileSync(join(repoRoot, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json"), "utf8").includes("HELD_POLICY"));
  assert.match(
    readFileSync(join(repoRoot, "frontend/package.json"), "utf8"),
    /test:wave1-candidate-trust-prod-smoke/,
  );
});

test("2 unauthenticated trust live paths return 401 (404 until Wave1 deploy)", async () => {
  for (const path of [
    "/api/v1/candidates/me/trust/live-bundle",
    "/api/v1/candidates/me/trust/activity-timeline",
    "/api/v1/platform/wave1/status",
    "/api/v1/platform/wave1/hard-live/evidence",
  ]) {
    const { status } = await fetchApi(path);
    assert.ok(status === 401 || status === 404, `${path} expected 401/404, got ${status}`);
  }
});

test("3 public-health aligned + enrollment gate off", async () => {
  const gate = await logProdSmokeCommitGate();
  assert.ok(typeof gate.prod_frontend_commit === "string");
  const en = await fetchApi("/api/v1/platform/foundations/enrollment-gate");
  assert.equal(en.status, 200);
  const body = JSON.parse(en.body) as { external_pilot_enrollment_enabled: boolean; pilot: string };
  assert.equal(body.external_pilot_enrollment_enabled, false);
  assert.equal(body.pilot, "BLOCKED_BY_FOUNDER");
  const fe = await fetch(`${PROD_BASE}/api/public-health`, { signal: AbortSignal.timeout(15_000) });
  assert.equal(fe.status, 200);
  const ph = (await fe.json()) as { status: string; db_ok: boolean };
  assert.equal(ph.status, "ok");
  assert.equal(ph.db_ok, true);
});

test("4 authenticated wave1 bundle + privacy mutation (opt-in)", async (t) => {
  if (!JWT) {
    t.skip("SKIPPED — set TWIN_PROD_TEST_JWT on excluded metrics test account");
    return;
  }
  const headers = {
    Authorization: `Bearer ${JWT}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
  const status = await fetchApi("/api/v1/platform/wave1/status", { headers });
  assert.equal(status.status, 200, status.body.slice(0, 200));
  const st = JSON.parse(status.body) as { live_claim: boolean; launch: string };
  assert.equal(st.live_claim, false);
  assert.equal(st.launch, "NO-GO");

  const bundle = await fetchApi("/api/v1/candidates/me/trust/live-bundle", { headers });
  assert.equal(bundle.status, 200, bundle.body.slice(0, 200));
  const data = JSON.parse(bundle.body) as {
    source: string;
    demo_fixture: boolean;
    candidate_id: number;
  };
  assert.equal(data.source, "live");
  assert.equal(data.demo_fixture, false);
  assert.ok(data.candidate_id > 0);
  assert.doesNotMatch(bundle.body, /demo-candidate-001/);

  if (!SMOKE_WRITE) {
    t.skip("SKIPPED writes — set TWIN_PROD_SMOKE_WRITE=1 for mutation smoke");
    return;
  }
  const key = `wave1-smoke-${Date.now()}`;
  const created = await fetchApi("/api/v1/candidates/me/privacy-requests", {
    method: "POST",
    headers,
    body: JSON.stringify({
      request_type: "correction",
      payload: { note: "wave1 smoke — no outbound", source: "wave1_prod_smoke" },
      idempotency_key: key,
    }),
  });
  assert.equal(created.status, 201, created.body.slice(0, 300));
  const again = await fetchApi("/api/v1/candidates/me/privacy-requests", {
    method: "POST",
    headers,
    body: JSON.stringify({
      request_type: "correction",
      payload: { note: "wave1 smoke — no outbound", source: "wave1_prod_smoke" },
      idempotency_key: key,
    }),
  });
  assert.equal(again.status, 201);
  assert.equal(JSON.parse(created.body).id, JSON.parse(again.body).id);

  // Cleanup: cancel open request — no email outbound.
  const id = JSON.parse(created.body).id as number;
  const cancel = await fetchApi(`/api/v1/candidates/me/privacy-requests/${id}/cancel`, {
    method: "POST",
    headers,
  });
  assert.ok(cancel.status === 200 || cancel.status === 422, cancel.body.slice(0, 200));
});
