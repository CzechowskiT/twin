/**
 * Slice 32 — Gate D prod browser smoke result (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const GATE_D_RESULT = "docs/gate-d-prod-browser-smoke-result-2026-06-28.md";
const GATE_D_RESULT_TEMPLATE = "docs/gate-d-prod-browser-smoke-result-template-2026-06-28.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";
const SLICE12 = "docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md";
const GATE_E = "docs/gate-e-phase3b-prerequisites-decision-2026-06-28.md";

const CANONICAL_GATE_D_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:p0-no-headless-final-state-browser -- --workers=1";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 gate D result doc exists with PASS verdict and founder YES", () => {
  const result = readRepo(GATE_D_RESULT);
  assert.match(result, /Gate D Production Browser Smoke — Result/);
  assert.match(result, /Gate D = \*\*YES\*\*/);
  assert.match(result, /verdict:\s+PASS/i);
  assert.match(result, /pass:\s+36/i);
  assert.match(result, /fail:\s+0/i);
  assert.match(result, /36\/36 PASS/i);
});

test("2 result doc — deploy alignment and canonical command recorded", () => {
  const result = readRepo(GATE_D_RESULT);
  assert.match(result, /alignment_status:\s+ALIGNED/i);
  assert.match(result, /public-health status:\s+ok/i);
  assert.match(result, /db_ok:\s+true/i);
  assert.match(
    result,
    new RegExp(CANONICAL_GATE_D_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(result, /workers:\s+1/i);
  assert.match(result, /total routes:\s+36/i);
});

test("3 result doc — failure taxonomy zero counts; no overclaims", () => {
  const result = readRepo(GATE_D_RESULT);
  for (const code of ["A", "B", "C", "D", "E", "F", "G", "H", "I"]) {
    assert.match(result, new RegExp(`${code} .*:\\s+0`));
  }
  assert.match(result, /P0 stance:\s+OPEN/i);
  assert.match(result, /Launch stance:\s+NO-GO/i);
  assert.match(result, /Phase 3B.*HARD BLOCKED/i);
  assert.match(result, /Phase 3B.*NOT RUN/i);
  assert.match(result, /Gate E.*PENDING/i);
  assert.doesNotMatch(result, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(result, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(result, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("4 result template remains template-only; execution in dated result doc", () => {
  const template = readRepo(GATE_D_RESULT_TEMPLATE);
  assert.match(template, /Template only/i);
  assert.match(template, /Gate D remains PENDING/i);
  assert.match(template, /no Gate D execution recorded/i);
  assert.doesNotMatch(readRepo(GATE_D_RESULT), /Template only/i);
});

test("5 evidence index — Gate D YES prod PASS; Gate E PENDING; launch blocked", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-d-prod-browser-smoke-result-2026-06-28\.md/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /36\/36 PASS/i);
  assert.match(index, /Gate E.*PENDING/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.match(index, /Phase 3B.*(NOT RUN|HARD BLOCKED|BLOCKED)/i);
});

test("6 slice12 — Gate D YES prod browser; Phase 3B still blocked", () => {
  const checklist = readRepo(SLICE12);
  assert.match(checklist, /gate-d-prod-browser-smoke-result-2026-06-28/i);
  assert.match(checklist, /Gate D.*YES/i);
  assert.match(checklist, /Gate E.*PENDING/i);
  assert.match(checklist, /Phase 3B.*HARD BLOCKED/i);
  assert.match(checklist, /P0.*OPEN/i);
  assert.match(checklist, /NO-GO/i);
});

test("7 gate E still requires separate founder YES; Gate D PASS prerequisite documented", () => {
  const gateE = readRepo(GATE_E);
  assert.match(gateE, /Gate D.*PASS/i);
  assert.match(gateE, /does NOT approve Gate E/i);
  assert.match(gateE, /Gate E.*PENDING/i);
  assert.match(gateE, /Phase 3B.*HARD BLOCKED/i);
});

test("8 smoke.yml — no Playwright; default CI browser disabled", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /p0-no-headless-final-state-browser/);
});

test("9 npm script test:gate-d-prod-browser-smoke-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-d-prod-browser-smoke-result/);
  assert.match(pkg, /gate-d-prod-browser-smoke-result\.test\.ts/);
});
