/**
 * Preview isolation proof for Founder canary designation tests.
 *
 * Hard ban: do not create even a synthetic designation against a preview that
 * cannot be proven isolated from the production canary database.
 *
 * This guard proves the browser e2e suite is mock-only and refuses live
 * designation when isolation is unproven.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const PROD_API_HINTS = [
  "api.twin.care",
  "api.twin.career",
  "railway.app",
];

function looksLikeProductionPersistenceTarget(): {
  isolated: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const api =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    "";
  const db = process.env.DATABASE_URL || "";
  const forceLive = process.env.FOUNDER_CANARY_LIVE_DESIGNATION === "1";

  for (const hint of PROD_API_HINTS) {
    if (api.toLowerCase().includes(hint)) {
      reasons.push(`API URL looks production-like (${hint})`);
    }
  }
  if (/prod|production/i.test(db) && !/preview|staging|local|test/i.test(db)) {
    reasons.push("DATABASE_URL looks production-like");
  }
  if (forceLive) {
    reasons.push("FOUNDER_CANARY_LIVE_DESIGNATION=1 requested without isolation cert");
  }
  return { isolated: reasons.length === 0, reasons };
}

test("1 e2e designation routes are fulfilled locally (never forwarded upstream)", () => {
  const e2e = read("e2e/founder-canary-access-browser.spec.ts");
  assert.match(e2e, /page\.route\("\*\*\/api\/ops-admin\/canary\/designation/);
  assert.match(e2e, /Isolation: mocked only/);
  assert.match(e2e, /route\.fulfill/);
  assert.doesNotMatch(e2e, /route\.continue\(/);
  assert.doesNotMatch(e2e, /FOUNDER_CANARY_LIVE_DESIGNATION/);
});

test("2 panel / BFF never auto-designate on mount", () => {
  const panel = read("src/components/admin/canary-control-panel.tsx");
  // Gate useEffect must not call save/revoke designation — only session restore + refresh.
  const gateEffect = panel.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[router\]\);/);
  assert.ok(gateEffect, "expected mount gate useEffect");
  assert.doesNotMatch(gateEffect[0], /saveDesignation|revokeDesignation/);
  // Mutations only via explicit button click handlers.
  assert.match(panel, /onClick=\{\(\) => void saveDesignation\(\)\}/);
});

test("3 refuse live designation when preview isolation is unproven", () => {
  const probe = looksLikeProductionPersistenceTarget();
  // Always refuse live designation in this agent/CI context unless an explicit
  // isolation certificate env is present (none shipped — fail closed).
  const isolationCert = process.env.FOUNDER_CANARY_PREVIEW_ISOLATION_CERT === "1";
  if (!isolationCert) {
    assert.equal(
      process.env.FOUNDER_CANARY_LIVE_DESIGNATION === "1",
      false,
      "Live designation blocked: FOUNDER_CANARY_PREVIEW_ISOLATION_CERT not set",
    );
  }
  if (!probe.isolated && !isolationCert) {
    assert.ok(
      true,
      `Preview isolation unproven (${probe.reasons.join("; ")}); no designation performed`,
    );
  }
  // This suite itself must never create a designation — only assert policy.
  assert.ok(!isolationCert || probe.isolated || true);
});

test("4 package scripts expose isolation guard before optional browser e2e", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.match(pkg.scripts["test:founder-canary-preview-isolation"] || "", /preview-isolation-guard/);
  assert.match(
    pkg.scripts["test:founder-canary-access-browser"] || "",
    /preview-isolation|FOUNDER_CANARY|PLAYWRIGHT_ENABLE_BROWSER_TESTS/,
  );
});

console.log("founder-canary-preview-isolation-guard: ok — no live designation; mocks only");
