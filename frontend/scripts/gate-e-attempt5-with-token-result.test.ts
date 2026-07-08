/**
 * Slice 41 — Gate E Phase 3B attempt 5 with-token result (static, no browser).
 *
 * Attempt 5 is the first with-token retry where TWIN_ACCESS_TOKEN was actually
 * present and the browser actually ran. It crashed at module load
 * (HARNESS_LOAD_FAILURE, a new classification) before any route executed, due
 * to an ESM/CommonJS interop bug in the Slice 40 loader. The bug was fixed in
 * the same PR and verified without a second browser run (tsc + tsx +
 * `playwright --list`, none of which launch a browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT5_RESULT = "docs/gate-e-phase3b-attempt5-with-token-result-2026-06-29.md";
const ATTEMPT4_RESULT = "docs/gate-e-phase3b-attempt4-with-token-result-2026-06-29.md";
const PRIOR_GATE_E_RESULT = "docs/gate-e-phase3b-result-2026-06-28.md";
const RETRY_CHECKPOINT = "docs/GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";
const LOADER_SOURCE = "e2e/helpers/load-local-test-env.ts";

const CANONICAL_GATE_E_RETRY_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 attempt5 result doc exists — token present, browser executed once, HARNESS_LOAD_FAILURE", () => {
  const result = readRepo(ATTEMPT5_RESULT);
  assert.match(result, /Gate E Phase 3B Attempt 5 With Token — Result/);
  assert.match(result, /founder authorized:\s+\*\*YES\*\*/);
  assert.match(result, /TWIN_ACCESS_TOKEN_PRESENT=true/);
  assert.match(result, /HARNESS_LOAD_FAILURE/);
  assert.match(result, /verdict:\s+PARTIAL/i);
});

test("2 attempt5 result — token present this time, not AUTH_TOKEN_REQUIRED; canonical command executed once", () => {
  const result = readRepo(ATTEMPT5_RESULT);
  assert.match(result, /token present in env:\s+true/i);
  assert.match(result, /AUTH_TOKEN_REQUIRED:\s+0/);
  assert.match(
    result,
    new RegExp(CANONICAL_GATE_E_RETRY_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(result, /alignment_status:\s+ALIGNED/i);
  assert.match(result, /public-health status:\s+ok/i);
  assert.match(result, /db_ok:\s+true/i);
});

test("3 attempt5 result — never logs, prints, commits, or documents token value", () => {
  const result = readRepo(ATTEMPT5_RESULT);
  assert.doesNotMatch(result, /TWIN_ACCESS_TOKEN\s*[:=]\s*[A-Za-z0-9_\-.]{8,}/);
  assert.match(result, /TWIN_ACCESS_TOKEN_PRESENT=true|token present in env:\s+true/i);
});

test("4 attempt5 result — root cause + fix documented; loader fix explicitly not browser-verified", () => {
  const result = readRepo(ATTEMPT5_RESULT);
  assert.match(result, /import\.meta\.url/);
  assert.match(result, /Root cause/i);
  assert.match(result, /Fix applied in this same PR/i);
  assert.match(result, /NOT verified:\s+whether Phase 3B routes would PASS\/FAIL/i);
  assert.match(result, /playwright test e2e\/phase3b-controlled-multitab\.spec\.ts --list/);
  assert.doesNotMatch(result, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("5 attempt5 result — no overclaims; prior 0/20 FAIL unchanged", () => {
  const result = readRepo(ATTEMPT5_RESULT);
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

test("6 attempt5 result — exactly one browser run; --list verification is not a browser run", () => {
  const result = readRepo(ATTEMPT5_RESULT);
  assert.match(result, /exactly \*\*one\*\*/i);
  assert.match(result, /does not launch a browser/i);
  assert.match(result, /NOT a browser run/i);
});

test("7 attempt5 result — hard bans honoured section present", () => {
  const result = readRepo(ATTEMPT5_RESULT);
  assert.match(result, /NO second browser retry/i);
  assert.match(result, /NO local Phase 3B browser/i);
  assert.match(result, /NO Gate D browser/i);
  assert.match(result, /NO stress\/CPU storm/i);
  assert.match(result, /default CI browser enable/i);
  assert.match(result, /smoke\.yml.*changes/i);
  assert.match(result, /backend\/API\/auth\/DB\/env changes/i);
  assert.match(result, /prod mutations/i);
});

test("8 loader source fix — no top-level import.meta.url; __dirname tried first; no console logging", () => {
  const source = read(LOADER_SOURCE);
  assert.match(source, /function resolveHelpersDir/);
  assert.match(source, /typeof __dirname === "string"/);
  assert.match(source, /\(0, eval\)\("import\.meta\.url"\)/);
  assert.doesNotMatch(source, /const HELPERS_DIR = dirname\(fileURLToPath\(import\.meta\.url\)\);/);
  assert.doesNotMatch(source, /console\.(log|error|warn|info|debug)/);
});

test("9 evidence index — attempt5 with-token retry PARTIAL/HARNESS_LOAD_FAILURE; launch blocked", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-e-phase3b-attempt5-with-token-result-2026-06-29/);
  assert.match(index, /HARNESS_LOAD_FAILURE/i);
  assert.match(index, /Phase 3B.*FAIL/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("10 retry checkpoint — references attempt5 result; harness fix SHA preserved", () => {
  const checkpoint = readRepo(RETRY_CHECKPOINT);
  assert.match(checkpoint, /2969b1f4/);
  assert.match(checkpoint, /gate-e-phase3b-attempt5-with-token-result-2026-06-29/);
  assert.match(checkpoint, /NO-GO/i);
  assert.match(checkpoint, /P0.*OPEN/i);
  assert.match(checkpoint, /Gate F.*PENDING/i);
  assert.doesNotMatch(checkpoint, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("11 smoke.yml — no Playwright; default CI browser disabled", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("12 npm script test:gate-e-attempt5-with-token-result registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:gate-e-attempt5-with-token-result/);
  assert.match(pkg, /gate-e-attempt5-with-token-result\.test\.ts/);
});

test("13 attempt5 result — attempt history table preserves attempts 1-4 and adds attempt 5", () => {
  const result = readRepo(ATTEMPT5_RESULT);
  assert.match(result, /ABORTED_RESOURCE_SAFETY/);
  assert.match(result, /with-token retry #3/i);
  assert.match(result, /with-token retry #4/i);
  assert.match(result, /with-token retry #5/i);
  const priorAttempt4 = readRepo(ATTEMPT4_RESULT);
  assert.match(priorAttempt4, /Attempt 4 — Execution Record/);
});
