/**
 * All workspace modules GREEN plan — static guard (2026-07-09).
 * Docs + stance lock; no browser. Replaces pilot-visible yellow workspace rule.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const PLAN_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md";
const GATE_F_REVIEW = "docs/GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md";
const CANDIDATE_FLOW = "docs/CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md";
const D7_DOC = "docs/SEVEN_DAY_D7_FINAL_QA_2026-07-08.md";

const REQUIRED_SECTIONS = [
  "1. Founder decision — nowe kryterium GREEN",
  "2. Pełna inwentaryzacja",
  "3. Model bramkowania",
  "4. Podsumowanie liczb",
  "5. Plan wykonawczy — fale 1–4",
  "6. Relacja do Gate F i D7",
  "7. Launch stance footer",
] as const;

const COUNT_LINE =
  "ALL_WORKSPACE_GREEN_COUNTS: GREEN_WORKING=28, MAKE_GREEN=6, HIDE_FROM_WORKSPACE=24, MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE=8, INTERNAL_ONLY=14, FOUNDER_DECISION=3, TOTAL=83";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function planDoc(): string {
  return readRepo(PLAN_DOC);
}

test("1 green plan doc exists with required sections", () => {
  const content = planDoc();
  assert.match(content, /All workspace modules GREEN plan.*2026-07-09/i);
  for (const section of REQUIRED_SECTIONS) {
    assert.match(content, new RegExp(`## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
  assert.ok(content.length > 8000, "plan doc must be substantive");
});

test("2 inventory covers four workspaces and SoR route count", () => {
  const content = planDoc();
  assert.match(content, /### 2\.1 Candidate/);
  assert.match(content, /### 2\.2 Recruiter/);
  assert.match(content, /### 2\.3 Company/);
  assert.match(content, /### 2\.4 Investor/);
  assert.match(content, /83 wpisy SoR|83 entries|TOTAL=83/);
  assert.equal(SYSTEM_OF_RECORD_ROUTES.length, 83);
});

test("3 founder GREEN-only rule replaces pilot-visible yellow modules", () => {
  const content = planDoc();
  assert.match(content, /GREEN_WORKING only/i);
  assert.match(content, /HIDE_FROM_WORKSPACE/);
  assert.match(content, /MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE/);
  assert.match(content, /INTERNAL_ONLY/);
  assert.match(content, /SUPERSEDES_WORKSPACE_RULE: pilot_visible_yellow_modules/);
  assert.match(content, /Zastępuje.*pilot-visible yellow/i);
});

test("4 classification actions and counts line", () => {
  const content = planDoc();
  assert.match(content, /KEEP_GREEN/);
  assert.match(content, /MAKE_GREEN/);
  assert.match(content, /FOUNDER_DECISION/);
  assert.match(content, new RegExp(COUNT_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(content, /WORKSPACE_VISIBLE_NON_GREEN_CURRENT: 22/);
});

test("5 waves 1-4 execution plan documented", () => {
  const content = planDoc();
  assert.match(content, /### Wave 1/);
  assert.match(content, /### Wave 2/);
  assert.match(content, /### Wave 3/);
  assert.match(content, /### Wave 4/);
  assert.match(content, /WAVE_1_RECOMMENDED_SLICE: hide non-green workspace cards/);
  assert.match(content, /Wave 1.*Hide non-green/i);
});

test("6 smoke NEEDS_REVIEW M3 M5 M7 M8 referenced", () => {
  const content = planDoc();
  assert.match(content, /M3|M5/);
  assert.match(content, /M7/);
  assert.match(content, /M8/);
  assert.match(content, /NEEDS_REVIEW/);
  readRepo(GATE_F_REVIEW);
  readRepo(CANDIDATE_FLOW);
});

test("7 gating model forbids non-green badges in visible workspace", () => {
  const content = planDoc();
  assert.match(content, /FORBID badge_ui IN \{ pilot, preview, coming_soon, paused, not_live/);
  assert.match(content, /WORKSPACE_GREEN_ONLY_MODE/);
});

test("8 canonical stance preserved — NOT Launch GO NOT Gate F YES NOT Phase 3B", () => {
  const content = planDoc();
  assert.match(content, /P0 CLOSED/);
  assert.match(content, /Gate E PASS/);
  assert.match(content, /Gate F PENDING/);
  assert.match(content, /Launch NO-GO/);
  assert.match(content, /NOT_LAUNCH_GO: true/);
  assert.match(content, /NOT_GATE_F_YES: true/);
  assert.match(content, /NOT_PHASE_3B: true/);
  assert.match(content, /NO_MASS_FEATURE_CHANGES_THIS_PR: true/);
  assert.doesNotMatch(content, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(content, /Gate F:\s*\*\*YES\*\*/);
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
});

test("9 links D7 QA and candidate readiness flow", () => {
  const content = planDoc();
  assert.match(content, /SEVEN_DAY_D7_FINAL_QA_2026-07-08\.md/);
  assert.match(content, /CANDIDATE_READINESS_WORKING_FLOW_2026-07-09\.md/);
  readRepo(D7_DOC);
});

test("10 npm script test:all-workspace-modules-green-plan-guard registered", () => {
  const pkgJson = read("package.json");
  assert.match(pkgJson, /"test:all-workspace-modules-green-plan-guard":/);
  assert.match(pkgJson, /all-workspace-modules-green-plan-guard\.test\.ts/);
});
