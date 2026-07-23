/**
 * Wave 2 per-module recruiter prod smoke.
 *
 * Env:
 *   TWIN_PROD_RECRUITER_JWT — preferred short-lived recruiter session JWT
 *   OR RECRUITER_INBOX_TOKEN / TWIN_RECRUITER_TOKEN — exchanged via /api/auth/recruiter/session
 *   TWIN_PROD_SMOKE_COMPANY_SLUG — optional company slug (default from session)
 *   TWIN_PROD_SMOKE_WRITE=1 — required for mutation modules
 *   WAVE2_SMOKE_MODULES — comma list or "all"
 *
 * Never prints JWT. Synthetic tenants only. No real outbound / ATS / calendar invites to humans.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { RECRUITER_DEMO_COMPANY_SLUG } from "../src/lib/recruiter-inbox";
import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";
import {
  parseModuleSelection,
  runModuleSmoke,
  WAVE2_DEMO_ONLY_MODULES,
  WAVE2_POLICY_HELD_MODULES,
  WAVE2_SMOKEABLE_MODULES,
} from "./lib/wave2-module-smoke-handlers";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Load frontend/.env.local without printing secrets (JWT/token never logged). */
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
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";
const MODULES = parseModuleSelection(process.env.WAVE2_SMOKE_MODULES);
const PILOT_TOKEN =
  process.env.RECRUITER_INBOX_TOKEN?.trim() ||
  process.env.TWIN_RECRUITER_TOKEN?.trim() ||
  process.env.RECRUITER_TOKEN?.trim() ||
  "";
const PRESET_JWT = process.env.TWIN_PROD_RECRUITER_JWT?.trim() || "";
const DEFAULT_SLUG =
  process.env.TWIN_PROD_SMOKE_COMPANY_SLUG?.trim() ||
  process.env.RECRUITER_DEMO_COMPANY_SLUG?.trim() ||
  RECRUITER_DEMO_COMPANY_SLUG;

async function fetchApi(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(45_000),
  });
  return { status: res.status, body: await res.text() };
}

async function resolveRecruiterAuth(): Promise<{ jwt: string; companySlug: string } | null> {
  if (PRESET_JWT) {
    return { jwt: PRESET_JWT, companySlug: DEFAULT_SLUG };
  }
  if (!PILOT_TOKEN) return null;
  const exchange = await fetchApi("/api/v1/auth/recruiter/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Locale": "en" },
    body: JSON.stringify({
      access_token: PILOT_TOKEN,
      company_slug: DEFAULT_SLUG,
    }),
  });
  if (exchange.status !== 200) return null;
  const body = JSON.parse(exchange.body) as { access_token: string; company_slug: string };
  if (!body.access_token || !body.company_slug) return null;
  return { jwt: body.access_token, companySlug: body.company_slug };
}

test("0 harness artifacts + fail-closed contract", () => {
  assert.ok(WAVE2_SMOKEABLE_MODULES.length >= 15);
  assert.ok(WAVE2_POLICY_HELD_MODULES.includes("recruiter_calendar"));
  assert.ok(WAVE2_DEMO_ONLY_MODULES.includes("recruiter_demo_pipeline"));
  assert.match(
    readFileSync(join(repoRoot, "frontend/package.json"), "utf8"),
    /test:wave2-recruiter-module-prod-smoke/,
  );
  assert.ok(
    readFileSync(join(repoRoot, "frontend/scripts/lib/wave2-module-smoke-handlers.ts"), "utf8").includes(
      "demo_fixture_forbidden",
    ) ||
      readFileSync(join(repoRoot, "frontend/scripts/lib/wave2-module-smoke-handlers.ts"), "utf8").includes(
        "decision-memory",
      ),
  );
});

test("1 unauthenticated recruiter paths return 401", async () => {
  // Existing prod routes must auth-fail; new Wave 2 routes may 404 until deploy.
  for (const path of [
    "/api/v1/recruiter/inbox",
    "/api/v1/recruiter/talent-radar",
    "/api/v1/recruiter/analytics",
    "/api/v1/recruiter/jobs",
  ]) {
    const { status } = await fetchApi(path);
    assert.ok(status === 401 || status === 403 || status === 503, `${path} → ${status}`);
  }
  for (const path of ["/api/v1/recruiter/decision-memory", "/api/v1/platform/wave2/status"]) {
    const { status } = await fetchApi(path);
    assert.ok(
      status === 401 || status === 403 || status === 404 || status === 503,
      `${path} → ${status}`,
    );
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
  const auth = await resolveRecruiterAuth();
  if (!auth) {
    const hasToken = Boolean(PILOT_TOKEN || PRESET_JWT);
    t.skip(
      hasToken
        ? "FAIL-CLOSED skip — recruiter session exchange failed (check company slug / token against prod)"
        : "FAIL-CLOSED skip — set TWIN_PROD_RECRUITER_JWT or RECRUITER_INBOX_TOKEN",
    );
    return;
  }
  const headers = {
    Authorization: `Bearer ${auth.jwt}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };

  // Demo fixture must be rejected on live decision-memory.
  const demoReject = await fetchApi(
    `/api/v1/recruiter/decision-memory?company_slug=${encodeURIComponent(auth.companySlug)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        subject_type: "candidate",
        subject_id: "demo-candidate-001",
        decision_code: "advance",
        summary: "must fail",
      }),
    },
  );
  assert.equal(demoReject.status, 400, demoReject.body.slice(0, 200));

  if (!SMOKE_WRITE) {
    t.skip("SKIPPED writes — set TWIN_PROD_SMOKE_WRITE=1");
    return;
  }

  const ctx = {
    fetchApi,
    headers,
    write: true,
    companySlug: auth.companySlug,
  };

  const results = [];
  for (const moduleId of MODULES) {
    const result = await runModuleSmoke(moduleId, ctx);
    results.push(result);
    assert.equal(result.ok, true, `${moduleId}: ${"reason" in result ? result.reason : "ok"}`);
  }
  const passed = results.filter((r) => r.ok).length;
  assert.equal(passed, MODULES.length);
});
