/**
 * Founder completion BUILD — authenticated prod smoke (calendar/ATS/enrollment/AI).
 *
 * Env: RECRUITER_INBOX_TOKEN (Railway) + optional TWIN_PROD_TEST_JWT
 * Never prints tokens. Does not flip Pilot/Launch/Enrollment.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { loadFounderSmokeEnvIntoProcess } from "./founder-smoke-env-preflight.ts";
import { logProdSmokeCommitGate } from "./lib/prod-smoke-commit-gate";
import { RECRUITER_DEMO_COMPANY_SLUG } from "../src/lib/recruiter-inbox";

loadFounderSmokeEnvIntoProcess();

const API_BASE = (process.env.TWIN_PROD_API_BASE_URL ?? "https://twin-production-bcd9.up.railway.app").replace(
  /\/$/,
  "",
);
const PILOT =
  process.env.RECRUITER_INBOX_TOKEN?.trim() ||
  process.env.TWIN_RECRUITER_TOKEN?.trim() ||
  process.env.RECRUITER_TOKEN?.trim() ||
  "";
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim() || "";
const SLUG =
  process.env.TWIN_PROD_SMOKE_COMPANY_SLUG?.trim() || RECRUITER_DEMO_COMPANY_SLUG;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { ...init, signal: AbortSignal.timeout(45_000) });
  return { status: res.status, body: await res.text() };
}

async function recruiterJwt(): Promise<string | null> {
  if (!PILOT) return null;
  const exchange = await api("/api/v1/auth/recruiter/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Locale": "en" },
    body: JSON.stringify({ access_token: PILOT, company_slug: SLUG }),
  });
  if (exchange.status !== 200) return null;
  const body = JSON.parse(exchange.body) as { access_token?: string };
  return body.access_token || null;
}

test("0 public enrollment capability kill-switch OFF", async () => {
  await logProdSmokeCommitGate();
  const res = await api("/api/v1/platform/foundations/enrollment/capability");
  assert.equal(res.status, 200, res.body.slice(0, 200));
  const body = JSON.parse(res.body) as {
    external_pilot_enrollment_enabled: boolean;
    capability_ready: boolean;
    launch_stance: string;
  };
  assert.equal(body.external_pilot_enrollment_enabled, false);
  assert.equal(body.capability_ready, true);
  assert.equal(body.launch_stance, "OFF");
});

test("1 ATS status + sync dry-run", async (t) => {
  const jwt = await recruiterJwt();
  if (!jwt) {
    t.skip("recruiter session unavailable");
    return;
  }
  const headers = {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
  const st = await api("/api/v1/integrations/ats/status", { headers });
  assert.equal(st.status, 200, st.body.slice(0, 200));
  const preview = await api("/api/v1/integrations/ats/vacancies/preview?provider=greenhouse", {
    headers,
  });
  assert.equal(preview.status, 200, preview.body.slice(0, 200));
  const previewBody = JSON.parse(preview.body) as {
    jobs: unknown[];
    vacancy_import: string;
    writeback?: boolean;
  };
  assert.ok(Array.isArray(previewBody.jobs));
  assert.notEqual(previewBody.writeback, true);
  const dry = await api("/api/v1/integrations/ats/sync/dry-run", {
    method: "POST",
    headers,
    body: JSON.stringify({ company_slug: SLUG, application_id: 1, provider: "greenhouse" }),
  });
  assert.equal(dry.status, 201, dry.body.slice(0, 300));
  const body = JSON.parse(dry.body) as {
    dry_run: boolean;
    ats_write: boolean;
    evidence_table?: string;
  };
  assert.equal(body.dry_run, true);
  assert.equal(body.ats_write, false);
  assert.equal(body.evidence_table, "ats_sync_attempts");
  const attempts = await api(
    `/api/v1/integrations/ats/sync/attempts?company_slug=${encodeURIComponent(SLUG)}`,
    { headers },
  );
  assert.equal(attempts.status, 200, attempts.body.slice(0, 200));
  const abody = JSON.parse(attempts.body) as { table: string; total: number };
  assert.equal(abody.table, "ats_sync_attempts");
  assert.ok(abody.total >= 1);
});
test("2 recruiter calendar interviews + hold", async (t) => {
  const jwt = await recruiterJwt();
  if (!jwt) {
    t.skip("recruiter session unavailable");
    return;
  }
  const headers = {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
  const list = await api(`/api/v1/recruiter/calendar/interviews?company_slug=${encodeURIComponent(SLUG)}`, {
    headers,
  });
  assert.equal(list.status, 200, list.body.slice(0, 300));
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 90000000).toISOString();
  const hold = await api(`/api/v1/recruiter/calendar/holds?company_slug=${encodeURIComponent(SLUG)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "smoke-hold", starts_at: start, ends_at: end }),
  });
  assert.equal(hold.status, 201, hold.body.slice(0, 300));
});

test("3 company calendar hold + billing sandbox honesty", async (t) => {
  const jwt = await recruiterJwt();
  if (!jwt) {
    t.skip("recruiter session unavailable");
    return;
  }
  const headers = {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
  const q = `company_slug=${encodeURIComponent(SLUG)}`;
  const st = await api(`/api/v1/company/calendar/status?${q}`, { headers });
  assert.equal(st.status, 200, st.body.slice(0, 200));
  const start = new Date(Date.now() + 172800000).toISOString();
  const end = new Date(Date.now() + 176400000).toISOString();
  const hold = await api(`/api/v1/company/calendar/holds?${q}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "company-smoke-hold", starts_at: start, ends_at: end }),
  });
  assert.equal(hold.status, 201, hold.body.slice(0, 300));
  const bill = await api(`/api/v1/company/billing/checkout-session?${q}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan_sku: "company_pilot" }),
  });
  assert.ok(bill.status === 201 || bill.status === 200, bill.body.slice(0, 300));
  const body = JSON.parse(bill.body) as { livemode?: boolean; sandbox?: boolean };
  assert.notEqual(body.livemode, true);
});

test("4 candidate AI external verify when JWT present", async (t) => {
  if (!JWT) {
    t.skip("TWIN_PROD_TEST_JWT unset");
    return;
  }
  const headers = {
    Authorization: `Bearer ${JWT}`,
    "Content-Type": "application/json",
    "X-Locale": "en",
  };
  const res = await api("/api/v1/platform/ai-compliance/claims/1/external-verify", {
    method: "POST",
    headers,
  });
  // 201 verified, 403 flag off, 404/422 claim missing — all acceptable honesty outcomes
  assert.ok([201, 403, 404, 422].includes(res.status), res.body.slice(0, 300));
  if (res.status === 201) {
    const body = JSON.parse(res.body) as { autonomous_employment?: boolean; human_review_required?: boolean };
    assert.equal(body.autonomous_employment, false);
    assert.equal(body.human_review_required, true);
  }
});
