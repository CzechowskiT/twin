/**
 * Gate E Phase 3B — artifact upload guard (static, no browser, no workflow
 * dispatch, no prod request).
 *
 * Attempt 15 (run 28777105356) produced full route-level evidence in job
 * logs and playwright-report/test-results, but the aggregate job's summary
 * showed all 20 routes as MISSING because `actions/upload-artifact@v4`
 * defaults `include-hidden-files` to `false` and `.diagnostics` is a
 * dot-prefixed directory. This suite proves the workflow sets
 * `include-hidden-files: true` on every upload step, includes the required
 * evidence paths, keeps per-route artifacts independent, and does not add
 * any local Playwright execution paths. See
 * docs/gate-e-phase3b-attempt15-result-2026-07-03.md §4.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WORKFLOW = ".github/workflows/gate-e-phase3b-manual.yml";
const ATTEMPT15_RESULT = "docs/gate-e-phase3b-attempt15-result-2026-07-03.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readFrontend(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

/** Slice each `actions/upload-artifact@v4` step's `with:` block from the workflow. */
function uploadArtifactBlocks(workflow: string): string[] {
  const blocks: string[] = [];
  let searchFrom = 0;
  while (true) {
    const marker = "uses: actions/upload-artifact@v4";
    const start = workflow.indexOf(marker, searchFrom);
    if (start === -1) break;
    const nextStep = workflow.indexOf("\n      - name:", start + marker.length);
    const nextJob = workflow.indexOf("\n  gate-e-", start + marker.length);
    const endCandidates = [workflow.length, nextStep, nextJob].filter((n) => n > start);
    const end = Math.min(...endCandidates);
    blocks.push(workflow.slice(start, end));
    searchFrom = start + marker.length;
  }
  return blocks;
}

test("1 every actions/upload-artifact@v4 step sets include-hidden-files: true", () => {
  const workflow = readRepo(WORKFLOW);
  const blocks = uploadArtifactBlocks(workflow);
  assert.equal(blocks.length, 2, "expected exactly 2 upload-artifact steps (per-route + aggregate)");
  for (const [index, block] of blocks.entries()) {
    assert.match(
      block,
      /include-hidden-files:\s*true/,
      `upload-artifact block ${index + 1} must set include-hidden-files: true`,
    );
  }
});

test("2 per-route upload includes .diagnostics, gate-e-attempt-status, playwright-report, and test-results", () => {
  const workflow = readRepo(WORKFLOW);
  const prodJobIdx = workflow.indexOf("gate-e-phase3b-prod:");
  const aggregateJobIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const prodBlock = workflow.slice(prodJobIdx, aggregateJobIdx);
  const perRouteUpload = uploadArtifactBlocks(prodBlock);
  assert.equal(perRouteUpload.length, 1, "expected exactly one upload step in the per-route job");
  const paths = perRouteUpload[0]!;
  assert.match(paths, /frontend\/\.diagnostics\/\*\*/);
  assert.match(paths, /frontend\/\.diagnostics\/gate-e-attempt-status\.json/);
  assert.match(paths, /frontend\/playwright-report\/\*\*/);
  assert.match(paths, /frontend\/test-results\/\*\*/);
});

test("3 per-route artifacts remain independent — named by matrix.slug, not merged into one upload", () => {
  const workflow = readRepo(WORKFLOW);
  const prodJobIdx = workflow.indexOf("gate-e-phase3b-prod:");
  const aggregateJobIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const prodBlock = workflow.slice(prodJobIdx, aggregateJobIdx);
  const perRouteUpload = uploadArtifactBlocks(prodBlock)[0]!;
  assert.match(perRouteUpload, /name:\s*gate-e-phase3b-evidence-\$\{\{\s*matrix\.slug\s*\}\}-\$\{\{\s*github\.run_id\s*\}\}/);
  assert.doesNotMatch(perRouteUpload, /merge-multiple:\s*true/);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const downloadBlock = workflow.slice(aggregateIdx, aggregateIdx + 1200);
  assert.match(downloadBlock, /merge-multiple:\s*false/);
  assert.match(downloadBlock, /pattern:\s*gate-e-phase3b-evidence-\*-\$\{\{\s*github\.run_id\s*\}\}/);
});

test("4 aggregate upload step also sets include-hidden-files and re-uploads downloaded route evidence", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const aggregateBlock = workflow.slice(aggregateIdx);
  const aggregateUpload = uploadArtifactBlocks(aggregateBlock);
  assert.equal(aggregateUpload.length, 1, "expected exactly one upload step in the aggregate job");
  const paths = aggregateUpload[0]!;
  assert.match(paths, /include-hidden-files:\s*true/);
  assert.match(paths, /route-evidence\/\*\*/);
  assert.match(paths, /gate-e-phase3b-route-aggregate\.json/);
  assert.match(paths, /name:\s*gate-e-phase3b-evidence-aggregate-\$\{\{\s*github\.run_id\s*\}\}/);
});

test("5 workflow does not add local Playwright execution paths beyond the existing isolated-runner canonical command", () => {
  const workflow = readRepo(WORKFLOW);
  const playwrightTestMatches = workflow.match(/playwright test/g) ?? [];
  assert.equal(playwrightTestMatches.length, 0, "workflow must not invoke `playwright test` directly");
  assert.doesNotMatch(workflow, /PLAYWRIGHT_ENABLE_BROWSER_TESTS/);
  const prodIdx = workflow.indexOf("gate-e-phase3b-prod:");
  const prodBlock = workflow.slice(prodIdx);
  assert.match(prodBlock, /npm run test:phase3b-controlled-multitab-prod:route/);
  assert.doesNotMatch(prodBlock, /npm run test:phase3b-controlled-multitab-browser:raw/);
});

test("6 npm script test:gate-e-artifact-upload-guard is registered and wired into static preflight guards", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:gate-e-artifact-upload-guard":/);
  assert.match(pkg, /gate-e-artifact-upload-guard\.test\.ts/);
  const workflow = readRepo(WORKFLOW);
  const preflightIdx = workflow.indexOf("Static preflight guards");
  const block = workflow.slice(preflightIdx, preflightIdx + 900);
  assert.match(block, /test:gate-e-artifact-upload-guard/);
});

test("7 attempt15 result doc documents the include-hidden-files root cause (context only, no overclaims)", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /include-hidden-files/);
  assert.match(doc, /\.diagnostics/);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
});
