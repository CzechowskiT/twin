/**
 * Gap-close per-module authenticated prod smoke.
 *
 * Env:
 *   TWIN_PROD_TEST_JWT — candidate excluded smoke account JWT
 *   TWIN_PROD_RECRUITER_JWT — optional recruiter session JWT
 *   OR RECRUITER_INBOX_TOKEN (Railway prod) exchanged via /api/v1/auth/recruiter/session
 *   TWIN_PROD_SMOKE_WRITE=1 — required for mutation checks
 *
 * Never prints JWT. Does not flip Pilot / Gate F / Launch.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { RECRUITER_DEMO_COMPANY_SLUG } from "../src/lib/recruiter-inbox";
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
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";
const COMPANY =
  process.env.TWIN_PROD_SMOKE_COMPANY_SLUG?.trim() ||
  process.env.RECRUITER_DEMO_COMPANY_SLUG?.trim() ||
  RECRUITER_DEMO_COMPANY_SLUG;

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

function authHeaders(token = JWT): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
}

async function resolveRecruiterJwt(): Promise<string | null> {
  const preset = process.env.TWIN_PROD_RECRUITER_JWT?.trim();
  if (preset) return preset;
  const pilot =
    process.env.RECRUITER_INBOX_TOKEN?.trim() ||
    process.env.TWIN_RECRUITER_TOKEN?.trim() ||
    process.env.RECRUITER_TOKEN?.trim() ||
    "";
  if (!pilot) return null;
  const exchange = await api("/api/v1/auth/recruiter/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Locale": "en" },
    body: JSON.stringify({ access_token: pilot, company_slug: COMPANY }),
  });
  if (exchange.status !== 200) return null;
  const body = JSON.parse(exchange.body) as { access_token?: string };
  return body.access_token?.trim() || null;
}

test("0 harness present + package script", () => {
  assert.ok(MODULES.length === 7);
  assert.match(readFileSync(join(repoRoot, "frontend/package.json"), "utf8"), /test:gap-close-module-prod-smoke/);
});

test("1 unauthenticated sensitive paths return 401", async () => {
  for (const path of [
    "/api/v1/recruiter/sla",
    "/api/v1/calendar/me/ics/import",
    "/api/v1/recruiter/collaboration/notes?subject_type=candidate&subject_id=1",
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
  assert.equal(body.pilot, "READY_FOR_CONTROLLED_PILOT");
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

  const recruiterJwt = await resolveRecruiterJwt();
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
    assert.ok(recruiterJwt, "recruiter JWT required for SLA");
    const res = await api(`/api/v1/recruiter/sla?company_slug=${encodeURIComponent(COMPANY)}`, {
      headers: authHeaders(recruiterJwt),
    });
    assert.equal(res.status, 200, `rec_sla_tracking ${res.status} ${res.body.slice(0, 200)}`);
    const body = JSON.parse(res.body) as { sample_metrics?: boolean };
    assert.equal(body.sample_metrics, false);
    results.rec_sla_tracking = "PASS";
  }

  // rec_collaboration
  {
    assert.ok(recruiterJwt, "recruiter JWT required for collaboration");
    const list = await api(
      `/api/v1/recruiter/collaboration/notes?company_slug=${encodeURIComponent(COMPANY)}&subject_type=candidate&subject_id=18`,
      { headers: authHeaders(recruiterJwt) },
    );
    assert.equal(list.status, 200, `rec_collaboration list ${list.status} ${list.body.slice(0, 200)}`);
    const listed = JSON.parse(list.body) as { demo?: boolean };
    assert.equal(listed.demo, false);
    const created = await api(`/api/v1/recruiter/collaboration/notes?company_slug=${encodeURIComponent(COMPANY)}`, {
      method: "POST",
      headers: authHeaders(recruiterJwt),
      body: JSON.stringify({
        subject_type: "candidate",
        subject_id: "18",
        body: "gap-close smoke note",
        author_label: "smoke",
      }),
    });
    assert.ok([200, 201].includes(created.status), `rec_collaboration create ${created.status}`);
    results.rec_collaboration = "PASS";
  }

  // cand_account_deletion + candidate_revoke_delete — read paths / soft checks
  {
    const res = await api("/api/v1/candidates/me/trust/live-bundle", { headers: authHeaders() });
    assert.ok([200, 404].includes(res.status), `trust live-bundle ${res.status}`);
    results.cand_account_deletion = "PASS_READ";
    results.candidate_revoke_delete = "PASS_READ";
  }

  // ai_wave6_dsr_delete_export — ensure profile then DSR create (no real email)
  {
    const profile = await api("/api/v1/candidates/me", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        name: "Gap Close Smoke",
        location: "Warsaw",
        experience_years: 3,
        skills: ["smoke"],
        desired_roles: ["engineer"],
      }),
    });
    assert.ok([200, 201].includes(profile.status), `profile bootstrap ${profile.status} ${profile.body.slice(0, 160)}`);
    const res = await api("/api/v1/candidates/me/privacy-requests", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        request_type: "objection",
        payload: { note: "gap-close smoke objection — no outbound" },
        idempotency_key: `gap-close-objection-${Date.now()}`,
      }),
    });
    assert.ok([200, 201].includes(res.status), `dsr ${res.status} ${res.body.slice(0, 180)}`);
    results.ai_wave6_dsr_delete_export = "PASS";
  }

  // rec_candidate_comms — draft/preview honesty (unique preview avoids outbox conflicts)
  {
    const res = await api("/api/v1/platform/wave5/email/draft", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        body_preview: `gap-close smoke draft ${Date.now()}`,
        send: false,
      }),
    });
    assert.ok([200, 201].includes(res.status), `comms ${res.status} ${res.body.slice(0, 180)}`);
    const body = JSON.parse(res.body) as { draft?: boolean; send?: boolean; provider_write?: boolean };
    assert.equal(body.draft, true);
    assert.equal(body.send, false);
    assert.equal(body.provider_write, false);
    results.rec_candidate_comms = "PASS";
  }

  for (const id of MODULES) {
    assert.ok(results[id], `missing result for ${id}`);
    assert.match(results[id], /^PASS/);
  }
});
