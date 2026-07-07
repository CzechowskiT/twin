/**
 * P0 RSS smoke execution record — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const EXECUTION_RECORD = "docs/P0_RSS_SMOKE_EXECUTION_RECORD_2026-07-07.md";
const FOUNDER_INSTRUCTIONS = "docs/P0_RSS_SMOKE_FOUNDER_INSTRUCTIONS_2026-07-07.md";
const EVIDENCE_TEMPLATE = "docs/P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07.md";
const CLOSURE_DECISION_TEMPLATE = "docs/P0_CLOSURE_DECISION_TEMPLATE_2026-07-07.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function executionRecord(): string {
  return readRepo(EXECUTION_RECORD);
}

test("1 execution record doc exists", () => {
  const doc = executionRecord();
  assert.match(doc, /P0 RSS Smoke — Execution Record/);
});

test("2 execution record — contains PASS FAIL ABORT outcomes", () => {
  const doc = executionRecord();
  assert.match(doc, /PASS/);
  assert.match(doc, /FAIL/);
  assert.match(doc, /ABORT/);
});

test("3 execution record — contains CLOSE KEEP OPEN PENDING recommendations", () => {
  const doc = executionRecord();
  assert.match(doc, /CLOSE/);
  assert.match(doc, /KEEP OPEN/);
  assert.match(doc, /PENDING/);
});

test("4 execution record — requires screenshots", () => {
  const doc = executionRecord();
  assert.match(doc, /Screenshots attached/i);
  assert.match(doc, /Activity Monitor/i);
});

test("5 execution record — requires public-health evidence", () => {
  const doc = executionRecord();
  assert.match(doc, /Public-health evidence/i);
  assert.match(doc, /public-health/i);
  assert.match(doc, /\/api\/public-health/);
});

test("6 execution record — says record does not close P0 by itself", () => {
  const doc = executionRecord();
  assert.match(doc, /does not close P0 by itself/i);
  assert.match(doc, /not.*close P0/i);
});

test("7 execution record — says P0 closure requires founder decision", () => {
  const doc = executionRecord();
  assert.match(doc, /P0 closure requires founder decision/i);
  assert.match(doc, /founder decision/i);
});

test("8 execution record — says Gate F remains separate", () => {
  const doc = executionRecord();
  assert.match(doc, /Gate F decision remains separate/i);
  assert.match(doc, /Gate F YES/);
});

test("9 execution record — says Launch GO remains separate", () => {
  const doc = executionRecord();
  assert.match(doc, /Launch GO remains separate/i);
  assert.match(doc, /Launch GO/i);
});

test("10 execution record — does not claim P0 CLOSED", () => {
  const doc = executionRecord();
  assert.match(doc, /P0: OPEN|No P0 CLOSED/i);
  assert.doesNotMatch(doc, /\| \*\*P0\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/);
  assert.doesNotMatch(doc, /\*\*P0:\*\* \*\*CLOSED\*\*/);
});

test("11 execution record — does not claim Launch GO", () => {
  const doc = executionRecord();
  assert.match(doc, /No Launch GO|NO-GO/i);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /Public launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /Launch GO granted/i);
});

test("12 execution record — fillable metadata and metric fields", () => {
  const doc = executionRecord();
  assert.match(doc, /Date \/ time/i);
  assert.match(doc, /Operator/i);
  assert.match(doc, /Machine/i);
  assert.match(doc, /Browser/i);
  assert.match(doc, /Prod URL/i);
  assert.match(doc, /Number of tabs/i);
  assert.match(doc, /Routes opened/i);
  assert.match(doc, /Baseline memory\/CPU/i);
  assert.match(doc, /Memory\/CPU after load/i);
  assert.match(doc, /Memory\/CPU after 4–6 min|4-6 min/i);
  assert.match(doc, /Responsiveness notes/i);
  assert.match(doc, /Visible errors/i);
  assert.match(doc, /Crashes \/ OOM/i);
  assert.match(doc, /Founder review/i);
});

test("13 execution record — references related templates", () => {
  const doc = executionRecord();
  assert.match(doc, /P0_RSS_SMOKE_FOUNDER_INSTRUCTIONS_2026-07-07\.md/);
  assert.match(doc, /P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07\.md/);
  assert.match(doc, /P0_CLOSURE_DECISION_TEMPLATE_2026-07-07\.md/);
  assert.ok(readRepo(FOUNDER_INSTRUCTIONS).length > 0);
  assert.ok(readRepo(EVIDENCE_TEMPLATE).length > 0);
  assert.ok(readRepo(CLOSURE_DECISION_TEMPLATE).length > 0);
});

test("14 npm script test:p0-rss-execution-record-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:p0-rss-execution-record-guard":/);
  assert.match(pkgJson, /p0-rss-execution-record-guard\.test\.ts/);
});
