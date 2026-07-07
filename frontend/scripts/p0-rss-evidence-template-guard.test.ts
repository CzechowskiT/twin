/**
 * P0 RSS smoke evidence templates — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const EVIDENCE_TEMPLATE = "docs/P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07.md";
const CLOSURE_DECISION_TEMPLATE = "docs/P0_CLOSURE_DECISION_TEMPLATE_2026-07-07.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function bothTemplates(): { evidence: string; closure: string } {
  return {
    evidence: readRepo(EVIDENCE_TEMPLATE),
    closure: readRepo(CLOSURE_DECISION_TEMPLATE),
  };
}

test("1 p0 rss evidence templates exist with correct titles", () => {
  const { evidence, closure } = bothTemplates();
  assert.match(evidence, /P0 RSS Smoke Evidence/);
  assert.match(closure, /P0 Closure Decision/);
});

test("2 evidence template — requires 8-12 tabs", () => {
  const { evidence } = bothTemplates();
  assert.match(evidence, /8–12|8-12/);
  assert.match(evidence, /Number of tabs opened.*8–12|8-12 tabs/i);
  assert.match(evidence, /Within 8–12 range/);
  assert.match(evidence, /protocol requirement/i);
});

test("3 evidence template — requires RSS and CPU metrics", () => {
  const { evidence } = bothTemplates();
  assert.match(evidence, /RSS \/ CPU metrics/i);
  assert.match(evidence, /Aggregate Chrome RSS/);
  assert.match(evidence, /Highest renderer RSS/);
  assert.match(evidence, /Chrome CPU/);
  assert.match(evidence, /Baseline/);
  assert.match(evidence, /Peak/);
  assert.match(evidence, /Final/);
});

test("4 evidence template — requires screenshots and public-health evidence", () => {
  const { evidence } = bothTemplates();
  assert.match(evidence, /Evidence attachments/i);
  assert.match(evidence, /Screenshots attached/);
  assert.match(evidence, /public-health JSON attached/i);
  assert.match(evidence, /activity-monitor\.png/);
  assert.match(evidence, /public-health\.json/);
});

test("5 closure template — p0 closed or remains open choices", () => {
  const { closure } = bothTemplates();
  assert.match(closure, /P0 = CLOSED/);
  assert.match(closure, /P0 = REMAINS OPEN/);
  assert.match(closure, /Founder decision/i);
});

test("6 closure template — p0 closure is not launch go", () => {
  const { closure } = bothTemplates();
  assert.match(closure, /P0 closure is not Launch GO/i);
  assert.match(closure, /P0 CLOSED does \*\*not\*\* grant Launch GO/);
});

test("7 closure template — gate f is separate", () => {
  const { closure } = bothTemplates();
  assert.match(closure, /Gate F decision remains \*\*separate\*\*/i);
  assert.match(closure, /Gate F YES/);
});

test("8 closure template — launch go requires separate founder approval", () => {
  const { closure } = bothTemplates();
  assert.match(closure, /Launch GO requires \*\*separate founder approval\*\*/i);
  assert.match(closure, /separate founder approval/i);
});

test("9 both templates — do not claim p0 closed as completed fact", () => {
  const { evidence, closure } = bothTemplates();
  for (const doc of [evidence, closure]) {
    assert.match(doc, /P0: OPEN|P0 remains OPEN|No P0 CLOSED/i);
    assert.doesNotMatch(doc, /\| \*\*P0\*\* \| \*\*CLOSED\*\*/);
    assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/);
    assert.doesNotMatch(doc, /\*\*P0:\*\* \*\*CLOSED\*\*/);
  }
});

test("10 both templates — do not claim launch go as granted", () => {
  const { evidence, closure } = bothTemplates();
  for (const doc of [evidence, closure]) {
    assert.match(doc, /No Launch GO|NO-GO/i);
    assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
    assert.doesNotMatch(doc, /Public launch:\s*\*\*GO\*\*/i);
    assert.doesNotMatch(doc, /Launch GO granted/i);
  }
});

test("11 evidence template — pass fail and founder review fields", () => {
  const { evidence } = bothTemplates();
  assert.match(evidence, /Pass \/ fail result/i);
  assert.match(evidence, /Founder review/i);
  assert.match(evidence, /P0 closure recommendation/i);
  assert.match(evidence, /console errors/i);
  assert.match(evidence, /Crashes \/ OOM/i);
});

test("12 closure template — evidence reference and rss smoke outcome", () => {
  const { closure } = bothTemplates();
  assert.match(closure, /Evidence reference/i);
  assert.match(closure, /RSS smoke outcome/i);
  assert.match(closure, /PASS/);
  assert.match(closure, /FAIL/);
  assert.match(closure, /ABORT/);
});

test("13 npm script test:p0-rss-evidence-template-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:p0-rss-evidence-template-guard":/);
  assert.match(pkgJson, /p0-rss-evidence-template-guard\.test\.ts/);
});
