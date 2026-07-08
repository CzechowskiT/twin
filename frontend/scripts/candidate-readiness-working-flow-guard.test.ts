/**
 * Candidate readiness working flow — static guard (career, evidence, consent, dashboard).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import {
  CANDIDATE_READINESS_AUTO_APPLY_ENABLED,
  CANDIDATE_READINESS_CANONICAL_STANCE,
  CANDIDATE_READINESS_COMPLETION_ROUTES,
  CANDIDATE_READINESS_DELEGATED_APPLY_ENABLED,
  CANDIDATE_READINESS_HUB_ANCHOR,
  CANDIDATE_READINESS_HUB_HREF,
  CANDIDATE_READINESS_WORKING_PAGES,
} from "../src/lib/candidate-readiness-working-flow";
import { SHOW_DASHBOARD_AUTO_APPLY_STRIP } from "../src/lib/seven-day-d2-candidate";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const FLOW_DOC = "docs/CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md";
const READINESS_CARD = "src/components/dashboard/dashboard-verified-readiness-card.tsx";
const CAREER_PAGE = "src/app/dashboard/career/page.tsx";
const EVIDENCE_CLIENT = "src/app/dashboard/evidence/candidate-evidence-client.tsx";
const BANNER = "src/components/candidate/candidate-readiness-flow-banner.tsx";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 flow doc exists with stance and completion routes", () => {
  const doc = readRepo(FLOW_DOC);
  assert.match(doc, /Candidate readiness working flow/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /Delegated apply stays OFF/i);
  assert.match(doc, /\/dashboard\/career/);
  assert.match(doc, /\/dashboard\/evidence/);
  assert.match(doc, /\/consent\/gdpr/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
});

test("2 stance flags — delegated off, auto-apply paused, canonical stance locked", () => {
  assert.equal(CANDIDATE_READINESS_DELEGATED_APPLY_ENABLED, false);
  assert.equal(CANDIDATE_READINESS_AUTO_APPLY_ENABLED, false);
  assert.equal(SHOW_DASHBOARD_AUTO_APPLY_STRIP, false);
  assert.equal(
    CANDIDATE_READINESS_CANONICAL_STANCE,
    "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO",
  );
});

test("3 completion routes — career, evidence, consent, profile", () => {
  assert.equal(CANDIDATE_READINESS_COMPLETION_ROUTES.career_brief, "/dashboard/career");
  assert.equal(CANDIDATE_READINESS_COMPLETION_ROUTES.skill_evidence, "/dashboard/evidence");
  assert.equal(CANDIDATE_READINESS_COMPLETION_ROUTES.consent_general, "/consent/gdpr");
  assert.equal(CANDIDATE_READINESS_COMPLETION_ROUTES.consent_storage, "/consent/gdpr");
  assert.equal(CANDIDATE_READINESS_COMPLETION_ROUTES.profile, "/profile");
  assert.equal(CANDIDATE_READINESS_HUB_HREF, `/dashboard#${CANDIDATE_READINESS_HUB_ANCHOR}`);
  for (const page of CANDIDATE_READINESS_WORKING_PAGES) {
    assert.ok(page.startsWith("/"), page);
  }
});

test("4 readiness card imports completion routes and surfaces delegated blocked copy", () => {
  const card = read(READINESS_CARD);
  assert.match(card, /CANDIDATE_READINESS_COMPLETION_ROUTES/);
  assert.match(card, /MISSING_ITEM_HREF.*CANDIDATE_READINESS_COMPLETION_ROUTES/);
  assert.match(card, /delegatedBlocked/);
  assert.match(card, /verifiedReadiness\.delegatedBlocked/);
  assert.doesNotMatch(card, /method:\s*["']POST["']/);
});

test("5 career and evidence pages mount readiness flow banner", () => {
  const career = read(CAREER_PAGE);
  const evidence = read(EVIDENCE_CLIENT);
  assert.match(career, /CandidateReadinessFlowBanner/);
  assert.match(career, /context="career_brief"/);
  assert.match(evidence, /CandidateReadinessFlowBanner/);
  assert.match(evidence, /context="skill_evidence"/);
  const banner = read(BANNER);
  assert.match(banner, /CANDIDATE_READINESS_HUB_HREF/);
  assert.match(banner, /candidateReadinessWorkingFlow\.backToChecklist/);
});

test("6 workspace modules — auto_apply paused; career and evidence live", () => {
  const autoApply = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "auto_apply");
  const career = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "career_compass");
  const evidence = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "evidence");
  assert.equal(autoApply?.status, "paused");
  assert.equal(career?.status, "live");
  assert.equal(evidence?.status, "live");
});

test("7 i18n — EN/PL keys for working flow copy", () => {
  for (const locale of ["en", "pl"] as const) {
    const dict = dictionaries[locale];
    assert.ok(dict.candidateReadinessWorkingFlow.backToChecklist);
    assert.ok(dict.candidateReadinessWorkingFlow.bannerCareerBrief);
    assert.ok(dict.candidateReadinessWorkingFlow.bannerSkillEvidence);
    assert.ok(dict.candidateReadinessWorkingFlow.profileReadyDelegatedOff);
    assert.match(
      dict.candidateReadinessWorkingFlow.profileReadyDelegatedOff,
      /delegat|delegowan/i,
    );
  }
  assert.equal(en.candidateReadinessWorkingFlow.backToChecklist, "Back to readiness checklist");
});

test("8 npm script test:candidate-readiness-working-flow-guard registered", () => {
  const pkgJson = read("package.json");
  assert.match(pkgJson, /"test:candidate-readiness-working-flow-guard":/);
  assert.match(pkgJson, /candidate-readiness-working-flow-guard\.test\.ts/);
});
