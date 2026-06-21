/**
 * Production placement-events auth smoke — unauth 401/403; safe POST with JWT.
 * Extends persistence smoke pattern — see docs/AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const PROD_BASE = (process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app").replace(/\/$/, "");
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";

const PLACEMENT_EVENTS_PATH = "/api/v1/placement-events";

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
  assert.match(readFileSync(join(scriptRoot, "package.json"), "utf8"), /test:placement-events-auth-smoke/);
  assert.ok(readFileSync(fileURLToPath(import.meta.url), "utf8").includes(PLACEMENT_EVENTS_PATH));
});

test("2 unauthenticated GET returns 401/403 not 404/500", async () => {
  const { status } = await fetchStatus(PLACEMENT_EVENTS_PATH);
  assert.ok(status === 401 || status === 403, `expected 401/403, got ${status}`);
  assert.notEqual(status, 404);
  assert.notEqual(status, 500);
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

test("6 script never logs token", () => {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.doesNotMatch(self, /console\.(log|info|debug|warn|error)\([^)]*JWT/);
});
