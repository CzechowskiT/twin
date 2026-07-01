/**
 * Slice 37 — Gate E retry-after-harness-fix result (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const RETRY_RESULT = "docs/gate-e-phase3b-retry-after-harness-fix-result-2026-06-29.md";
const PRIOR_GATE_E_RESULT = "docs/gate-e-phase3b-result-2026-06-28.md";
const RETRY_CHECKPOINT = "docs/GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

const CANONICAL_GATE_E_RETRY_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 retry result doc exists with PARTIAL verdict and founder YES", () => {
  const result = readRepo(RETRY_RESULT);
  assert.match(result, /Gate E Phase 3B Retry After Harness Fix — Result/);
  assert.match(result, /Gate E retry after harness fix = \*\*YES\*\*/);
  assert.match(result, /verdict:\s+PARTIAL/i);
  assert.match(result, /AUTH_TOKEN_REQUIRED/);
});

test("2 retry result — token absent, browser NOT RUN, canonical command not executed", () => {
  const result = readRepo(RETRY_RESULT);
  assert.match(result, /token present in env:\s+false/i);
  assert.match(result, /browser NOT RUN|NOT RUN|not executed/i);
  assert.match(
    result,
    new RegExp(CANONICAL_GATE_E_RETRY_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(result, /alignment_status:\s+ALIGNED/i);
  assert.match(result, /public-health status:\s+ok/i);
  assert.match(result, /db_ok:\s+true/i);
  assert.match(result, /2969b1f4/);
});

test("3 retry result — no overclaims; prior 0/20 FAIL unchanged", () => {
  const result = readRepo(RETRY_RESULT);
  assert.match(result, /Phase 3B.*FAIL/i);
  assert.match(result, /0\/20/i);
  assert.match(result, /P0 stance:\s+OPEN/i);
  assert.match(result, /Launch stance:\s+NO-GO/i);
  assert.match(result, /Gate F.*PENDING/i);
  assert.doesNotMatch(result, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(result, /20\/20 PASS/i);
  assert.doesNotMatch(result, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(result, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  const prior = readRepo(PRIOR_GATE_E_RESULT);
  assert.match(prior, /verdict:\s+FAIL/i);
  assert.match(prior, /0\/20/i);
});

test("4 evidence index — post-harness retry PARTIAL; launch blocked", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-e-phase3b-retry-after-harness-fix-result-2026-06-29/);
  assert.match(index, /AUTH_TOKEN_REQUIRED|PARTIAL/i);
  assert.match(index, /Phase 3B.*FAIL/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("5 retry checkpoint — references result doc; harness fix SHA preserved", () => {
  const checkpoint = readRepo(RETRY_CHECKPOINT);
  assert.match(checkpoint, /2969b1f4/);
  assert.match(checkpoint, /gate-e-phase3b-retry-after-harness-fix-result-2026-06-29/);
  assert.match(checkpoint, /NO-GO/i);
  assert.match(checkpoint, /P0.*OPEN/i);
  assert.match(checkpoint, /Gate F.*PENDING/i);
  assert.doesNotMatch(checkpoint, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("6 smoke.yml — no Playwright; default CI browser disabled", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("7 npm script test:gate-e-retry-after-harness-fix-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-retry-after-harness-fix-result/);
  assert.match(pkg, /gate-e-retry-after-harness-fix-result\.test\.ts/);
});

test("8 retry result — attempt 2 recorded; second founder YES; token still absent", () => {
  const result = readRepo(RETRY_RESULT);
  assert.match(result, /Attempt 2 — Execution Record/);
  assert.match(result, /post-harness retry #2/i);
  assert.match(result, /second substantive authorization/i);
  assert.match(result, /d37d427f/);
  assert.match(result, /token present in env:\s+false/i);
  assert.match(result, /verdict:\s+PARTIAL/i);
  assert.match(result, /browser NOT RUN|NOT RUN/i);
});
