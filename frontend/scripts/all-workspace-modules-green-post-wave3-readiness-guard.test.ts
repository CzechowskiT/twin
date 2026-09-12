/**
 * Post-Wave-3 readiness synthesis — static guard (2026-07-10).
 * Docs + stance lock; records PR #443 merge, prod alignment, Wave 1–3 completion.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GREEN_WORKSPACE_ALLOWED_IDS,
  INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF,
  RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF,
  TRUST_CENTER_ROADMAP_OUTSIDE_HREF,
  WAVE3_SLICE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
  WORKSPACE_GREEN_ONLY_MODE,
} from "../src/lib/all-workspace-green-gate";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const READINESS_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_POST_WAVE3_READINESS_2026-07-10.md";
const RUNBOOK_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_FOUNDER_SMOKE_RUNBOOK_2026-07-10.md";
const WAVE3_TRUST_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE3_TRUST_CENTER_2026-07-09.md";
const WAVE3_INTEGRATIONS_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE3_INTEGRATIONS_2026-07-09.md";
const WAVE3_INVESTOR_LOGIN_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE3_INVESTOR_LOGIN_2026-07-09.md";
const PR_443_MERGE_SHA = "e9cd074dada320713a94e77b28f905781ab7c3e2";

const REQUIRED_SECTIONS = [
  "1. Executive summary",
  "2. PR #443 merge & prod alignment",
  "3. Wave 1–3 summary",
  "4. Visible GREEN modules per workspace",
  "5. Static guards result",
  "6. Founder smoke readiness",
  "7. Credentials & seeded data gaps",
  "8. Blockers before Gate F",
  "9. Recommendation",
  "10. Launch stance footer",
] as const;

const COUNT_LINE =
  "WORKSPACE_GREEN_VISIBLE_MODULES: candidate=9, recruiter=5, company=3, investor=4, total=21";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readinessDoc(): string {
  return readRepo(READINESS_DOC);
}

test("1 post-wave3 readiness doc exists with required sections", () => {
  const content = readinessDoc();
  assert.match(content, /Post-Wave-3 readiness.*2026-07-10/i);
  for (const section of REQUIRED_SECTIONS) {
    assert.match(content, new RegExp(`## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
  assert.ok(content.length > 5000, "readiness doc must be substantive");
});

test("2 PR #443 merge SHA and prod alignment ALIGNED", () => {
  const content = readinessDoc();
  assert.match(content, new RegExp(PR_443_MERGE_SHA));
  assert.match(content, /PR.*443|#443/);
  assert.match(content, /ALIGNED/);
  assert.match(content, /public-health/);
  assert.match(content, /frontend_commit/);
  assert.doesNotMatch(content, /PENDING_DEPLOY/);
});

test("3 wave 1-3 complete with wave3 docs on scaffold", () => {
  const content = readinessDoc();
  assert.match(content, /WAVE3_COMPLETE: true/);
  assert.match(content, /Wave 1/);
  assert.match(content, /Wave 2/);
  assert.match(content, /Wave 3/);
  readRepo(WAVE3_TRUST_DOC);
  readRepo(WAVE3_INTEGRATIONS_DOC);
  readRepo(WAVE3_INVESTOR_LOGIN_DOC);
});

test("4 visible GREEN module counts and gate alignment", () => {
  const content = readinessDoc();
  assert.match(content, new RegExp(COUNT_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.candidate, 10);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.recruiter, 5);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.company, 3);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.investor, 4);

  const candidateCardIds = [
    "profile",
    "jobs",
    "matches",
    "career_compass",
    "identity",
    "calendar",
    "applications",
    "evidence",
    "interview_prep",
  ];
  const recruiterCardIds = ["inbox", "pipeline", "jobs", "search", "analytics"];
  const companyCardIds = ["company_dashboard", "roles", "pipeline"];
  const investorCardIds = ["metrics", "roadmap", "calculator", "contact"];

  for (const id of candidateCardIds) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes(id));
  }
  for (const id of recruiterCardIds) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes(id));
  }
  for (const id of companyCardIds) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.company.includes(id));
  }
  for (const id of investorCardIds) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.investor.includes(id));
  }
  assert.equal(candidateCardIds.length, 9);
  assert.equal(recruiterCardIds.length, 5);
  assert.equal(companyCardIds.length, 3);
  assert.equal(investorCardIds.length, 4);
});

test("5 moved-outside-workspace roadmap hrefs preserved", () => {
  const content = readinessDoc();
  assert.equal(TRUST_CENTER_ROADMAP_OUTSIDE_HREF, "/investor/roadmap#candidate-trust-center");
  assert.equal(RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF, "/investor/roadmap#recruiter-integrations");
  assert.equal(INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF, "/investor/roadmap#investor-public-login");
  assert.match(content, /#candidate-trust-center/);
  assert.match(content, /#recruiter-integrations/);
  assert.match(content, /#investor-public-login/);
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes("trust_center"));
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.investor.includes("login"));
  assert.equal(WAVE3_SLICE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
});

test("6 static guards table and founder smoke readiness", () => {
  const content = readinessDoc();
  assert.match(content, /test:all-workspace-modules-green-founder-smoke-runbook-guard/);
  assert.match(content, /test:all-workspace-modules-green-post-wave3-readiness-guard/);
  assert.match(content, /test:all-workspace-modules-green-wave3-investor-login-guard/);
  assert.match(content, /FOUNDER_SMOKE_EXECUTED: false/);
  assert.match(content, /NOT_READY/);
  assert.match(content, /READY_FOR_FOUNDER_SMOKE/);
});

test("7 credentials gap YES/NO table without secrets", () => {
  const content = readinessDoc();
  assert.match(content, /Candidate login.*YES|YES.*candidate/i);
  assert.match(content, /Recruiter.*NO|NO.*recruiter/i);
  assert.match(content, /Company.*NO|NO.*company/i);
  assert.match(content, /NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.doesNotMatch(content, /password:\s*[`'"][^`'"]+[`'"]/i);
});

test("8 links founder smoke runbook and blockers before Gate F", () => {
  const content = readinessDoc();
  assert.match(content, /ALL_WORKSPACE_MODULES_GREEN_FOUNDER_SMOKE_RUNBOOK_2026-07-10\.md/);
  readRepo(RUNBOOK_DOC);
  assert.match(content, /Blockers before Gate F/);
  assert.match(content, /Gate F founder decision still PENDING/);
});

test("9 canonical stance — NOT Launch GO NOT Gate F YES NOT Phase 3B", () => {
  const content = readinessDoc();
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

test("10 npm script test:all-workspace-modules-green-post-wave3-readiness-guard registered", () => {
  const pkgJson = read("package.json");
  assert.match(pkgJson, /"test:all-workspace-modules-green-post-wave3-readiness-guard":/);
  assert.match(pkgJson, /all-workspace-modules-green-post-wave3-readiness-guard\.test\.ts/);
});
