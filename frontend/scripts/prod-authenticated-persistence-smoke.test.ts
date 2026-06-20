/**
 * Production persistence smoke — unauth 401 by default; safe POSTs only with TWIN_PROD_TEST_JWT.
 * 12 assertions — see docs/AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const PROD_BASE = (process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app").replace(/\/$/, "");
const JWT = process.env.TWIN_PROD_TEST_JWT?.trim();
const SMOKE_WRITE = process.env.TWIN_PROD_SMOKE_WRITE === "1";

const PERSISTENCE_ENDPOINTS = [
  "audit-events",
  "work-items",
  "candidate-role-status",
  "review-queue",
  "company-feedback",
  "candidate-visibility-preferences",
  "export-requests",
  "request-intake",
] as const;

const FORBIDDEN_RESPONSE_PATTERNS = [
  /email sent/i,
  /verified successfully/i,
  /GDPR compliant/i,
  /persisted successfully/i,
  /saved successfully/i,
  /production write enabled/i,
  /export fulfilled/i,
  /\bhired\b/i,
  /\brejected\b/i,
  /offer sent/i,
];

const FORBIDDEN_STATUS_VALUES = ["hired", "rejected_final", "auto_rejected", "offer_sent"];

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

async function fetchStatus(path: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${PROD_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  return { status: res.status, body };
}

test("1 smoke script and docs exist", () => {
  assert.ok(readRepo("docs/AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md").includes("TWIN_PROD_TEST_JWT"));
  assert.ok(readRepo("docs/FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md").includes("TWIN_PROD_TEST_JWT"));
  assert.match(readRepo("frontend/package.json"), /test:prod-authenticated-persistence-smoke/);
  assert.match(readRepo("frontend/package.json"), /verify:prod-persistence-auth/);
});

test("2 no hardcoded JWT in smoke script", () => {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const jwtPrefix = "Bearer " + "eyJ";
  assert.ok(!self.includes(jwtPrefix));
  assert.doesNotMatch(self, /TWIN_PROD_TEST_JWT\s*=\s*["']eyJ/);
});

test("3 founder auth setup doc covers token handling", () => {
  const doc = readRepo("docs/FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md");
  assert.match(doc, /OAuth2PasswordBearer|Bearer JWT/i);
  assert.match(doc, /never commit/i);
  assert.match(doc, /TWIN_PROD_SMOKE_WRITE/);
  assert.match(doc, /mint.*not added|No token mint helper/i);
});

test("4 unauthenticated GET returns 401/403 on all persistence endpoints", async () => {
  for (const ep of PERSISTENCE_ENDPOINTS) {
    const { status } = await fetchStatus(`/api/v1/${ep}`);
    assert.ok(
      status === 401 || status === 403,
      `${ep} expected 401/403 without auth, got ${status}`,
    );
  }
});

test("5 admin migrations endpoint returns 401/403 without auth", async () => {
  const { status, body } = await fetchStatus("/api/v1/admin/migrations/current");
  assert.ok(status === 401 || status === 403, `admin/migrations/current expected 401/403, got ${status}`);
  assert.doesNotMatch(body, /postgresql:\/\//i);
  assert.doesNotMatch(body, /secret/i);
});

test("6 public-health 200 with db_ok and commit interpretation fields", async (t) => {
  const routeSrc = readRepo("frontend/src/app/api/public-health/route.ts");
  assert.match(routeSrc, /backend_git_commit/);
  assert.match(routeSrc, /commit_interpretation/);
  assert.match(routeSrc, /deployment_note/);

  const { status, body } = await fetchStatus("/api/public-health");
  assert.equal(status, 200, body.slice(0, 200));
  const json = JSON.parse(body) as Record<string, unknown>;
  assert.equal(json.status, "ok");
  assert.equal(json.db_ok, true);
  assert.ok(typeof json.frontend_commit === "string");
  assert.ok(typeof json.api_commit === "string");
  if (typeof json.backend_git_commit !== "string") {
    t.skip("commit clarity fields not deployed to prod yet — rerun after Vercel deploy");
    return;
  }
  assert.ok(typeof json.commit_interpretation === "string");
  assert.ok(typeof json.deployment_note === "string");
});

test("7 unauthenticated persistence GETs never 404 or 500", async () => {
  for (const ep of PERSISTENCE_ENDPOINTS) {
    const { status } = await fetchStatus(`/api/v1/${ep}`);
    assert.notEqual(status, 404, `${ep} must not 404`);
    assert.notEqual(status, 500, `${ep} must not 500`);
  }
});

test("8 skip message when TWIN_PROD_TEST_JWT unset", async (t) => {
  if (JWT) {
    t.skip("JWT configured — skip convention verified in docs only");
    return;
  }
  const doc = readRepo("docs/AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md");
  assert.match(doc, /SKIPPED authenticated.*TWIN_PROD_TEST_JWT/i);
  assert.match(doc, /Exit code \*\*0\*\*/);
});

