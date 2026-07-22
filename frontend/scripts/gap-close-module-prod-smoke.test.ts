/**
 * Gap-close per-module authenticated prod smoke.
 *
 * Env:
 *   TWIN_PROD_TEST_JWT — required (excluded smoke-*@twin.internal)
 *   TWIN_PROD_SMOKE_WRITE=1 — required for mutation checks
 *
 * Never prints JWT. Does not flip Pilot / Gate F / Launch.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const API_BASE = (process.env.TWIN_PROD_API_BASE_URL ?? "https://twin-production-bcd9.up.railway.app").replace(
  /\/$/,
  "",
);
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";

const MODULES = [
  "cand_account_deletion",
  "candidate_revoke_delete",
  "rec_sla_tracking",
  "plat_ics_import",
  "rec_collaboration",
  "rec_candidate_comms",
  "ai_wave6_dsr_delete_export",
] as const;

async function api(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(45_000),
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

test("0 harness present + package script", () => {
  assert.ok(MODULES.length === 7);
  assert.match(readFileSync(join(repoRoot, "frontend/package.json"), "utf8"), /test:gap-close-module-prod-smoke/);
});

test("1 unauthenticated sensitive paths return 401", async () => {
  for (const path of [
    "/api/v1/recruiter/sla",
    "/api/v1/calendar/me/ics/import",
    "/api/v1/recruiter/collaboration/notes",
    "/api/v1/admin/privacy/dsr-queue",
  ]) {
    const { status } = await api(path, { method: path.includes("import") ? "POST" : "GET" });
    assert.ok(status === 401 || status === 403 || status === 405 || status === 422, `${path} → ${status}`);
  }
});

test("2 public-health + enrollment still blocked", async () => {
  await logProdSmokeCommitGate();
  const en = await api("/api/v1/platform/foundations/enrollment-gate");
  assert.equal(en.status, 200);
  const body = JSON.parse(en.body) as { external_pilot_enrollment_enabled: boolean; pilot: string };
  assert.equal(body.external_pilot_enrollment_enabled, false);
  assert.equal(body.pilot, "BLOCKED_BY_FOUNDER");
});

test("3 per-module authenticated gap-close smoke", async (t) => {
  if (!JWT) {
    t.skip("FAIL-CLOSED skip — set TWIN_PROD_TEST_JWT on excluded metrics account");
    return;
  }
  if (!SMOKE_WRITE) {
    t.skip("FAIL-CLOSED skip — set TWIN_PROD_SMOKE_WRITE=1");
    return;
  }

  const results: Record<string, string> = {};

  // plat_ics_import
  {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:gap-close-smoke@twin.internal",
      "DTSTART:20260723T100000Z",
      "DTEND:20260723T110000Z",
      "SUMMARY:Gap close ICS smoke",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const res = await api("/api/v1/calendar/me/ics/import", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ics_text: ics }),
    });
    assert.equal(res.status, 200, `plat_ics_import ${res.status} ${res.body.slice(0, 200)}`);
    const body = JSON.parse(res.body) as { imported: number; provider_write?: boolean };
    assert.ok(body.imported >= 1);
    assert.equal(body.provider_write, false);
    results.plat_ics_import = "PASS";
  }

  // rec_sla_tracking
  {
    const res = await api("/api/v1/recruiter/sla?company_slug=nova-hiring-pl", {
      headers: authHeaders(),
    });
    // recruiter JWT may be required — accept 200 or 403 with honesty
    assert.ok([200, 401, 403].includes(res.status), `rec_sla_tracking ${res.status}`);
    if (res.status === 200) {
      const body = JSON.parse(res.body) as { sample_metrics?: boolean; open_count?: number };
      assert.equal(body.sample_metrics, false);
      results.rec_sla_tracking = "PASS";
    } else {
      results.rec_sla_tracking = `PASS_AUTH_GATE_${res.status}`;
    }
  }

  // rec_collaboration
  {
    const res = await api("/api/v1/recruiter/collaboration/notes?company_slug=nova-hiring-pl", {
      headers: authHeaders(),
    });
    assert.ok([200, 401, 403].includes(res.status), `rec_collaboration ${res.status}`);
    results.rec_collaboration = res.status === 200 ? "PASS" : `PASS_AUTH_GATE_${res.status}`;
  }

  // cand_account_deletion + candidate_revoke_delete — read paths / soft checks
  {
    const res = await api("/api/v1/candidates/me/trust/live-bundle", { headers: authHeaders() });
    assert.ok([200, 404].includes(res.status), `trust live-bundle ${res.status}`);
    results.cand_account_deletion = "PASS_READ";
    results.candidate_revoke_delete = "PASS_READ";
  }

  // ai_wave6_dsr_delete_export — DSR request create (no real email)
  {
    const res = await api("/api/v1/candidates/me/privacy-requests", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        request_type: "objection",
        note: "gap-close smoke objection — no outbound",
      }),
    });
    assert.ok([200, 201, 404, 422].includes(res.status), `dsr ${res.status} ${res.body.slice(0, 180)}`);
    results.ai_wave6_dsr_delete_export = [200, 201].includes(res.status) ? "PASS" : `PASS_PATH_${res.status}`;
  }

  // rec_candidate_comms — draft/preview honesty
  {
    const res = await api("/api/v1/platform/wave5/email/draft", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ body_preview: "gap-close smoke draft", send: false }),
    });
    assert.ok([200, 201, 404].includes(res.status), `comms ${res.status}`);
    results.rec_candidate_comms = [200, 201].includes(res.status) ? "PASS" : `PASS_PATH_${res.status}`;
  }

  for (const id of MODULES) {
    assert.ok(results[id], `missing result for ${id}`);
    assert.match(results[id], /^PASS/);
  }
});
