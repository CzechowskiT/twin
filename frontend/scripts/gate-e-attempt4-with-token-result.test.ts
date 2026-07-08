/**
 * Slice 39 — Gate E Phase 3B attempt 4 with-token result (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT4_RESULT = "docs/gate-e-phase3b-attempt4-with-token-result-2026-06-29.md";
const PRIOR_GATE_E_RESULT = "docs/gate-e-phase3b-result-2026-06-28.md";
const PRIOR_RETRY_RESULT = "docs/gate-e-phase3b-retry-after-harness-fix-result-2026-06-29.md";
const WITH_TOKEN_RESULT_ATTEMPT3 = "docs/gate-e-phase3b-retry-with-token-result-2026-06-29.md";
const RETRY_CHECKPOINT = "docs/GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

const CANONICAL_GATE_E_RETRY_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt4 result doc exists with PARTIAL verdict and founder YES", () => {
  const result = readRepo(ATTEMPT4_RESULT);
  assert.match(result, /Gate E Phase 3B Attempt 4 With Token — Result/);
  assert.match(result, /founder authorized:\s+\*\*YES\*\*/);
  assert.match(result, /verdict:\s+PARTIAL/i);
  assert.match(result, /AUTH_TOKEN_REQUIRED/);
});

test("2 attempt4 result — token absent, browser NOT RUN, canonical command not executed", () => {
  const result = readRepo(ATTEMPT4_RESULT);
  assert.match(result, /TWIN_ACCESS_TOKEN_PRESENT=false/);
  assert.match(result, /token present in env:\s+false/i);
  assert.match(result, /browser NOT RUN|NOT RUN|NOT EXECUTED/i);
  assert.match(
    result,
    new RegExp(CANONICAL_GATE_E_RETRY_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(result, /alignment_status:\s+ALIGNED/i);
  assert.match(result, /public-health status:\s+ok/i);
  assert.match(result, /db_ok:\s+true/i);
  assert.match(result, /2969b1f4/);
  assert.match(result, /a5d964d1/);
});

test("3 attempt4 result — never logs, prints, commits, or documents token value", () => {
  const result = readRepo(ATTEMPT4_RESULT);
  assert.doesNotMatch(result, /TWIN_ACCESS_TOKEN\s*[:=]\s*[A-Za-z0-9_\-.]{8,}/);
  assert.match(result, /TWIN_ACCESS_TOKEN_PRESENT=false|token present in env:\s+false/i);
});

test("4 attempt4 result — no overclaims; prior 0/20 FAIL unchanged", () => {
  const result = readRepo(ATTEMPT4_RESULT);
  assert.match(result, /Phase 3B.*FAIL/i);
  assert.match(result, /0\/20/i);
  assert.match(result, /P0.*OPEN/i);
  assert.match(result, /Launch.*NO-GO/i);
  assert.match(result, /Gate F.*PENDING/i);
  assert.doesNotMatch(result, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(result, /20\/20 PASS/i);
  assert.doesNotMatch(result, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(result, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  const prior = readRepo(PRIOR_GATE_E_RESULT);
  assert.match(prior, /verdict:\s+FAIL/i);
  assert.match(prior, /0\/20/i);
});

test("5 attempt4 result — hard bans honoured section present", () => {
  const result = readRepo(ATTEMPT4_RESULT);
  assert.match(result, /NO second browser retry/i);
  assert.match(result, /NO local Phase 3B browser/i);
  assert.match(result, /NO Gate D browser/i);
  assert.match(result, /NO stress\/CPU storm/i);
  assert.match(result, /default CI browser enable/i);
  assert.match(result, /smoke\.yml.*changes/i);
  assert.match(result, /backend\/API\/auth\/DB\/env changes/i);
  assert.match(result, /prod mutations/i);
});

test("6 evidence index — attempt4 with-token retry PARTIAL; launch blocked", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-e-phase3b-attempt4-with-token-result-2026-06-29/);
  assert.match(index, /AUTH_TOKEN_REQUIRED|PARTIAL/i);
  assert.match(index, /Phase 3B.*FAIL/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("7 retry checkpoint — references attempt4 result; harness fix SHA preserved", () => {
  const checkpoint = readRepo(RETRY_CHECKPOINT);
  assert.match(checkpoint, /2969b1f4/);
  assert.match(checkpoint, /gate-e-phase3b-attempt4-with-token-result-2026-06-29/);
  assert.match(checkpoint, /NO-GO/i);
  assert.match(checkpoint, /P0.*OPEN/i);
  assert.match(checkpoint, /Gate F.*PENDING/i);
  assert.doesNotMatch(checkpoint, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("8 smoke.yml — no Playwright; default CI browser disabled", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("9 npm script test:gate-e-attempt4-with-token-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt4-with-token-result/);
  assert.match(pkg, /gate-e-attempt4-with-token-result\.test\.ts/);
});

test("10 attempt4 result — attempt history table preserves attempts 1-3 and adds attempt 4", () => {
  const result = readRepo(ATTEMPT4_RESULT);
  assert.match(result, /ABORTED_RESOURCE_SAFETY/);
  assert.match(result, /with-token retry #3/i);
  assert.match(result, /with-token retry #4/i);
  assert.match(result, /verdict:\s+PARTIAL/i);
  const priorWithToken = readRepo(WITH_TOKEN_RESULT_ATTEMPT3);
  assert.match(priorWithToken, /Attempt 3 — Execution Record/);
  const priorRetry = readRepo(PRIOR_RETRY_RESULT);
  assert.match(priorRetry, /post-harness retry #2/i);
});
