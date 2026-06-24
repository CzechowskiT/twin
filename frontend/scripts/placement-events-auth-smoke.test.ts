/**
 * Production placement-events auth smoke — unauth 401/403; safe POST with JWT.
 * Extends persistence smoke pattern — see docs/AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const PROD_BASE = (process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app").replace(/\/$/, "");
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";

const PLACEMENT_EVENTS_PATH = "/api/v1/placement-events";
const NON_CANONICAL_PLACEMENT_EVENTS_PATH = "/api/placement-events";

const FORBIDDEN_RESPONSE_PATTERNS = [
  /employer confirmed/i,
  /invoice sent/i,
  /payment captured/i,
  /revenue recognized/i,
  /legally verified/i,
  /email sent/i,
  /ATS synced/i,
];

async function fetchStatus(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${PROD_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  return { status: res.status, body };
}

test("1 script and npm entry exist", () => {
  const pkg = readFileSync(join(scriptRoot, "package.json"), "utf8");
  assert.match(pkg, /test:placement-events-auth-smoke/);
  assert.match(pkg, /verify:prod-placement-events-auth/);
  assert.match(pkg, /test:prod-smoke-commit-gate/);
  assert.ok(readFileSync(fileURLToPath(import.meta.url), "utf8").includes(PLACEMENT_EVENTS_PATH));
});

test("1b prod smoke commit gate fields (read-only)", async () => {
  const gate = await logProdSmokeCommitGate();
  assert.ok(typeof gate.prod_frontend_commit === "string");
  assert.ok(typeof gate.prod_api_commit === "string");
  assert.ok(typeof gate.repo_head === "string");
  assert.ok(typeof gate.commit_interpretation === "string");
  assert.equal(typeof gate.docs_only_drift, "boolean");
  assert.ok(
    gate.alignment_status === "aligned" ||
      gate.alignment_status === "acceptable_docs_only_drift" ||
      gate.alignment_status === "failed_alignment",
  );
});

test("2 unauthenticated GET returns 401/403 not 404/500", async () => {
  const { status } = await fetchStatus(PLACEMENT_EVENTS_PATH);
  assert.ok(status === 401 || status === 403, `expected 401/403, got ${status}`);
  assert.notEqual(status, 404);
  assert.notEqual(status, 500);
});

test("2b non-canonical path without /v1 returns 404 — expected, not a failure", async () => {
  const { status } = await fetchStatus(NON_CANONICAL_PLACEMENT_EVENTS_PATH);
  assert.equal(status, 404, "canonical path is /api/v1/placement-events only");
});

test("3 skip message when JWT unset", async (t) => {
  if (JWT) {
    t.skip("JWT configured — unauth path verified above");
    return;
  }
  assert.ok(true, "SKIPPED authenticated placement-events POST — TWIN_PROD_TEST_JWT not configured");
});

test("4 authenticated POST smoke", async (t) => {
  if (!JWT) {
    t.skip("SKIPPED authenticated POST — TWIN_PROD_TEST_JWT not configured");
    return;
  }
  if (!SMOKE_WRITE) {
    t.skip("SKIPPED authenticated POST — set TWIN_PROD_SMOKE_WRITE=1");
    return;
  }

  const auth = { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" };
  const stamp = Date.now();
  const { status, body } = await fetchStatus(PLACEMENT_EVENTS_PATH, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      placement_id: "demo-placement-001",
      event_type: "demo_verification_recorded",
      event_status: "internal_only",
      actor_persona: "board",
      candidate_id: "demo-candidate-001",
      source: "twin_internal_prod_smoke",
      metadata: { scope: "twin_internal_prod_smoke", preview: "true" },
    }),
  });
  assert.equal(status, 201, body.slice(0, 300));
  for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
    assert.doesNotMatch(body, pattern);
  }
  const parsed = JSON.parse(body) as Record<string, unknown>;
  assert.equal(parsed.external_side_effect, false);
  assert.ok(
    parsed.source === "twin_internal" || parsed.source === "twin_internal_prod_smoke",
    `unexpected source: ${String(parsed.source)}`,
  );
  assert.ok(typeof parsed.id === "number");
  assert.ok(!("invoice" in parsed));
  assert.ok(!("payment" in parsed));
});

test("5 authenticated GET returns 200", async (t) => {
  if (!JWT) {
    t.skip("SKIPPED authenticated GET — TWIN_PROD_TEST_JWT not configured");
    return;
  }
  const { status } = await fetchStatus(PLACEMENT_EVENTS_PATH, {
    headers: { Authorization: `Bearer ${JWT}` },
  });
  assert.equal(status, 200);
});

test("6 authenticated GET with placement_id filter returns 200", async (t) => {
  if (!JWT) {
    t.skip("SKIPPED placement_id GET — TWIN_PROD_TEST_JWT not configured");
    return;
  }
  const { status } = await fetchStatus(`${PLACEMENT_EVENTS_PATH}?placement_id=demo-placement-001`, {
    headers: { Authorization: `Bearer ${JWT}` },
  });
  assert.equal(status, 200);
});

test("7 script never logs token", () => {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.doesNotMatch(self, /console\.(log|info|debug|warn|error)\([^)]*JWT/);
});
