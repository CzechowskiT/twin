/**
 * Gate F founder review note — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const FOUNDER_NOTE = "docs/GATE_F_FOUNDER_REVIEW_NOTE_2026-07-07.md";
const GATE_F_PACKAGE = "docs/GATE_F_DECISION_PACKAGE_2026-07-06.md";

const FOUNDER_QUESTION = "Gate F = YES, NO, or PENDING?";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 gate F founder review note exists with correct title", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(note, /Gate F Founder Review Note/);
});

test("2 founder note — contains Gate F YES/NO/PENDING question", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(
    note,
    new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(note, /Gate F = YES/);
  assert.match(note, /Gate F = NO/);
  assert.match(note, /Gate F = PENDING/);
});

test("3 founder note — Gate F YES is not Launch GO", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(note, /Gate F = YES is not Launch GO/i);
});

test("4 founder note — P0 remains open until RSS multitab evidence", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(note, /P0 remains OPEN/i);
  assert.match(note, /RSS multitab/i);
  assert.match(note, /P0 cannot be closed without RSS multitab/i);
});

test("5 founder note — Launch GO is separate founder decision", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(note, /Launch GO.*separate/i);
  assert.match(note, /separate founder decision/i);
});

test("6 founder note — does not claim Launch GO, P0 CLOSED, or Gate F YES", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(note, /Launch:.*NO-GO/i);
  assert.match(note, /P0:.*OPEN/i);
  assert.match(note, /Gate F:.*PENDING/i);
  assert.doesNotMatch(note, /Launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(note, /Public launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(note, /\| \*\*P0.*\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(note, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(note, /Gate F = \*\*YES\*\*/);
  assert.match(note, /does not set Gate F YES/i);
});

test("7 founder note — references Gate E attempt 19 evidence", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(note, /28849996684/);
  assert.match(note, /20\/20/);
  assert.match(note, /gate-e-phase3b-attempt19-result-2026-07-06\.md/);
  assert.match(note, /80d981c/);
});

test("8 founder note — links Gate F decision package", () => {
  const note = readRepo(FOUNDER_NOTE);
  assert.match(note, /GATE_F_DECISION_PACKAGE_2026-07-06\.md/);
  readRepo(GATE_F_PACKAGE);
});

test("9 npm script test:gate-f-founder-review-note-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:gate-f-founder-review-note-guard":/);
  assert.match(pkgJson, /gate-f-founder-review-note-guard\.test\.ts/);
});