test("9 authenticated POST smoke", async (t) => {
  if (!JWT) {
    t.skip("SKIPPED authenticated POST smoke — TWIN_PROD_TEST_JWT not configured");
    return;
  }
  if (!SMOKE_WRITE) {
    t.skip("SKIPPED authenticated POST — set TWIN_PROD_SMOKE_WRITE=1 to enable writes");
    return;
  }

  const { status: healthStatus, body: healthBody } = await fetchStatus("/api/public-health");
  assert.equal(healthStatus, 200, healthBody.slice(0, 200));
  const health = JSON.parse(healthBody) as Record<string, unknown>;
  assert.equal(health.db_ok, true);

  const auth = { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" };
  const stamp = Date.now();

  const posts: Array<{ path: string; body: Record<string, unknown> }> = [
    {
      path: "/api/v1/audit-events",
      body: {
        event_type: "prod_smoke_persistence_verified",
        actor_persona: "founder",
        target_type: "system",
        target_id: `prod-smoke-${stamp}`,
        metadata: {
          smoke_test: true,
          source: "twin_internal_prod_smoke",
          external_side_effect: false,
        },
      },
    },
    {
      path: "/api/v1/work-items",
      body: {
        item_type: "task",
        title: "Prod smoke internal task",
        status: "open",
        persona_scope: "recruiter",
      },
    },
    {
      path: "/api/v1/candidate-role-status",
      body: {
        candidate_ref: "demo-candidate-001",
        role_ref: "demo-role-001",
        status: "needs_feedback",
      },
    },
    {
      path: "/api/v1/review-queue",
      body: {
        item_kind: "trust_audit_review",
        subject_ref: `prod-smoke-${stamp}`,
        status: "open",
        priority: "low",
      },
    },
    {
      path: "/api/v1/company-feedback",
      body: {
        candidate_ref: "demo-candidate-001",
        role_ref: "demo-role-001",
        status: "draft",
        comment: "Prod smoke internal feedback draft",
      },
    },
    {
      path: "/api/v1/candidate-visibility-preferences",
      body: {
        candidate_id: "demo-candidate-001",
        profile_visibility: "pilot_visible",
        cv_visibility: "pilot_visible",
        match_visibility: "pilot_visible",
        company_visibility: "visible_preview",
        communication_preference: "manual_review_required",
      },
    },
    {
      path: "/api/v1/export-requests",
      body: {
        request_type: "candidate_export_preview",
        candidate_id: "demo-candidate-001",
        role_context_id: "demo-role-001",
        status: "preview_created",
      },
    },
    {
      path: "/api/v1/request-intake",
      body: {
        request_type: "correction_preview",
        subject_ref: `prod-smoke-${stamp}`,
        candidate_ref: "demo-candidate-001",
        status: "open",
      },
    },
  ];

  for (const { path, body } of posts) {
    const res = await fetch(`${PROD_BASE}${path}`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    assert.ok(res.status === 201 || res.status === 200, `${path} POST failed: ${res.status} ${text.slice(0, 200)}`);
    for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
      assert.doesNotMatch(text, pattern, `${path} response contains forbidden copy`);
    }
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if ("external_side_effect" in parsed) {
      assert.equal(parsed.external_side_effect, false);
    }
    if ("legal_claim" in parsed) {
      assert.notEqual(parsed.legal_claim, true);
    }
    const statusField = parsed.status;
    if (typeof statusField === "string") {
      assert.ok(!FORBIDDEN_STATUS_VALUES.includes(statusField), `${path} forbidden status ${statusField}`);
    }
  }
});

test("10 authenticated GET returns 200 on all persistence endpoints", async (t) => {
  if (!JWT) {
    t.skip("SKIPPED authenticated GET — TWIN_PROD_TEST_JWT not configured");
    return;
  }

  for (const ep of PERSISTENCE_ENDPOINTS) {
    const { status } = await fetchStatus(`/api/v1/${ep}`, { headers: { Authorization: `Bearer ${JWT}` } });
    assert.ok(status === 200, `authenticated GET ${ep} expected 200, got ${status}`);
  }
});

test("11 POST responses contain safe internal markers where available", async (t) => {
  if (!JWT || !SMOKE_WRITE) {
    t.skip("SKIPPED marker check — authenticated POST not enabled");
    return;
  }

  const auth = { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" };
  const { status, body } = await fetchStatus("/api/v1/audit-events", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      event_type: "prod_smoke_persistence_verified",
      actor_persona: "founder",
      target_type: "system",
      target_id: `prod-smoke-marker-${Date.now()}`,
      metadata: { smoke_test: true, source: "twin_internal_prod_smoke", external_side_effect: false },
    }),
  });
  assert.ok(status === 201 || status === 200, body.slice(0, 200));
  const parsed = JSON.parse(body) as Record<string, unknown>;
  const meta = parsed.metadata ?? parsed.metadata_json;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    assert.equal(m.smoke_test, true);
    assert.equal(m.external_side_effect, false);
  }
});

test("12 script never logs token value", () => {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.doesNotMatch(self, /console\.(log|info|debug|warn|error)\([^)]*JWT/);
  assert.doesNotMatch(self, /console\.(log|info|debug|warn|error)\([^)]*Bearer/);
});
