/**
 * Slice 36 — Gate E retry-after-harness-fix checkpoint (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const CHECKPOINT = "docs/GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md";
const HARNESS_PLAN = "docs/PHASE3B_MULTITAB_HARNESS_DIAGNOSTIC_PLAN_2026-06-29.md";
const GATE_E_RESULT = "docs/gate-e-phase3b-result-2026-06-28.md";

const FOUNDER_QUESTION =
  "Do you approve Gate E retry after harness fix = YES to run controlled Phase 3B validation on production?";

const CANONICAL_GATE_E_RETRY_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod";

const HARNESS_FIX_SHA = "2969b1f4";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 checkpoint doc exists with correct title", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /Gate E Retry After Harness Fix Checkpoint/);
});

test("2 checkpoint references PR #353 and merge 2969b1f4", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /PR #353/);
  assert.match(checkpoint, /2969b1f4/);
  const plan = readRepo(HARNESS_PLAN);
  assert.match(plan, /2969b1f4|PR #353|harness/i);
});

test("3 purpose — no browser executed; does not claim Phase 3B fixed", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const purpose = checkpoint.split("## 1. Purpose")[1]?.split("## 2.")[0] ?? "";
  assert.match(purpose, /does NOT/i);
  assert.match(purpose, /Execute Phase 3B/i);
  assert.match(purpose, /Claim Phase 3B fixed/i);
  assert.match(checkpoint, /NOT EXECUTED|not executed|NOT RUN/i);
  assert.doesNotMatch(checkpoint, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("4 current evidence — Gate D PASS, Gate E prior FAIL 0/20, harness merged", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const evidence = checkpoint.split("## 2. Current Evidence")[1]?.split("## 3.")[0] ?? "";
  assert.match(evidence, /36\/36 PASS/i);
  assert.match(evidence, /0\/20 FAIL/i);
  assert.match(evidence, /PR #353|2969b1f4/);
  assert.match(evidence, /NOT RUN|no post-fix/i);
});

test("5 founder question — exact wording and YES / NO / PENDING answers", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(checkpoint, /Gate E retry after harness fix = YES/);
  assert.match(checkpoint, /Gate E retry after harness fix = NO \/ PENDING/);
});

test("6 exact prod command — present but NOT TO RUN without founder YES", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(
    checkpoint,
    new RegExp(CANONICAL_GATE_E_RETRY_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(checkpoint, /NOT TO RUN/i);
  assert.match(checkpoint, /without explicit founder YES/i);
});

test("7 preconditions — frontend_commit >= 2969b1f4 and TWIN_ACCESS_TOKEN", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const preconditions = checkpoint.split("## 7. Preconditions")[1]?.split("## 8.")[0] ?? "";
  assert.match(preconditions, /frontend_commit.*≥.*2969b1f4|frontend_commit` ≥ `2969b1f4/);
  assert.match(preconditions, /TWIN_ACCESS_TOKEN/);
  assert.match(preconditions, /AUTH_TOKEN_REQUIRED/);
});

test("8 deploy alignment — aligned when frontend_commit >= harness fix SHA", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const alignment = checkpoint.split("## 3. Deploy Alignment")[1]?.split("## 4.")[0] ?? "";
  assert.match(alignment, /ALIGNED/i);
  assert.match(alignment, new RegExp(HARNESS_FIX_SHA));
});

test("9 stance — Launch NO-GO, P0 OPEN, Gate F PENDING, Gate E FAIL unchanged", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /NO-GO/i);
  assert.match(checkpoint, /P0.*OPEN/i);
  assert.match(checkpoint, /Gate F.*PENDING/i);
  assert.match(checkpoint, /Phase 3B.*FAIL/i);
  assert.match(checkpoint, /0\/20/i);
  assert.doesNotMatch(checkpoint, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(checkpoint, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(checkpoint, /Gate F.*\*\*YES\*\*/i);
});

test("10 what this will not do — no launch, P0 close, Gate F, CI browser, stress, prod mutation", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const section = checkpoint.split("## 10. What This Will Not Do")[1]?.split("## Explicit")[0] ?? "";
  assert.match(section, /NO-GO/i);
  assert.match(section, /P0.*OPEN/i);
  assert.match(section, /Gate F.*PENDING/i);
  assert.match(section, /smoke\.yml|CI browser|Playwright-free/i);
  assert.match(section, /stress|CPU storm/i);
  assert.match(section, /Mutate production|Read-only/i);
});

test("11 npm script test:gate-e-retry-after-harness-fix-checkpoint registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-retry-after-harness-fix-checkpoint/);
  assert.match(pkg, /gate-e-retry-after-harness-fix-checkpoint\.test\.ts/);
});

test("12 prior gate E result still FAIL — not reversed by checkpoint", () => {
  const result = readRepo(GATE_E_RESULT);
  assert.match(result, /verdict:\s+FAIL/i);
  assert.match(result, /0\/20/i);
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /not reversed|prior 0\/20|unchanged/i);
});

test("13 checkpoint references with-token retry result — attempt 3 PARTIAL", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /gate-e-phase3b-retry-with-token-result-2026-06-29/);
  assert.match(checkpoint, /attempts #1.*#2.*#3|#3 with-token/i);
  assert.match(checkpoint, /AUTH_TOKEN_REQUIRED|PARTIAL/i);
  const withTokenResult = readRepo("docs/gate-e-phase3b-retry-with-token-result-2026-06-29.md");
  assert.match(withTokenResult, /Attempt 3 — Execution Record/);
  assert.match(withTokenResult, /token present in env:\s+false/i);
});
