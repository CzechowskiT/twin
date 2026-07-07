/**
 * Gate F evidence completion — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const REAUDIT_RESULT = "docs/GATE_F_REAUDIT_RESULT_2026-07-07.md";
const EVIDENCE_LOG = "docs/GATE_F_EVIDENCE_COMPLETION_2026-07-07.md";
const P0_CLOSURE = "docs/P0_CLOSURE_DECISION_2026-07-07.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const EVIDENCE_IDS = ["S8", "S9", "O1", "O3", "O6", "O10", "P6"] as const;

test("1 evidence completion log exists", () => {
  const log = readRepo(EVIDENCE_LOG);
  assert.match(log, /Gate F evidence completion/);
});

test("2 re-audit result references evidence completion slice and log", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /Evidence completion slice/i);
  assert.match(result, /GATE_F_EVIDENCE_COMPLETION_2026-07-07\.md/);
  for (const id of EVIDENCE_IDS) {
    assert.match(result, new RegExp(`\\*\\*${id}\\*\\*`));
  }
  assert.match(result, /Disposition/i);
});

test("3 canonical stance — P0 CLOSED, Gate E attempt 19, Launch NO-GO, Gate F PENDING", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /P0.*CLOSED/i);
  assert.match(result, /28849996684/);
  assert.match(result, /80d981c/);
  assert.match(result, /20\/20/);
  assert.match(result, /NO-GO/i);
  assert.match(result, /Gate F.*PENDING/i);
  readRepo(P0_CLOSURE);
});

test("4 no Launch GO, no P0 OPEN current stance, no Phase 3B BLOCKED current stance", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.doesNotMatch(result, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(result, /P0:\s*\*\*OPEN\*\*/i);
  assert.doesNotMatch(result, /Phase 3B:\s*\*\*BLOCKED\*\*/i);
  assert.doesNotMatch(result, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(result, /Public launch.*NO-GO|NO-GO.*public launch/i);
});

test("5 public launch separate from Gate F YES", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /Gate F YES.*Launch GO|Launch GO.*Gate F/i);
  assert.match(result, /Launch GO remains separate/i);
});

test("6 npm script test:gate-f-evidence-completion-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:gate-f-evidence-completion-guard":/);
  assert.match(pkgJson, /gate-f-evidence-completion-guard\.test\.ts/);
});
