/**
 * Gate F founder decision package — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const GATE_F_PACKAGE = "docs/GATE_F_DECISION_PACKAGE_2026-07-06.md";
const ATTEMPT_19 = "docs/gate-e-phase3b-attempt19-result-2026-07-06.md";
const LAUNCH_CHECKLIST = "docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md";

const FOUNDER_QUESTION =
  "Do you approve **Gate F = YES** to complete the launch-gate re-audit";

const REQUIRED_SECTIONS = [
  "1. Purpose",
  "2. Current Launch Stance",
  "3. Gate E Evidence",
  "4. Remaining Risks",
  "5. Criteria to Close P0",
  "6. Criteria to Move Gate F",
  "7. What Gate F Will Not Do",
  "8. Explicit Founder Decision Prompt",
  "9. Recommendation",
  "10. Launch Stance Footer",
] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function pkgSection(doc: string, heading: string): string {
  return doc.split(`## ${heading}`)[1]?.split("## ")[0] ?? "";
}

test("1 gate F decision package exists with correct title", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  assert.match(pkg, /Gate F Founder Decision Package/);
});

test("2 gate F package — required sections present", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  for (const section of REQUIRED_SECTIONS) {
    assert.match(pkg, new RegExp(`## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
});

test("3 gate F package — Launch NO-GO, P0 OPEN, Gate F PENDING", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  const stance = pkgSection(pkg, "2. Current Launch Stance");
  assert.match(stance, /NO-GO/i);
  assert.match(stance, /P0.*OPEN/i);
  assert.match(stance, /Gate F.*PENDING/i);
  assert.doesNotMatch(pkg, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(pkg, /\| \*\*P0 performance\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(pkg, /\| \*\*Gate F.*\*\* \| \*\*YES\*\*/);
});

test("4 gate F package — does not inappropriately claim Launch GO, P0 CLOSED, or Gate F YES", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  const footer = pkgSection(pkg, "10. Launch Stance Footer");
  assert.match(footer, /NO-GO/i);
  assert.match(footer, /P0:\s*OPEN/i);
  assert.match(footer, /Gate F:\s*PENDING/i);
  assert.match(pkg, /No Launch GO/i);
  assert.match(pkg, /No P0 CLOSED/i);
  assert.match(pkg, /No Gate F YES claimed/i);
  assert.doesNotMatch(pkg, /Public launch:\s*\*\*GO\*\*/i);
});

test("5 gate F package — references Gate E attempt 19 evidence", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  assert.match(pkg, /gate-e-phase3b-attempt19-result-2026-07-06\.md/);
  assert.match(pkg, /28849996684/);
  assert.match(pkg, /80d981c/);
  assert.match(pkg, /20\/20/);
  assert.match(pkg, /3356/);
  assert.match(pkg, /21094/);
  assert.match(pkg, /page-error:1.*0|0 × `page-error:1`/i);

  const attempt19 = readRepo(ATTEMPT_19);
  assert.match(attempt19, /PASS.*20\/20/i);
});

test("6 gate F package — DOM fix and hydration fix lineage documented", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  assert.match(pkg, /#387/);
  assert.match(pkg, /#384/);
  assert.match(pkg, /#381/);
  assert.match(pkg, /dashboard-dom-budget/i);
});

test("7 gate F package — scope forbids backend/API/auth/DB/env changes", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  const purpose = pkgSection(pkg, "1. Purpose");
  assert.match(purpose, /backend/i);
  assert.match(purpose, /API/i);
  assert.match(purpose, /auth/i);
  assert.match(purpose, /DB/i);
  assert.match(purpose, /env/i);
  assert.match(purpose, /does NOT/i);

  const willNot = pkgSection(pkg, "7. What Gate F Will Not Do");
  assert.match(willNot, /backend\/API\/auth\/DB\/env/i);
});

test("8 gate F package — explicit founder question and answer options", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  assert.match(pkg, new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(pkg, /Gate F = YES/);
  assert.match(pkg, /Gate F = NO/);
  assert.match(pkg, /Gate F = PENDING/);
  assert.match(pkg, /separate decision/i);
});

test("9 gate F package — recommends review not auto Gate F YES", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  const rec = pkgSection(pkg, "9. Recommendation");
  assert.match(rec, /recommend founder review/i);
  assert.match(rec, /Not.*auto Gate F YES/i);
});

test("10 gate F package — links launch gate checklist and P0 closure criteria", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  assert.match(pkg, /PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27\.md/);
  assert.match(pkg, /PRODUCTION_REALITY_MATRIX_2026-05-27\.md/);
  assert.match(pkg, /SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28\.md/);

  const checklist = readRepo(LAUNCH_CHECKLIST);
  assert.match(checklist, /Public launch gate checklist/);
});

test("11 gate F package — Phase 3B PASS acknowledged without closing P0", () => {
  const pkg = readRepo(GATE_F_PACKAGE);
  assert.match(pkg, /Phase 3B.*PASS/i);
  assert.match(pkg, /P0.*OPEN/i);
  assert.match(pkg, /RSS validation/i);
});

test("12 npm script test:gate-f-decision-package-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:gate-f-decision-package-guard":/);
  assert.match(pkgJson, /gate-f-decision-package-guard\.test\.ts/);
});
