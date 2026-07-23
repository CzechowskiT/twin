/**
 * External connector activation — authenticated production smoke.
 *
 * Env:
 *   TWIN_PROD_TEST_JWT — metrics-excluded smoke account
 *   TWIN_PROD_SMOKE_WRITE=1 — required for Zapier subscribe/test/revoke + storage smoke
 *   TWIN_PROD_API_BASE_URL — optional (default Railway)
 *
 * Never prints JWT. Never posts to real Slack/Teams channels.
 * Does not flip Pilot / Gate F / Launch / Enrollment.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) process.env[key] = val;
  }
}
loadLocalEnv();

const API_BASE = (process.env.TWIN_PROD_API_BASE_URL ?? "https://twin-production-bcd9.up.railway.app").replace(
  /\/$/,
  "",
);
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim() || process.env.TWIN_ACCESS_TOKEN?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";

async function api(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(60_000),
  });
  return { status: res.status, body: await res.text() };
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${JWT}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
}

test("0 harness + commit gate", async () => {
  assert.ok(JWT, "TWIN_PROD_TEST_JWT or TWIN_ACCESS_TOKEN required");
  await logProdSmokeCommitGate({ apiBase: API_BASE });
});

test("1 connectors status capability split", async () => {
  const res = await api("/api/v1/platform/wave5/connectors/status", { headers: authHeaders() });
  assert.equal(res.status, 200, res.body.slice(0, 200));
  const body = JSON.parse(res.body) as {
    zapier: { status: string; marketplace_required?: boolean };
    storage: { status: string; backend: string };
    slack: { capabilities: Record<string, string> };
    teams: { capabilities: Record<string, string>; microsoft_oauth_configured?: boolean };
  };
  assert.equal(body.zapier.status, "READY");
  assert.equal(body.zapier.marketplace_required, false);
  assert.equal(body.storage.status, "LIVE");
  assert.ok(["local_filesystem", "s3_compatible"].includes(body.storage.backend));
  assert.equal(body.slack.capabilities.DRAFT, "LIVE");
  assert.equal(body.teams.capabilities.DRAFT, "LIVE");
  assert.equal(body.slack.capabilities.WRITE, "BLOCKED_EXTERNAL_CREDENTIALS");
});

test("2 google push status + public webhook ack", async () => {
  const st = await api("/api/v1/platform/wave5/google-push/status", { headers: authHeaders() });
  assert.equal(st.status, 200, st.body.slice(0, 200));
  const push = JSON.parse(st.body) as { status: string; watch_supported?: boolean };
  assert.equal(push.status, "READY", st.body.slice(0, 300));
  assert.equal(push.watch_supported, true);

  const wh = await api("/api/v1/calendar/google/push/webhook", {
    method: "POST",
    headers: {
      "X-Goog-Channel-ID": "twin-connector-smoke",
      "X-Goog-Resource-State": "sync",
    },
  });
  assert.equal(wh.status, 200, wh.body.slice(0, 200));
  const ack = JSON.parse(wh.body) as { ok: boolean; received: boolean };
  assert.equal(ack.ok, true);
  assert.equal(ack.received, true);
});

test("3 slack/teams draft only (no external delivery)", async () => {
  for (const connector of ["slack", "teams"] as const) {
    const res = await api("/api/v1/platform/wave5/connectors/draft", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ connector, title: "smoke", body: "draft-only", deliver: false }),
    });
    assert.equal(res.status, 200, res.body.slice(0, 200));
    const body = JSON.parse(res.body) as { draft: boolean; provider_write: boolean };
    assert.equal(body.draft, true);
    assert.equal(body.provider_write, false);
  }
});

test("4 storage smoke roundtrip", async () => {
  assert.ok(SMOKE_WRITE, "TWIN_PROD_SMOKE_WRITE=1 required");
  const res = await api("/api/v1/platform/wave5/connectors/storage/smoke", {
    method: "POST",
    headers: authHeaders(),
  });
  assert.equal(res.status, 200, res.body.slice(0, 300));
  const body = JSON.parse(res.body) as { ok: boolean; post_delete_denied?: boolean };
  assert.equal(body.ok, true);
  assert.equal(body.post_delete_denied, true);
});

test("5 zapier generic signed webhook lifecycle", async () => {
  assert.ok(SMOKE_WRITE, "TWIN_PROD_SMOKE_WRITE=1 required");
  const receiver = `${API_BASE}/api/v1/platform/wave5/connectors/test-receiver`;
  const created = await api("/api/v1/platform/wave5/connectors/zapier/subscriptions", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ target_url: receiver, event_filter: "twin.connector.test" }),
  });
  assert.equal(created.status, 200, created.body.slice(0, 300));
  const sub = JSON.parse(created.body) as { subscription_id: number; ok: boolean };
  assert.equal(sub.ok, true);
  assert.ok(sub.subscription_id);

  const delivered = await api(
    `/api/v1/platform/wave5/connectors/zapier/subscriptions/${sub.subscription_id}/test`,
    { method: "POST", headers: authHeaders() },
  );
  assert.equal(delivered.status, 200, delivered.body.slice(0, 400));
  const del = JSON.parse(delivered.body) as { ok: boolean; dead_letter?: boolean };
  assert.equal(del.ok, true, delivered.body.slice(0, 400));
  assert.equal(del.dead_letter, false);

  const revoked = await api(
    `/api/v1/platform/wave5/connectors/zapier/subscriptions/${sub.subscription_id}/revoke`,
    { method: "POST", headers: authHeaders() },
  );
  assert.equal(revoked.status, 200, revoked.body.slice(0, 200));
  const rev = JSON.parse(revoked.body) as { status: string };
  assert.equal(rev.status, "revoked");

  const after = await api(
    `/api/v1/platform/wave5/connectors/zapier/subscriptions/${sub.subscription_id}/test`,
    { method: "POST", headers: authHeaders() },
  );
  assert.equal(after.status, 422);
});
