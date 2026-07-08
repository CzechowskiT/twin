/**
 * Seven-day D2 candidate slice — static guard (career, interview prep, evidence, trust, referrals, dashboard).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import {
  CALENDAR_PROVIDER_TIERS,
  CANDIDATE_MODULE_NAV_COLLAPSED_DEFAULT,
  CAREER_COMPASS_SHIP_STATUS,
  EVIDENCE_VAULT_SHIP_STATUS,
  HIDE_CANDIDATE_BILLING_FROM_HUB,
  INTERVIEW_PREP_SHIP_STATUS,
  REFERRALS_LIMITED_PILOT,
  SHOW_DASHBOARD_AUTO_APPLY_STRIP,
  SHOW_DASHBOARD_EXTENDED_HOME_MODULES,
  TRUST_CENTER_OVERVIEW_MODE,
  TRUST_CENTER_ROADMAP_STATUS,
} from "../src/lib/seven-day-d2-candidate";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
} from "../src/lib/product-surface-visibility";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const D2_DOC = "docs/SEVEN_DAY_D2_CANDIDATE_EXECUTION_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function moduleStatus(id: string) {
  const mod = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === id);
  assert.ok(mod, `missing module ${id}`);
  return mod!.status;
}

test("1 D2 execution doc exists with stance footer", () => {
  const doc = readRepo(D2_DOC);
  assert.match(doc, /Seven-day D2/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /NOT Launch GO/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
});

test("2 seven-day-d2 flags — ship modules, hide auto-apply and billing, collapsed nav", () => {
  assert.equal(CAREER_COMPASS_SHIP_STATUS, "live");
  assert.equal(INTERVIEW_PREP_SHIP_STATUS, "live");
  assert.equal(EVIDENCE_VAULT_SHIP_STATUS, "live");
  assert.equal(TRUST_CENTER_ROADMAP_STATUS, "pilot");
  assert.equal(REFERRALS_LIMITED_PILOT, true);
  assert.equal(HIDE_CANDIDATE_BILLING_FROM_HUB, true);
  assert.equal(SHOW_DASHBOARD_AUTO_APPLY_STRIP, false);
  assert.equal(SHOW_DASHBOARD_EXTENDED_HOME_MODULES, false);
  assert.equal(CANDIDATE_MODULE_NAV_COLLAPSED_DEFAULT, true);
  assert.equal(TRUST_CENTER_OVERVIEW_MODE, true);
});

test("3 workspace modules — career and interview prep live; auto-apply paused; trust pilot roadmap", () => {
  assert.equal(moduleStatus("career_compass"), "live");
  assert.equal(moduleStatus("interview_prep"), "live");
  assert.equal(moduleStatus("evidence"), "live");
  assert.equal(moduleStatus("trust_center"), "pilot");
  assert.equal(moduleStatus("referrals"), "pilot");
  assert.equal(moduleStatus("auto_apply"), "paused");
});

test("4 product surface — ship modules in roadmap tier; auto-apply and billing hidden", () => {
  assert.equal(classifyProductSurfaceTier("candidate", "career_compass"), "PILOT");
  assert.equal(classifyProductSurfaceTier("candidate", "interview_prep"), "PILOT");
  assert.equal(classifyProductSurfaceTier("candidate", "evidence"), "PILOT");
  assert.equal(shouldHideFromDefaultHub("candidate", "auto_apply"), true);
  assert.equal(shouldHideFromDefaultHub("candidate", "plan_payments"), true);
  assert.equal(classifyProductSurfaceTier("candidate", "referrals"), "PILOT");
  assert.equal(classifyProductSurfaceTier("candidate", "trust_center"), "PILOT");
  assert.equal(moduleStatus("career_compass"), "live");
  assert.equal(moduleStatus("interview_prep"), "live");
  assert.equal(moduleStatus("evidence"), "live");
});

test("5 career compass — static framework, no DemoJourneyPilotStatus", () => {
  const page = read("src/app/dashboard/career/page.tsx");
  assert.match(page, /seven-day-d2-candidate/);
  assert.match(page, /data-seven-day-career-static-framework/);
  assert.match(page, /careerCompassStaticSkillsGapTitle/);
  assert.doesNotMatch(page, /DemoJourneyPilotStatus/);
});

test("6 interview prep — static pack always visible, no live coaching copy", () => {
  const client = read("src/app/dashboard/interview-prep/candidate-interview-prep-client.tsx");
  assert.match(client, /data-seven-day-interview-static-pack/);
  assert.match(client, /INTERVIEW_PREP_STATIC_MOCK_QUESTION_KEYS/);
  assert.doesNotMatch(client, /DemoJourneyPilotStatus/);
  assert.match(en.candidateInterviewPrep.lead ?? "", /No live AI coaching/i);
  assert.doesNotMatch(en.candidateInterviewPrep.lead ?? "", /powered by career assistant/i);
});

test("7 evidence vault — readiness summary and missing checklist", () => {
  const client = read("src/app/dashboard/evidence/candidate-evidence-client.tsx");
  assert.match(client, /data-seven-day-evidence-readiness/);
  assert.match(client, /missingChecklistTitle/);
  assert.match(client, /recruiterSummaryTitle/);
  assert.doesNotMatch(client, /DemoJourneyPilotStatus/);
  assert.match(en.candidateEvidence.lead ?? "", /manually/i);
  assert.match(en.candidateEvidence.lead ?? "", /without auto-upload/i);
});

test("8 trust center — overview mode, advanced collapsed, roadmap badge", () => {
  const workspace = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(workspace, /TRUST_CENTER_OVERVIEW_MODE/);
  assert.match(workspace, /advancedModulesToggle/);
  assert.match(workspace, /candidateTrustCenter\.roadmapBadge/);
  const trustPage = read("src/app/dashboard/trust/page.tsx");
  assert.match(trustPage, /CandidateTrustCenterWorkspace/);
});

test("9 referrals — limited pilot boundary, no marketplace claim in boundary copy", () => {
  const page = read("src/app/dashboard/referrals/page.tsx");
  assert.match(page, /data-seven-day-referrals-pilot-boundary/);
  assert.match(page, /REFERRALS_LIMITED_PILOT/);
  assert.match(en.referrals.pilotBoundaryBody ?? "", /No automatic outreach/i);
  assert.match(en.referrals.pilotBoundaryBody ?? "", /no marketplace/i);
  assert.match(dictionaries.pl.referrals.pilotBoundaryBody ?? "", /bez automatycznego outreachu/i);
});

test("10 calendar tiers — Google live, Microsoft coming soon, ICS preview", () => {
  assert.deepEqual(CALENDAR_PROVIDER_TIERS.google, "live");
  assert.deepEqual(CALENDAR_PROVIDER_TIERS.microsoft, "coming_soon");
  assert.deepEqual(CALENDAR_PROVIDER_TIERS.ics, "preview");
  const panel = read("src/components/calendar/calendar-connections-panel.tsx");
  assert.match(panel, /CALENDAR_PROVIDER_TIERS/);
  assert.match(en.productPolish.calendarGoogleLead ?? "", /Live/i);
  assert.match(en.productPolish.calendarMicrosoftLead ?? "", /Coming soon/i);
  assert.match(en.productPolish.calendarIcsLead ?? "", /Preview/i);
});

test("11 dashboard home — command center, core links, collapsed extended modules", () => {
  const page = read("src/app/dashboard/page.tsx");
  assert.match(page, /DashboardCommandCenter/);
  assert.match(page, /DASHBOARD_CORE_QUICK_ACTIONS/);
  assert.match(page, /data-dashboard-extended-modules/);
  assert.match(page, /SHOW_DASHBOARD_EXTENDED_HOME_MODULES/);
  const nav = read("src/components/dashboard/candidate-module-nav.tsx");
  assert.match(nav, /CANDIDATE_MODULE_NAV_COLLAPSED_DEFAULT/);
  assert.doesNotMatch(en.dashboard.extendedModulesToggle ?? "", /pilot preview/i);
});

test("12 npm script test:seven-day-d2-candidate-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:seven-day-d2-candidate-guard":/);
  assert.match(pkg, /seven-day-d2-candidate-guard\.test\.ts/);
});
