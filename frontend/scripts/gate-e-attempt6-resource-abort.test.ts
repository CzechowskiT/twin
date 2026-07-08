/**
 * Slice 42 — Gate E Phase 3B attempt 6 resource-safety abort (static, no browser).
 *
 * Attempt 6 started the canonical prod Phase 3B command after both the
 * TWIN_ACCESS_TOKEN loader (PR #360/#361) and the ESM/CommonJS harness load
 * crash (PR #362 / attempt 5) were fixed, but was manually interrupted when
 * multiple chrome-headless-shell instances saturated CPU and kernel_task rose.
 * This is ABORTED_RESOURCE_SAFETY (INCONCLUSIVE) — not a product FAIL, not a
 * Phase 3B PASS. No automatic retry was performed; attempt 7 requires a
 * separate founder decision — see GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md,
 * which this guard confirms does NOT authorize attempt 7.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT6_ABORT = "docs/gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md";
const ATTEMPT7_SAFETY_PLAN = "docs/GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md";
const ATTEMPT5_RESULT = "docs/gate-e-phase3b-attempt5-with-token-result-2026-06-29.md";
const ATTEMPT1_ABORT = "docs/gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28.md";
const PRIOR_GATE_E_RESULT = "docs/gate-e-phase3b-result-2026-06-28.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

const CANONICAL_GATE_E_RETRY_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt6 abort doc exists — ABORTED_RESOURCE_SAFETY, INCONCLUSIVE", () => {
  const doc = readRepo(ATTEMPT6_ABORT);
  assert.match(doc, /Gate E Phase 3B — Attempt 6 — ABORTED_RESOURCE_SAFETY/);
  assert.match(doc, /ABORTED_RESOURCE_SAFETY/);
  assert.match(doc, /INCONCLUSIVE/);
});

test("2 attempt6 abort doc — Phase 3B NOT COMPLETED, Gate F PENDING, P0 OPEN, Launch NO-GO", () => {
  const doc = readRepo(ATTEMPT6_ABORT);
  assert.match(doc, /Phase 3B.*NOT COMPLETED/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("3 attempt6 abort doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED)", () => {
  const doc = readRepo(ATTEMPT6_ABORT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Phase 3B \(attempt 6\):\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
});

test("4 attempt6 abort doc — founder authorization, token present, process cleanup confirmed", () => {
  const doc = readRepo(ATTEMPT6_ABORT);
  assert.match(doc, /founder authorized:\s*\*\*YES\*\*/i);
  assert.match(doc, /token present in env:\s*true/i);
  assert.match(doc, /chrome-headless-shell/);
  assert.match(doc, /kernel_task/);
  assert.match(doc, /chrome-headless-shell count after cleanup:\s*\*?\*?0/i);
  assert.match(doc, /playwright \/ npm phase3b process count after cleanup:\s*\*?\*?0/i);
});

test("5 attempt6 abort doc — route-level result is zero/none; no second automatic retry", () => {
  const doc = readRepo(ATTEMPT6_ABORT);
  assert.match(doc, /routes evaluated:\s*0/i);
  assert.match(doc, /pass:\s*0/i);
  assert.match(doc, /fail:\s*0/i);
  assert.match(doc, /NO second automatic retry/i);
  assert.match(doc, new RegExp(CANONICAL_GATE_E_RETRY_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("6 attempt6 abort doc — prior 0/20 FAIL unchanged, references attempt 1 and attempt 5", () => {
  const doc = readRepo(ATTEMPT6_ABORT);
  assert.match(doc, /0\/20/);
  assert.match(doc, /gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28/);
  assert.match(doc, /gate-e-phase3b-attempt5-with-token-result-2026-06-29/);
  const prior = readRepo(PRIOR_GATE_E_RESULT);
  assert.match(prior, /verdict:\s+FAIL/i);
  const attempt1 = readRepo(ATTEMPT1_ABORT);
  assert.match(attempt1, /ABORTED_RESOURCE_SAFETY/);
  const attempt5 = readRepo(ATTEMPT5_RESULT);
  assert.match(attempt5, /HARNESS_LOAD_FAILURE/);
});

test("7 attempt7 safety plan exists — NOT authorized, requires separate founder YES", () => {
  const plan = readRepo(ATTEMPT7_SAFETY_PLAN);
  assert.match(plan, /Gate E Phase 3B — Attempt 7 Safety Plan/);
  assert.match(plan, /NOT AUTHORIZED/);
  assert.match(plan, /NOT RUN/);
  assert.match(plan, /Separate Founder Authorization/i);
  assert.match(plan, /Gate E attempt 7 with resource-safety limits = YES\?/);
});

test("8 attempt7 safety plan — requires workers=1 / bounded concurrency; forbids automatic retry", () => {
  const plan = readRepo(ATTEMPT7_SAFETY_PLAN);
  assert.match(plan, /workers=1/);
  assert.match(plan, /(hard cap|bounded).*concurrency|concurrency.*(cap|bound)/i);
  assert.match(plan, /NO automatic retry/i);
  assert.match(plan, /stop (immediately|on)/i);
});

test("9 attempt7 safety plan — no overclaims; hard bans section present", () => {
  const plan = readRepo(ATTEMPT7_SAFETY_PLAN);
  assert.doesNotMatch(plan, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(plan, /Launch stance:\s*\*\*GO\*\*/i);
  assert.match(plan, /NO Launch GO/i);
  assert.match(plan, /NO P0 closure/i);
  assert.match(plan, /NO Gate F YES/i);
  assert.match(plan, /NO stress\/CPU storm/i);
  assert.match(plan, /backend\/API\/auth\/DB\/env changes/i);
});

test("10 evidence index references attempt6 abort and attempt7 safety plan; stance preserved", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29/);
  assert.match(index, /ABORTED_RESOURCE_SAFETY/);
  assert.match(index, /GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29/);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("11 npm script test:gate-e-attempt6-resource-abort registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt6-resource-abort/);
  assert.match(pkg, /gate-e-attempt6-resource-abort\.test\.ts/);
});

test("12 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});
