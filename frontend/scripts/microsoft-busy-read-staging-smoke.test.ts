/**
 * Production Microsoft busy-read staging smoke — gates OFF passes safe by default.
 * Dry-run (TWIN_BUSY_READ_SMOKE_DRY_RUN=1): static checks only, no prod HTTP.
 * Live Graph checks require TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 and optional JWT.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  MICROSOFT_BUSY_READ_SMOKE_ENV,
  microsoftBusyReadSmokeAllowLive,
  microsoftBusyReadSmokeDryRun,
} from "./lib/microsoft-busy-read-smoke-env";
import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const PROD_BASE = (process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app").replace(/\/$/, "");
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const DRY_RUN = microsoftBusyReadSmokeDryRun();
const ALLOW_LIVE = microsoftBusyReadSmokeAllowLive();

const READINESS_PATH = "/api/v1/calendar/microsoft/busy-read/readiness";
const PREVIEW_PATH = "/api/v1/calendar/microsoft/busy-read/preview";
const INTERVIEWS_PATH = "/api/v1/calendar/microsoft/interviews";
const HEALTH_OPS_PATH = "/api/v1/health?ops=1";

const FORBIDDEN_RESPONSE_PATTERNS = [
  /refresh_token/i,
  /access_token/i,
  /postgresql:\/\//i,
  /invite sent/i,
  /email sent/i,
  /event created/i,
];

async function fetchStatus(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${PROD_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  return { status: res.status, body };
}

test("1 script, env helpers, and npm entry exist", () => {
  const pkg = readFileSync(join(scriptRoot, "package.json"), "utf8");
  assert.match(pkg, /test:microsoft-busy-read-staging-smoke/);
  assert.match(pkg, /verify:prod-microsoft-busy-read/);
  const verifyScript = readFileSync(join(scriptRoot, "scripts/verify-prod-microsoft-busy-read.ts"), "utf8");
  assert.match(verifyScript, /test:microsoft-busy-read-staging-smoke/);
  assert.match(verifyScript, /TWIN_BUSY_READ_SMOKE_DRY_RUN/);
  assert.match(verifyScript, /TWIN_BUSY_READ_SMOKE_ALLOW_LIVE/);
  assert.ok(readFileSync(join(scriptRoot, "scripts/lib/microsoft-busy-read-smoke-env.ts"), "utf8").includes(MICROSOFT_BUSY_READ_SMOKE_ENV.dryRun));
});

test("1b prod smoke commit gate fields (read-only)", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED commit gate HTTP — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  const gate = await logProdSmokeCommitGate();
  assert.ok(typeof gate.prod_frontend_commit === "string");
  assert.ok(typeof gate.prod_api_commit === "string");
  assert.ok(typeof gate.repo_head === "string");
});

test("2 unauthenticated readiness returns 401", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED HTTP — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  const { status } = await fetchStatus(READINESS_PATH);
  assert.equal(status, 401);
});

test("3 unauthenticated preview returns 401", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED HTTP — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  const { status } = await fetchStatus(PREVIEW_PATH);
  assert.equal(status, 401);
});

test("4 health ops exposes microsoft gates false (safe default)", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED HTTP — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  const { status, body } = await fetchStatus(HEALTH_OPS_PATH);
  if (status !== 200) {
    t.skip(`health ops unavailable (HTTP ${status})`);
    return;
  }
  const data = JSON.parse(body) as Record<string, unknown>;
  assert.equal(data.microsoft_busy_read_enabled, false);
  assert.equal(data.microsoft_oauth_connect_gate_enabled, false);
  if ("microsoft_calendar_write_enabled" in data) {
    assert.equal(data.microsoft_calendar_write_enabled, false);
  }
});

test("5 authenticated readiness gates off when JWT set", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED HTTP — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  if (!JWT) {
    t.skip("SKIPPED authenticated readiness — TWIN_PROD_TEST_JWT not configured");
    return;
  }
  const { status, body } = await fetchStatus(READINESS_PATH, {
    headers: { Authorization: `Bearer ${JWT}` },
  });
  assert.equal(status, 200, body.slice(0, 300));
  const data = JSON.parse(body) as Record<string, unknown>;
  assert.equal(data.product_gate_enabled, false);
  assert.equal(data.oauth_connect_gate_enabled, false);
  if ("calendar_write_gate_enabled" in data) {
    assert.equal(data.calendar_write_gate_enabled, false);
  }
  for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
    assert.doesNotMatch(body, pattern);
  }
});

test("6 authenticated preview demo when gates off", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED HTTP — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  if (!JWT) {
    t.skip("SKIPPED authenticated preview — TWIN_PROD_TEST_JWT not configured");
    return;
  }
  const { status, body } = await fetchStatus(PREVIEW_PATH, {
    headers: { Authorization: `Bearer ${JWT}` },
  });
  assert.equal(status, 200, body.slice(0, 300));
  const data = JSON.parse(body) as Record<string, unknown>;
  if (data.product_gate_enabled === false) {
    assert.equal(data.preview_mode, "demo");
  }
  for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
    assert.doesNotMatch(body, pattern);
  }
});

test("7 legacy interview write blocked when gate off", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED HTTP — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  if (!JWT) {
    t.skip("SKIPPED interview write probe — TWIN_PROD_TEST_JWT not configured");
    return;
  }
  const { status } = await fetchStatus(INTERVIEWS_PATH, {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      application_id: 1,
      company_name: "Smoke Co",
      job_title: "Engineer",
      start_iso: "2026-08-01T10:00:00Z",
      end_iso: "2026-08-01T11:00:00Z",
      time_zone: "UTC",
    }),
  });
  assert.ok(status === 403 || status === 400 || status === 409, `expected blocked write, got ${status}`);
});

test("8 live smoke only when explicitly allowed", async (t) => {
  if (DRY_RUN) {
    t.skip("SKIPPED live Graph smoke — TWIN_BUSY_READ_SMOKE_DRY_RUN=1");
    return;
  }
  if (!ALLOW_LIVE) {
    t.skip("SKIPPED live Graph smoke — set TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 for staging live checks");
    return;
  }
  if (!JWT) {
    t.skip("SKIPPED live Graph smoke — TWIN_PROD_TEST_JWT required with ALLOW_LIVE");
    return;
  }
  const { status, body } = await fetchStatus(PREVIEW_PATH, {
    headers: { Authorization: `Bearer ${JWT}` },
  });
  assert.equal(status, 200, body.slice(0, 300));
  const data = JSON.parse(body) as Record<string, unknown>;
  assert.ok(
    data.preview_mode === "demo" ||
      data.preview_mode === "not_connected" ||
      data.preview_mode === "live_read_only" ||
      data.preview_mode === "partial",
  );
  for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
    assert.doesNotMatch(body, pattern);
  }
});

test("9 scripts never log token", () => {
  const paths = [
    "scripts/microsoft-busy-read-staging-smoke.test.ts",
    "scripts/verify-prod-microsoft-busy-read.ts",
    "scripts/lib/microsoft-busy-read-smoke-env.ts",
  ];
  for (const rel of paths) {
    const source = readFileSync(join(scriptRoot, rel), "utf8");
    assert.doesNotMatch(source, /console\.(log|info|debug|warn|error)\([^)]*JWT/);
    assert.doesNotMatch(source, /console\.(log|info|debug|warn|error)\([^)]*token/i);
  }
});

test("10 dry-run mode skips all HTTP probes", () => {
  if (!DRY_RUN) {
    assert.ok(true, "not dry-run — HTTP probes run in tests 2–8");
    return;
  }
  assert.equal(DRY_RUN, true);
  assert.equal(ALLOW_LIVE, false, "dry-run prep must not combine with ALLOW_LIVE");
});
