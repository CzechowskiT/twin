/**
 * Gate E Phase 3B attempt 7 execution guarantee — static, no browser (2026-06-29).
 *
 * Proves, from the implementation (not assumptions), that the Phase 3B
 * controlled-multitab harness is bounded to a single worker, a single
 * browser project, one context per batch (executed sequentially), a hard
 * per-batch tab ceiling, zero automatic retries, and try/finally cleanup
 * that always runs — the concrete gaps identified by
 * GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md §5 before attempt 7 can be
 * authorized. Does NOT run Playwright, launch a browser, or touch
 * backend/API/auth/DB/env/smoke.yml.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { PHASE3B_MAX_TABS, PHASE3B_ROUTE_BATCHES } from "../e2e/helpers/phase3b-controlled-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const PLAYWRIGHT_CONFIG = "playwright.config.ts";
const PHASE3B_SPEC = "e2e/phase3b-controlled-multitab.spec.ts";
const BROWSER_LIFECYCLE_HELPER = "e2e/helpers/browser-lifecycle.ts";
const GLOBAL_TEARDOWN = "scripts/playwright-global-teardown.mjs";
const EXECUTION_GUARANTEE_DOC = "docs/GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md";
const SAFETY_PLAN_DOC = "docs/GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md";

test("1 workers hard-coded to literal 1 in playwright.config.ts (not env-derived)", () => {
  const config = read(PLAYWRIGHT_CONFIG);
  assert.match(config, /workers:\s*1,/);
  assert.doesNotMatch(config, /workers:\s*process\.env/);
});

test("2 fullyParallel disabled — batches cannot be scheduled concurrently by the runner", () => {
  const config = read(PLAYWRIGHT_CONFIG);
  assert.match(config, /fullyParallel:\s*false/);
});

test("3 exactly one Playwright project (chromium) — no project-multiplied browser launches", () => {
  const config = read(PLAYWRIGHT_CONFIG);
  const projectMatches = config.match(/name:\s*"chromium"/g) ?? [];
  assert.equal(projectMatches.length, 1);
  assert.doesNotMatch(config, /name:\s*"(firefox|webkit)"/);
});

test("4 npm scripts hard-code --workers=1 for every phase3b browser invocation", () => {
  const pkg = read("package.json");
  assert.match(
    pkg,
    /"test:phase3b-controlled-multitab-browser:raw":\s*"playwright test e2e\/phase3b-controlled-multitab\.spec\.ts --workers=1"/,
  );
  assert.match(pkg, /"test:phase3b-controlled-multitab-prod":.*test:phase3b-controlled-multitab-browser:raw/);
  assert.match(pkg, /"test:phase3b-controlled-multitab-browser":.*test:phase3b-controlled-multitab-browser:raw/);
});

test("5 prod script still requires explicit PLAYWRIGHT_ALLOW_PROD_SMOKE=1 gate (unchanged)", () => {
  const pkg = read("package.json");
  assert.match(
    pkg,
    /"test:phase3b-controlled-multitab-prod":\s*"node -e \\"if\(process\.env\.PLAYWRIGHT_ALLOW_PROD_SMOKE!=='1'\)/,
  );
});

test("6 Phase 3B describe block runs batches in serial mode with retries pinned to 0", () => {
  const spec = read(PHASE3B_SPEC);
  assert.match(spec, /test\.describe\.configure\(\{\s*mode:\s*"serial",\s*retries:\s*0,/);
});

test("7 route batches are statically bounded to PHASE3B_MAX_TABS per batch", () => {
  assert.equal(PHASE3B_MAX_TABS, 8);
  for (const batch of PHASE3B_ROUTE_BATCHES) {
    assert.ok(
      batch.routes.length <= PHASE3B_MAX_TABS,
      `batch ${batch.label} has ${batch.routes.length} routes, exceeds PHASE3B_MAX_TABS=${PHASE3B_MAX_TABS}`,
    );
  }
  const maxBatchSize = Math.max(...PHASE3B_ROUTE_BATCHES.map((b) => b.routes.length));
  assert.equal(maxBatchSize, 7, "expected evidence-table max batch size to remain 7 (7+7+6)");
});

test("8 spec enforces a runtime tab-budget guard independent of the route-batch data", () => {
  const spec = read(PHASE3B_SPEC);
  assert.match(spec, /function assertTabBudget\(context: BrowserContext\): void/);
  assert.match(spec, /openPages\s*>=\s*PHASE3B_MAX_TABS/);
  assert.match(spec, /throw new Error/);
  // Called from the only page-opening call site.
  assert.match(spec, /async function openRouteStaggered[\s\S]{0,80}assertTabBudget\(context\)/);
});

test("9 spec asserts zero leaked browser contexts before starting each new batch", () => {
  const spec = read(PHASE3B_SPEC);
  assert.match(spec, /function assertNoLeakedContextsFromPriorBatch\(browser: Browser\): void/);
  assert.match(spec, /browser\.contexts\(\)\.length/);
  assert.match(spec, /assertNoLeakedContextsFromPriorBatch\(browser\)/);
  // The guard must run before withFreshContext opens the next batch's context.
  const guardIdx = spec.indexOf("assertNoLeakedContextsFromPriorBatch(browser);");
  const withFreshContextIdx = spec.indexOf("await withFreshContext(browser,");
  assert.ok(guardIdx > -1 && withFreshContextIdx > -1 && guardIdx < withFreshContextIdx);
});

test("10 exactly one context created per batch — single withFreshContext call site, one per test", () => {
  const spec = read(PHASE3B_SPEC);
  const contextCalls = spec.match(/await withFreshContext\(browser,/g) ?? [];
  assert.equal(contextCalls.length, 1, "expected a single withFreshContext call site (looped once per batch test)");
  assert.doesNotMatch(spec, /browser\.newContext\(/, "spec must not open contexts directly, bypassing withFreshContext");
});

test("11 pages are opened sequentially within a batch — no Promise.all fan-out for page/context/browser creation", () => {
  const spec = read(PHASE3B_SPEC);
  // The only page-open call site must be inside a plain for-loop with an awaited push, not Promise.all.
  assert.match(spec, /for \(let i = 0; i < batch\.routes\.length; i \+= 1\) \{\s*trackers\.push\(await openRouteStaggered/);
  // Route evaluation after idle must also be sequential (for...of), not Promise.all.
  assert.match(spec, /for \(const tracker of trackers\) \{\s*await settleTabForMetrics/);
  // Every Promise.all in the file must be scoped to CDP metric collection on an
  // already-open single page, never to newPage/newContext/chromium.launch.
  const promiseAllBlocks = [...spec.matchAll(/Promise\.all\(\[([^\]]*)\]\)/g)];
  assert.ok(promiseAllBlocks.length >= 1, "expected at least the known CDP Promise.all in captureCdp");
  for (const match of promiseAllBlocks) {
    const inner = match[1] ?? "";
    assert.doesNotMatch(inner, /newPage\(|newContext\(|chromium\.launch\(/);
    assert.match(inner, /client\.send\(/, "unexpected Promise.all not scoped to CDP client.send calls");
  }
});

test("12 withFreshContext guarantees cleanup via try/finally, closing every context page", () => {
  const helper = read(BROWSER_LIFECYCLE_HELPER);
  assert.match(
    helper,
    /export async function withFreshContext[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?closePagesAndContext\(context\.pages\(\), context\)[\s\S]*?\}/,
  );
});

test("13 closePagesAndContext closes ALL live pages (not just tracked ones) then the context, swallowing errors", () => {
  const helper = read(BROWSER_LIFECYCLE_HELPER);
  assert.match(helper, /export async function closePagesAndContext/);
  assert.match(helper, /pages\.map\(\(page\) => page\.close\(\)\.catch\(\(\) => \{\}\)\)/);
  assert.match(helper, /await context\.close\(\)\.catch\(\(\) => \{\}\)/);
});

test("14 globalTeardown is wired and only SIGTERM-kills orphaned ms-playwright chrome-headless-shell processes", () => {
  const config = read(PLAYWRIGHT_CONFIG);
  assert.match(config, /globalTeardown:\s*"\.\/scripts\/playwright-global-teardown\.mjs"/);
  const teardown = read(GLOBAL_TEARDOWN);
  assert.match(teardown, /chrome-headless-shell/);
  assert.match(teardown, /SIGTERM/);
  assert.match(teardown, /ms-playwright/);
  assert.doesNotMatch(teardown, /chromium\.launch\(|newPage\(|newContext\(/, "teardown must never launch a browser");
});

test("15 no forbidden higher worker/parallel overrides exist anywhere in phase3b-related npm scripts", () => {
  const pkg = read("package.json");
  const phase3bLines = pkg.split("\n").filter((line) => /phase3b-controlled-multitab/.test(line));
  assert.ok(phase3bLines.length > 0);
  for (const line of phase3bLines) {
    assert.doesNotMatch(line, /--workers=(?!1\b)\d+/, `unexpected non-1 --workers override: ${line}`);
    assert.doesNotMatch(line, /fullyParallel/);
  }
});

test("16 execution guarantee doc exists with an explicit SAFE_TO_RUN or NOT_SAFE_TO_RUN verdict", () => {
  const doc = readRepo(EXECUTION_GUARANTEE_DOC);
  assert.match(doc, /GATE_E_ATTEMPT7_EXECUTION_GUARANTEE|Attempt 7 Execution Guarantee/i);
  assert.match(doc, /\b(SAFE_TO_RUN|NOT_SAFE_TO_RUN)\b/);
});

test("17 execution guarantee doc documents proven max concurrency and why attempt 6 cannot repeat", () => {
  const doc = readRepo(EXECUTION_GUARANTEE_DOC);
  assert.match(doc, /1 browser/i);
  assert.match(doc, /1 (live )?context/i);
  assert.match(doc, /PHASE3B_MAX_TABS|max.*tabs|7 tabs|8 tabs/i);
  assert.match(doc, /attempt 6/i);
});

test("18 execution guarantee doc preserves hard bans — no overclaims", () => {
  const doc = readRepo(EXECUTION_GUARANTEE_DOC);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /NO-GO/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /Gate F.*PENDING/i);
});

test("19 execution guarantee doc does not itself authorize or claim to run attempt 7", () => {
  const doc = readRepo(EXECUTION_GUARANTEE_DOC);
  assert.doesNotMatch(doc, /attempt 7 is authorized/i);
  assert.doesNotMatch(doc, /attempt 7:\s*\*?\*?authorized/i);
  assert.doesNotMatch(doc, /this document authorizes attempt 7/i);
  assert.match(doc, /attempt 7.{0,40}NOT authorized/i);
  assert.match(doc, /NOT (run|RUN|executed|EXECUTED)/);
});

test("20 attempt 7 safety plan is referenced by the execution guarantee doc (traceability)", () => {
  const doc = readRepo(EXECUTION_GUARANTEE_DOC);
  assert.match(doc, /GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29/);
  const plan = readRepo(SAFETY_PLAN_DOC);
  assert.match(plan, /Separate Founder Authorization/i);
});

test("21 npm script test:gate-e-attempt7-execution-guarantee is registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:gate-e-attempt7-execution-guarantee/);
  assert.match(pkg, /gate-e-attempt7-execution-guarantee\.test\.ts/);
});

test("22 smoke.yml unchanged — no Playwright, default CI browser still disabled", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("23 spec still does not print/log the access token — only boolean/presence usage", () => {
  const spec = read(PHASE3B_SPEC);
  assert.doesNotMatch(spec, /console\.(log|error|info|warn)\([^)]*ACCESS_TOKEN/);
  assert.match(spec, /Boolean\(ACCESS_TOKEN\)/);
});
