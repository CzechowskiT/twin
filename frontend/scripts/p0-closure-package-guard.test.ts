/**
 * P0 closure package — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const RSS_RUNBOOK = "docs/P0_MULTITAB_RSS_SMOKE_RUNBOOK_2026-07-07.md";
const CLOSURE_CHECKLIST = "docs/P0_CLOSURE_CHECKLIST_2026-07-07.md";
const GATE_E_ATTEMPT_19 = "docs/gate-e-phase3b-attempt19-result-2026-07-06.md";
const GATE_F_REAUDIT = "docs/GATE_F_REAUDIT_RESULT_2026-07-07.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function bothDocs(): { runbook: string; checklist: string } {
  return {
    runbook: readRepo(RSS_RUNBOOK),
    checklist: readRepo(CLOSURE_CHECKLIST),
  };
}

test("1 p0 closure package docs exist with correct titles", () => {
  const { runbook, checklist } = bothDocs();
  assert.match(runbook, /P0 Multitab RSS Manual Smoke Runbook/);
  assert.match(checklist, /P0 Closure Checklist/);
});

test("2 rss runbook — requires 8-12 tabs", () => {
  const { runbook } = bothDocs();
  assert.match(runbook, /8–12 tabs|8-12 tabs/i);
  assert.match(runbook, /\*\*Minimum tabs\*\* \| \*\*8\*\*/);
  assert.match(runbook, /\*\*Maximum tabs\*\* \| \*\*12\*\*/);
  assert.match(runbook, /Do not exceed 12 tabs/);
  assert.match(runbook, /Do not run fewer than 8/);
});

test("3 rss runbook — evidence requirements listed", () => {
  const { runbook } = bothDocs();
  assert.match(runbook, /Screenshots and evidence required/i);
  assert.match(runbook, /Activity Monitor/);
  assert.match(runbook, /p0-rss-smoke-.*activity-monitor\.png/);
  assert.match(runbook, /public-health/);
  assert.match(runbook, /Evidence file naming convention/i);
  assert.match(runbook, /p0-rss-smoke-\{YYYYMMDD\}/);
});

test("4 rss runbook — pass fail criteria listed", () => {
  const { runbook } = bothDocs();
  assert.match(runbook, /Pass \/ fail criteria/i);
  assert.match(runbook, /### PASS/);
  assert.match(runbook, /### FAIL/);
  assert.match(runbook, /Per-renderer RSS/);
  assert.match(runbook, /Browser OOM/);
  assert.match(runbook, /tab slow/i);
});

test("5 closure checklist — references gate e pass and gate f reaudit", () => {
  const { checklist } = bothDocs();
  assert.match(checklist, /Gate E Phase 3B PASS 20\/20/);
  assert.match(checklist, /28849996684/);
  assert.match(checklist, /80d981c/);
  assert.match(checklist, /Gate F re-audit completed/);
  assert.match(checklist, /GATE_F_REAUDIT_RESULT_2026-07-07\.md/);
  readRepo(GATE_E_ATTEMPT_19);
  readRepo(GATE_F_REAUDIT);
});

test("6 closure checklist — rss smoke and evidence marked done", () => {
  const { checklist } = bothDocs();
  assert.match(checklist, /RSS multitab manual smoke completed/);
  assert.match(checklist, /Evidence attached/);
  assert.match(checklist, /DONE.*✓|✓/);
  assert.match(checklist, /P0_MULTITAB_RSS_SMOKE_RUNBOOK_2026-07-07\.md/);
  assert.match(checklist, /P0_CLOSURE_DECISION_2026-07-07\.md/);
});

test("7 closure checklist — founder approval recorded", () => {
  const { checklist } = bothDocs();
  assert.match(checklist, /Founder approval/);
  assert.match(checklist, /Founder approval recorded|Founder confirmed/i);
  assert.match(checklist, /P0_CLOSURE_DECISION_2026-07-07\.md/);
});

test("8 both docs — launch go is separate", () => {
  const { runbook, checklist } = bothDocs();
  for (const doc of [runbook, checklist]) {
    assert.match(doc, /Launch GO.*separate|Launch GO remains separate|Launch still separate/i);
    assert.match(doc, /NO-GO/);
  }
  assert.match(checklist, /Launch GO remains separate/);
});

test("9 both docs — gate f yes is separate", () => {
  const { runbook, checklist } = bothDocs();
  for (const doc of [runbook, checklist]) {
    assert.match(doc, /Gate F YES|Gate F: PENDING/i);
    assert.match(doc, /Gate F.*PENDING/i);
  }
  assert.match(checklist, /Gate F YES does not close P0/);
  assert.match(runbook, /does not grant Launch GO or Gate F YES/i);
});

test("10 runbook pre-closure stance; checklist records p0 closed", () => {
  const { runbook, checklist } = bothDocs();
  assert.match(runbook, /No P0 CLOSED|P0: OPEN|P0 remains OPEN|P0 is \*\*not\*\* closed/i);
  assert.match(checklist, /\*\*P0:\*\* \*\*CLOSED\*\*/);
  assert.match(checklist, /P0 is CLOSED|P0 track closed/i);
});

test("11 both docs — do not claim launch go", () => {
  const { runbook, checklist } = bothDocs();
  for (const doc of [runbook, checklist]) {
    assert.match(doc, /No Launch GO/i);
    assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
    assert.doesNotMatch(doc, /Public launch:\s*\*\*GO\*\*/i);
    assert.doesNotMatch(doc, /Launch GO granted/i);
  }
});

test("12 rss runbook — production url and phase 3b routes", () => {
  const { runbook } = bothDocs();
  assert.match(runbook, /https:\/\/twin-sooty\.vercel\.app/);
  assert.match(runbook, /\/dashboard/);
  assert.match(runbook, /\/recruiter/);
  assert.match(runbook, /\/company\/dashboard/);
  assert.match(runbook, /attempt 19/i);
});

test("13 npm script test:p0-closure-package-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:p0-closure-package-guard":/);
  assert.match(pkgJson, /p0-closure-package-guard\.test\.ts/);
});
