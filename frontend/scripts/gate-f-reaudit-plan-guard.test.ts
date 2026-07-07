/**
 * Gate F re-audit plan — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const REAUDIT_PLAN = "docs/GATE_F_REAUDIT_PLAN_2026-07-07.md";
const LAUNCH_CHECKLIST = "docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md";
const REALITY_MATRIX = "docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md";

const FOUNDER_QUESTION =
  "Based on the re-audit evidence, should Gate F move to YES, NO, or remain PENDING?";

const AUDIT_STATUSES = ["PASS", "FAIL", "NEEDS_REVIEW", "NOT_APPLICABLE"] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 gate F re-audit plan exists with correct title", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /Gate F Re-audit Plan/);
});

test("2 re-audit plan — references Gate E attempt 19 PASS 20/20", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /28849996684/);
  assert.match(plan, /80d981c/);
  assert.match(plan, /20\/20/);
  assert.match(plan, /PASS.*20\/20|20\/20 PASS/i);
  assert.match(plan, /gate-e-phase3b-attempt19-result-2026-07-06\.md/);
  assert.match(plan, /3356/);
  assert.match(plan, /page-error:1.*0|0 × `page-error:1`/i);
});

test("3 re-audit plan — references PUBLIC_LAUNCH_GATE_CHECKLIST", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27\.md/);
  readRepo(LAUNCH_CHECKLIST);
});

test("4 re-audit plan — references PRODUCTION_REALITY_MATRIX", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /PRODUCTION_REALITY_MATRIX_2026-05-27\.md/);
  readRepo(REALITY_MATRIX);
});

test("5 re-audit plan — includes row-by-row audit table", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /Row-by-row audit table/i);
  assert.match(plan, /Source document.*Checklist item.*Current evidence/i);
  assert.match(plan, /Required next action/i);
  assert.match(plan, /\*\*S1\*\*/);
  assert.match(plan, /\*\*O2\*\*/);
  assert.match(plan, /\*\*L6\*\*/);
  assert.match(plan, /PRODUCTION_REALITY_MATRIX.*Public marketing/i);
});

test("6 re-audit plan — includes PASS FAIL NEEDS_REVIEW NOT_APPLICABLE statuses", () => {
  const plan = readRepo(REAUDIT_PLAN);
  for (const status of AUDIT_STATUSES) {
    assert.match(plan, new RegExp(`\\*\\*${status}\\*\\*`));
  }
});

test("7 re-audit plan — says no Launch GO", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /No Launch GO/i);
  assert.match(plan, /NO-GO/i);
  assert.doesNotMatch(plan, /Public launch:\s*\*\*GO\*\*/i);
});

test("8 re-audit plan — says no P0 CLOSED", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /No P0 CLOSED/i);
  assert.match(plan, /P0.*OPEN/i);
  assert.doesNotMatch(plan, /\| \*\*P0.*\*\* \| \*\*CLOSED\*\*/);
});

test("9 re-audit plan — says no Gate F YES", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /No Gate F YES/i);
  assert.match(plan, /Gate F.*PENDING/i);
  assert.doesNotMatch(plan, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(plan, /Gate F = \*\*YES\*\*/);
});

test("10 re-audit plan — RSS multitab smoke is separate", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(plan, /RSS multitab/i);
  assert.match(plan, /separate/i);
  assert.match(plan, /P0 dependency/i);
  assert.match(plan, /P0 cannot be closed without RSS multitab/i);
});

test("11 re-audit plan — includes founder Gate F YES/NO/PENDING question", () => {
  const plan = readRepo(REAUDIT_PLAN);
  assert.match(
    plan,
    new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(plan, /Gate F = YES/);
  assert.match(plan, /Gate F = NO/);
  assert.match(plan, /Gate F = PENDING/);
});

test("12 npm script test:gate-f-reaudit-plan-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:gate-f-reaudit-plan-guard":/);
  assert.match(pkgJson, /gate-f-reaudit-plan-guard\.test\.ts/);
});
