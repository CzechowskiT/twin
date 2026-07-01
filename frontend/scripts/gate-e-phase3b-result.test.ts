/**
 * Slice 34 — Gate E Phase 3B prod result (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const GATE_E_RESULT = "docs/gate-e-phase3b-result-2026-06-28.md";
const GATE_E_ATTEMPT_1 = "docs/gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28.md";
const GATE_E_TEMPLATE = "docs/gate-e-phase3b-result-template-2026-06-28.md";
const GATE_D_RESULT = "docs/gate-d-prod-browser-smoke-result-2026-06-28.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";
const SLICE12 = "docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md";
const GATE_E_PACKAGE = "docs/GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md";

const CANONICAL_GATE_E_PROD_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 gate E result doc exists with FAIL verdict and founder YES", () => {
  const result = readRepo(GATE_E_RESULT);
  assert.match(result, /Gate E Phase 3B Controlled Multitab — Result/);
  assert.match(result, /Gate E = \*\*YES\*\*/);
  assert.match(result, /verdict:\s+FAIL/i);
  assert.match(result, /pass:\s+0/i);
  assert.match(result, /fail:\s+20/i);
  assert.match(result, /0\/20/i);
});

test("2 result doc — deploy alignment, attempt 1 ref, canonical command", () => {
  const result = readRepo(GATE_E_RESULT);
  assert.match(result, /alignment_status:\s+ALIGNED/i);
  assert.match(result, /public-health status:\s+ok/i);
  assert.match(result, /db_ok:\s+true/i);
  assert.match(result, /gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28\.md/);
  assert.match(result, /ABORTED_RESOURCE_SAFETY/i);
  assert.match(
    result,
    new RegExp(CANONICAL_GATE_E_PROD_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(result, /workers:\s+1/i);
  assert.match(result, /total routes:\s+20/i);
});

test("3 result doc — failure taxonomy; no overclaims", () => {
  const result = readRepo(GATE_E_RESULT);
  assert.match(result, /chrome-only \/ blank:\s+20/i);
  assert.match(result, /blank-or-no-content/i);
  assert.match(result, /P0 stance:\s+OPEN/i);
  assert.match(result, /Launch stance:\s+NO-GO/i);
  assert.match(result, /Gate F.*PENDING/i);
  assert.match(result, /Phase 3B.*FAIL/i);
  assert.doesNotMatch(result, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(result, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(result, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(result, /20\/20 PASS/i);
});

test("4 attempt 1 doc — ABORTED_RESOURCE_SAFETY, not product FAIL", () => {
  const attempt1 = readRepo(GATE_E_ATTEMPT_1);
  assert.match(attempt1, /ABORTED_RESOURCE_SAFETY/i);
  assert.match(attempt1, /NOT COMPLETED/i);
  assert.match(attempt1, /INCONCLUSIVE/i);
  assert.match(attempt1, /not a product FAIL/i);
  assert.match(attempt1, /P0.*OPEN/i);
  assert.match(attempt1, /NO-GO/i);
});

test("5 result template remains template-only; execution in dated result doc", () => {
  const template = readRepo(GATE_E_TEMPLATE);
  assert.match(template, /Template only/i);
  assert.match(template, /no Gate E execution recorded/i);
  assert.doesNotMatch(readRepo(GATE_E_RESULT), /Template only/i);
});

test("6 evidence index — Gate E YES FAIL; launch blocked", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-e-phase3b-result-2026-06-28\.md/);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /Phase 3B.*FAIL/i);
  assert.match(index, /0\/20/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("7 slice12 — Gate E executed FAIL; no launch GO", () => {
  const checklist = readRepo(SLICE12);
  assert.match(checklist, /gate-e-phase3b-result-2026-06-28/i);
  assert.match(checklist, /Gate E.*YES/i);
  assert.match(checklist, /Phase 3B.*FAIL/i);
  assert.match(checklist, /P0.*OPEN/i);
  assert.match(checklist, /NO-GO/i);
});

test("8 gate E package still historical PENDING package; result doc records execution", () => {
  const gateE = readRepo(GATE_E_PACKAGE);
  assert.match(gateE, /Gate E.*PENDING/i);
  const result = readRepo(GATE_E_RESULT);
  assert.match(result, /reattempt/i);
  assert.match(result, /Gate D.*PASS|36\/36/i);
});

test("9 smoke.yml — no Playwright; default CI browser disabled", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("10 npm script test:gate-e-phase3b-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-phase3b-result/);
  assert.match(pkg, /gate-e-phase3b-result\.test\.ts/);
});

test("11 gate D result still PASS prerequisite; Gate E FAIL does not undo Gate D", () => {
  const gateD = readRepo(GATE_D_RESULT);
  assert.match(gateD, /36\/36 PASS/i);
  assert.match(gateD, /verdict:\s+PASS/i);
});

test("12 harness diagnostics guard — stale commit removed, preflight wired", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:phase3b-harness-diagnostics/);
  const spec = readFileSync(join(root, "e2e/phase3b-controlled-multitab.spec.ts"), "utf8");
  assert.match(spec, /buildPhase3bPreflightSnapshot/);
  assert.doesNotMatch(spec, /fda7567/);
  const plan = readRepo("docs/PHASE3B_MULTITAB_HARNESS_DIAGNOSTIC_PLAN_2026-06-29.md");
  assert.match(plan, /Phase 3B.*FAIL/i);
  assert.match(plan, /frontend_commit/);
});

test("13 gate E retry checkpoint — PENDING, aligned deploy, no post-fix browser", () => {
  const checkpoint = readRepo("docs/GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md");
  assert.match(checkpoint, /Gate E retry after harness fix = YES/);
  assert.match(checkpoint, /2969b1f4/);
  assert.match(checkpoint, /ALIGNED/i);
  assert.match(checkpoint, /NOT EXECUTED|not executed|NOT RUN/i);
  assert.match(checkpoint, /test:phase3b-controlled-multitab-prod/);
  assert.match(checkpoint, /NOT TO RUN/i);
  assert.match(checkpoint, /TWIN_ACCESS_TOKEN/);
  assert.match(checkpoint, /Phase 3B.*FAIL/i);
  assert.match(checkpoint, /NO-GO/i);
  assert.match(checkpoint, /P0.*OPEN/i);
  assert.match(checkpoint, /Gate F.*PENDING/i);
  assert.doesNotMatch(checkpoint, /Phase 3B:\s*\*\*PASS\*\*/i);
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-retry-after-harness-fix-checkpoint/);
});
