/**
 * P0 final blockers — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const FINAL_BLOCKERS = "docs/P0_FINAL_BLOCKERS_2026-07-07.md";

const DOC_TASK_PATTERNS = [
  /\b(runbook|template|checklist|guard|documentation package)\b.*\b(open|pending|not done)\b/i,
  /\b(open|pending)\b.*\b(runbook|template|checklist|guard|documentation)\b/i,
  /\|\s*\*\*OPEN\*\*\s*\|.*\b(doc|template|runbook|guard)\b/i,
];

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function finalBlockers(): string {
  return readRepo(FINAL_BLOCKERS);
}

function section(doc: string, heading: string): string {
  const re = new RegExp(`# ${heading}\\s*\\n([\\s\\S]*?)(?=\\n# |$)`);
  const match = doc.match(re);
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

test("1 P0_FINAL_BLOCKERS doc exists", () => {
  const doc = finalBlockers();
  assert.match(doc, /P0_FINAL_BLOCKERS|P0 final blockers|Remaining blocker/i);
});

test("2 engineering section — no documentation tasks listed as open", () => {
  const doc = finalBlockers();
  const engineering = section(doc, "Engineering tasks still open");
  assert.match(engineering, /Brak|engineering.*complete/i);
  for (const pattern of DOC_TASK_PATTERNS) {
    assert.doesNotMatch(engineering, pattern, `documentation task appears open in engineering section`);
  }
  assert.doesNotMatch(engineering, /\|\s*[^|]+\s*\|\s*\*\*OPEN\*\*\s*\|/i);
});

test("3 remaining blockers — every row has owner", () => {
  const doc = finalBlockers();
  const blockers = section(doc, "Remaining blocker");
  const rows = blockers
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Blocker |"));
  assert.ok(rows.length >= 3, "expected blocker table rows");
  for (const row of rows) {
    const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
    assert.ok(cols.length >= 4, `blocker row missing columns: ${row}`);
    const owner = cols[1];
    assert.ok(owner.length > 0, `blocker missing owner: ${row}`);
    assert.match(owner, /Founder|Engineering|Ops/i);
  }
});

test("4 remaining blockers — every row has evidence required", () => {
  const doc = finalBlockers();
  const blockers = section(doc, "Remaining blocker");
  const rows = blockers
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Blocker |"));
  for (const row of rows) {
    const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
    const evidence = cols[2];
    assert.ok(evidence && evidence.length > 5, `blocker missing evidence: ${row}`);
  }
});

test("5 exit criteria section exists with P0 Gate F Launch tracks", () => {
  const doc = finalBlockers();
  const exit = section(doc, "Exit criteria");
  assert.match(exit, /P0 CLOSED|recommending P0 CLOSED/i);
  assert.match(exit, /Gate F/i);
  assert.match(exit, /Launch/i);
  assert.match(exit, /MET|NOT MET|OPEN|PENDING|NO-GO/);
});

test("6 does not claim P0 CLOSED", () => {
  const doc = finalBlockers();
  assert.match(doc, /P0: OPEN|P0 is \*\*not\*\* closed|does not close P0/i);
  assert.doesNotMatch(doc, /\| \*\*P0\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/);
  assert.doesNotMatch(doc, /\*\*P0:\*\* \*\*CLOSED\*\*/);
});

test("7 does not claim Gate F YES", () => {
  const doc = finalBlockers();
  assert.match(doc, /Gate F: PENDING|Gate F.*PENDING|No Gate F YES/i);
  assert.doesNotMatch(doc, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(doc, /Gate F = \*\*YES\*\*/);
});

test("8 does not claim Launch GO", () => {
  const doc = finalBlockers();
  assert.match(doc, /NO-GO|does not.*Launch GO/i);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /Public launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /Launch GO granted/i);
});

test("9 founder tasks section lists manual RSS smoke actions", () => {
  const doc = finalBlockers();
  const founder = section(doc, "Founder tasks");
  assert.match(founder, /RSS smoke/i);
  assert.match(founder, /execution record/i);
  assert.match(founder, /closure decision/i);
});

test("10 npm script test:p0-final-blockers-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:p0-final-blockers-guard":/);
  assert.match(pkgJson, /p0-final-blockers-guard\.test\.ts/);
});
