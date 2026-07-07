/**
 * Gate F re-audit result — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const REAUDIT_RESULT = "docs/GATE_F_REAUDIT_RESULT_2026-07-07.md";
const LAUNCH_CHECKLIST = "docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md";
const REALITY_MATRIX = "docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md";

const FOUNDER_QUESTION =
  "Based on the re-audit evidence, should Gate F move to YES, NO, or remain PENDING?";

const AUDIT_STATUSES = ["PASS", "FAIL", "NEEDS_REVIEW", "NOT_APPLICABLE"] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 gate F re-audit result exists with correct title", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /Gate F Re-audit Result/);
});

test("2 re-audit result — references Gate E attempt 19 PASS 20/20", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /28849996684/);
  assert.match(result, /80d981c/);
  assert.match(result, /20\/20/);
  assert.match(result, /PASS.*20\/20|20\/20 PASS/i);
  assert.match(result, /gate-e-phase3b-attempt19-result-2026-07-06\.md/);
  assert.match(result, /3356/);
  assert.match(result, /page-error:1.*0|0 × `page-error:1`/i);
});

test("3 re-audit result — references PUBLIC_LAUNCH_GATE_CHECKLIST", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27\.md/);
  readRepo(LAUNCH_CHECKLIST);
});

test("4 re-audit result — references PRODUCTION_REALITY_MATRIX", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /PRODUCTION_REALITY_MATRIX_2026-05-27\.md/);
  readRepo(REALITY_MATRIX);
});

test("5 re-audit result — includes row-by-row audit table", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /Row-by-row audit table/i);
  assert.match(result, /Source document.*Checklist item.*Current evidence/i);
  assert.match(result, /Required next action/i);
  assert.match(result, /\*\*S1\*\*/);
  assert.match(result, /\*\*O2\*\*/);
  assert.match(result, /\*\*L6\*\*/);
  assert.match(result, /PRODUCTION_REALITY_MATRIX.*Public marketing/i);
});

test("6 re-audit result — includes PASS FAIL NEEDS_REVIEW NOT_APPLICABLE statuses", () => {
  const result = readRepo(REAUDIT_RESULT);
  for (const status of AUDIT_STATUSES) {
    assert.match(result, new RegExp(`\\*\\*${status}\\*\\*`));
  }
});

test("7 re-audit result — includes summary counts", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /Audit summary/i);
  assert.match(result, /\*\*PASS\*\* \| 35/);
  assert.match(result, /\*\*NEEDS_REVIEW\*\* \| 14/);
  assert.match(result, /\*\*FAIL\*\* \| 1/);
  assert.match(result, /\*\*NOT_APPLICABLE\*\* \| 0/);
});

test("8 re-audit result — says Gate F remains PENDING until founder decision", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /Gate F remains PENDING until founder decision/i);
  assert.match(result, /Gate F.*PENDING/i);
});

test("9 re-audit result — says P0 remains OPEN until RSS multitab manual smoke evidence", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /P0 remains OPEN until RSS multitab manual smoke evidence/i);
  assert.match(result, /RSS multitab/i);
});

test("10 re-audit result — says Launch GO remains separate", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /Launch GO remains separate/i);
  assert.match(result, /not granted by this re-audit/i);
});

test("11 re-audit result — does NOT say Launch GO granted", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /No Launch GO/i);
  assert.match(result, /NO-GO/i);
  assert.doesNotMatch(result, /Public launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(result, /Launch GO granted/i);
});

test("12 re-audit result — does NOT say P0 CLOSED", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /No P0 CLOSED/i);
  assert.match(result, /P0.*OPEN/i);
  assert.doesNotMatch(result, /\| \*\*P0.*\*\* \| \*\*CLOSED\*\*/);
});

test("13 re-audit result — does NOT set Gate F YES", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(result, /No Gate F YES/i);
  assert.doesNotMatch(result, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(result, /Gate F = \*\*YES\*\*/);
});

test("14 re-audit result — includes founder Gate F YES/NO/PENDING question", () => {
  const result = readRepo(REAUDIT_RESULT);
  assert.match(
    result,
    new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(result, /Gate F = YES/);
  assert.match(result, /Gate F = NO/);
  assert.match(result, /Gate F = PENDING/);
});

test("15 npm script test:gate-f-reaudit-result-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:gate-f-reaudit-result-guard":/);
  assert.match(pkgJson, /gate-f-reaudit-result-guard\.test\.ts/);
});
