/**
 * Post-Wave-3 founder smoke runbook — static guard (2026-07-10).
 * Docs + stance lock; no browser. Covers all 21 visible GREEN workspace modules.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GREEN_WORKSPACE_ALLOWED_IDS,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
  WORKSPACE_GREEN_ONLY_MODE,
} from "../src/lib/all-workspace-green-gate";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const RUNBOOK_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_FOUNDER_SMOKE_RUNBOOK_2026-07-10.md";
const READINESS_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_POST_WAVE3_READINESS_2026-07-10.md";
const DEMO_LOGIN_DOC = "docs/DEMO_LOGIN_FOR_FOUNDER.md";
const PR_443_MERGE_SHA = "e9cd074dada320713a94e77b28f905781ab7c3e2";

const REQUIRED_SECTIONS = [
  "1. Purpose",
  "2. Workspace GREEN inventory",
  "3. Global invariant checks",
  "4. Credentials & seeded data",
  "5. Candidate — 9 GREEN modules",
  "6. Recruiter — 5 GREEN modules",
  "7. Company — 3 GREEN modules",
  "8. Investor — 4 GREEN modules",
  "9. Sign-off matrix",
  "10. Launch stance footer",
] as const;

const CANDIDATE_GREEN_IDS = [
  "profile",
  "jobs",
  "matches",
  "career_compass",
  "identity",
  "calendar",
  "applications",
  "evidence",
  "interview_prep",
] as const;

const RECRUITER_GREEN_IDS = ["inbox", "pipeline", "jobs", "search", "analytics"] as const;
const COMPANY_GREEN_IDS = ["company_dashboard", "roles", "pipeline"] as const;
const INVESTOR_GREEN_IDS = ["metrics", "roadmap", "calculator", "contact"] as const;

const COUNT_LINE =
  "WORKSPACE_GREEN_VISIBLE_MODULES: candidate=9, recruiter=5, company=3, investor=4, total=21";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function runbookDoc(): string {
  return readRepo(RUNBOOK_DOC);
}

test("1 founder smoke runbook doc exists with required sections", () => {
  const content = runbookDoc();
  assert.match(content, /Founder smoke runbook.*2026-07-10/i);
  for (const section of REQUIRED_SECTIONS) {
    assert.match(content, new RegExp(`## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
  assert.ok(content.length > 6000, "runbook doc must be substantive");
});

test("2 PR #443 merge SHA and module count line", () => {
  const content = runbookDoc();
  assert.match(content, new RegExp(PR_443_MERGE_SHA));
  assert.match(content, new RegExp(COUNT_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("3 all 21 GREEN modules documented with smoke table rows", () => {
  const content = runbookDoc();
  const allIds = [
    ...CANDIDATE_GREEN_IDS,
    ...RECRUITER_GREEN_IDS,
    ...COMPANY_GREEN_IDS,
    ...INVESTOR_GREEN_IDS,
  ];
  for (const id of allIds) {
    assert.match(content, new RegExp(`\\| M-[A-Z0-9]+ ${id} \\|`));
  }
  assert.equal(allIds.length, 21);
});

test("4 gate exports align with runbook module inventory", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.candidate, 10);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.recruiter, 5);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.company, 3);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.investor, 4);

  for (const id of CANDIDATE_GREEN_IDS) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes(id), `candidate missing ${id}`);
  }
  for (const id of RECRUITER_GREEN_IDS) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes(id), `recruiter missing ${id}`);
  }
  for (const id of COMPANY_GREEN_IDS) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.company.includes(id), `company missing ${id}`);
  }
  for (const id of INVESTOR_GREEN_IDS) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.investor.includes(id), `investor missing ${id}`);
  }
});

test("5 global invariant checks documented", () => {
  const content = runbookDoc();
  assert.match(content, /auto-apply.*OFF|PAUSED/i);
  assert.match(content, /delegated apply.*NOT LIVE/i);
  assert.match(content, /billing hidden/i);
  assert.match(content, /integrations outside workspace/i);
  assert.match(content, /trust center outside/i);
  assert.match(content, /investor login outside/i);
  assert.match(content, /data room hidden/i);
  assert.match(content, /no yellow\/orange/i);
});

test("6 credentials gap analysis — no secrets, NEEDS_FOUNDER_AUTH_SMOKE flags", () => {
  const content = runbookDoc();
  readRepo(DEMO_LOGIN_DOC);
  assert.match(content, /demo@twin\.career/);
  assert.match(content, /NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.match(content, /No secrets/i);
  assert.doesNotMatch(content, /password:\s*[`'"][^`'"]+[`'"]/i);
  assert.doesNotMatch(content, /RECRUITER_INBOX_TOKEN=[a-zA-Z0-9]+/);
});

test("7 each module row has PASS/FAIL criteria and status column", () => {
  const content = runbookDoc();
  assert.match(content, /\| PASS \| FAIL \| Evidence \| Status \|/);
  assert.match(content, /NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.match(content, /Primary action/);
  assert.match(content, /Expected value/);
});

test("8 hidden modules and roadmap outside links documented", () => {
  const content = runbookDoc();
  assert.match(content, /trust_center/);
  assert.match(content, /#candidate-trust-center/);
  assert.match(content, /#recruiter-integrations/);
  assert.match(content, /#company-integrations/);
  assert.match(content, /#investor-public-login/);
  assert.match(content, /data_room/);
  assert.doesNotMatch(content, /restore.*pilot.*workspace/i);
});

test("9 links post-wave3 readiness doc and canonical stance", () => {
  const content = runbookDoc();
  assert.match(content, /ALL_WORKSPACE_MODULES_GREEN_POST_WAVE3_READINESS_2026-07-10\.md/);
  readRepo(READINESS_DOC);
  assert.match(content, /P0 CLOSED/);
  assert.match(content, /Gate E PASS/);
  assert.match(content, /Gate F PENDING/);
  assert.match(content, /Launch NO-GO/);
  assert.match(content, /NOT_LAUNCH_GO: true/);
  assert.match(content, /NOT_GATE_F_YES: true/);
  assert.match(content, /NOT_PHASE_3B: true/);
  assert.doesNotMatch(content, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(content, /Gate F:\s*\*\*YES\*\*/);
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
});

test("10 npm script test:all-workspace-modules-green-founder-smoke-runbook-guard registered", () => {
  const pkgJson = read("package.json");
  assert.match(pkgJson, /"test:all-workspace-modules-green-founder-smoke-runbook-guard":/);
  assert.match(pkgJson, /all-workspace-modules-green-founder-smoke-runbook-guard\.test\.ts/);
});
