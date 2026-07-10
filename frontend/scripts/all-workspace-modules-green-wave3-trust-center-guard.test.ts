/**
 * Wave 3 Slice 1 — candidate trust center MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE guard (2026-07-09).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GREEN_WORKSPACE_ALLOWED_IDS,
  isWorkspaceGreenVisible,
  TRUST_CENTER_ROADMAP_OUTSIDE_HREF,
  WAVE1_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE3_MOVE_TO_ROADMAP_ACTION,
  WAVE3_MOVE_TO_ROADMAP_MODULE_ID,
  WAVE3_MOVE_TO_ROADMAP_SOR_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitProductSurfaceRoutes,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import { PUBLIC_EXPLORE_TWIN_ENTRIES } from "../src/lib/public-explore-twin-routes";
import { PUBLIC_FOOTER_SITEMAP_ENTRIES } from "../src/lib/public-footer-sitemap-routes";
import {
  HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB,
  TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  TRUST_CENTER_ROADMAP_STATUS,
} from "../src/lib/seven-day-d2-candidate";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { getSystemOfRecordRoutesForPersona, SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE3_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE3_TRUST_CENTER_2026-07-09.md";
const PR_440_MERGE_SHA = "ca0670d7166441998c032d1646209cbf59aabaf1";

const CANDIDATE_GREEN_HUB_IDS = [
  "profile",
  "jobs",
  "matches",
  "applications",
  "calendar",
  "identity",
  "career_compass",
  "interview_prep",
  "evidence",
] as const;

const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave3 trust center doc exists with stance and PR #440 merge SHA", () => {
  const doc = readRepo(WAVE3_DOC);
  assert.match(doc, /Wave 3/i);
  assert.match(doc, new RegExp(PR_440_MERGE_SHA));
  assert.match(doc, /MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE/);
  assert.match(doc, /WAVE3_MOVE_TO_ROADMAP_MODULE: trust_center/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
});

test("2 wave3 gate exports — trust_center not green, roadmap outside href", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WAVE3_MOVE_TO_ROADMAP_MODULE_ID, "trust_center");
  assert.equal(WAVE3_MOVE_TO_ROADMAP_ACTION, "MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE");
  assert.equal(TRUST_CENTER_ROADMAP_OUTSIDE_HREF, "/investor/roadmap#candidate-trust-center");
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes("trust_center"));
  assert.ok(!isWorkspaceGreenVisible("candidate", "trust_center"));
  assert.ok(WAVE3_MOVE_TO_ROADMAP_SOR_IDS.includes("candidate_trust"));
  assert.ok(WAVE3_MOVE_TO_ROADMAP_SOR_IDS.includes("candidate_revoke_delete"));
});

test("3 seven-day-d2 — trust roadmap outside workspace, hidden from hub", () => {
  assert.equal(TRUST_CENTER_ROADMAP_STATUS, "pilot");
  assert.equal(HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB, true);
  assert.equal(TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, true);
  assert.equal(shouldHideFromDefaultHub("candidate", "trust_center"), true);
  assert.equal(classifyProductSurfaceTier("candidate", "trust_center"), "INTERNAL");
});

test("4 candidate workspace — green-only primary, trust_center hidden, no pilot cards", () => {
  const split = splitWorkspaceModules("candidate", CANDIDATE_WORKSPACE_MODULES);
  assert.equal(split.roadmap.length, 0);
  assert.ok(split.primary.every((m) => m.status === "live"));
  assert.ok(!split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])));
  assert.ok(!split.primary.some((m) => m.id === "trust_center"));
  assert.ok(split.hidden.some((m) => m.id === "trust_center"));
  assert.ok(split.primary.length <= WORKSPACE_GREEN_PRIMARY_LIMITS.candidate);
  for (const id of CANDIDATE_GREEN_HUB_IDS) {
    assert.ok(split.primary.some((m) => m.id === id), `missing green hub card ${id}`);
  }
});

test("5 profile subnav — no trust center module links, privacy accessible", () => {
  const subnav = read("src/components/candidate-workspace-subnav.tsx");
  assert.match(subnav, /data-candidate-workspace-subnav-green-only/);
  assert.match(subnav, /href="\/privacy"/);
  assert.match(subnav, /TRUST_CENTER_ROADMAP_OUTSIDE_HREF/);
  assert.doesNotMatch(subnav, /href="\/dashboard\/trust"/);
  assert.doesNotMatch(subnav, /href="\/dashboard\/billing"/);
  assert.doesNotMatch(subnav, /href="\/dashboard\/referrals"/);
  assert.doesNotMatch(subnav, /href="\/dashboard\/settings\/auto-apply"/);
});

test("6 profile page — privacy controls, honest delete copy, not Trust Center module", () => {
  const profile = read("src/app/profile/page.tsx");
  assert.match(profile, /data-profile-privacy-controls/);
  assert.match(profile, /privacyControlsTitle/);
  assert.match(profile, /privacyDeleteHint/);
  assert.match(profile, /href="\/privacy"/);
  assert.doesNotMatch(profile, /candidateTrustCenterTitle/);
  const deleteHint = en.profile.privacyDeleteHint ?? "";
  assert.match(deleteHint, /not live/i);
  assert.doesNotMatch(deleteHint, /delete your account now/i);
});

test("7 investor roadmap — candidate trust center section preserved outside workspace", () => {
  const panel = read("src/components/investor/investor-roadmap-founder-updates-panel.tsx");
  assert.match(panel, /id="candidate-trust-center"/);
  assert.match(panel, /data-wave3-trust-center-roadmap/);
  assert.match(panel, /candidateTrustCenterRoadmapLead/);
  const roadmapPage = read("src/app/investor/roadmap/page.tsx");
  assert.match(roadmapPage, /data-wave3-trust-center-roadmap/);
  const founderRoadmap = read("src/lib/investor-founder-roadmap.ts");
  assert.match(founderRoadmap, /nextCandidateTrustCenter/);
});

test("8 public marketing — trust links point to roadmap anchor, not workspace hub", () => {
  const trustExplore = PUBLIC_EXPLORE_TWIN_ENTRIES.find((e) => e.id === "trust");
  assert.equal(trustExplore?.href, TRUST_CENTER_ROADMAP_OUTSIDE_HREF);
  const footerTrust = PUBLIC_FOOTER_SITEMAP_ENTRIES.find((e) => e.labelKey === "site.footerTrustCenter");
  assert.equal(footerTrust?.href, TRUST_CENTER_ROADMAP_OUTSIDE_HREF);
  assert.match(en.investorRoadmap.candidateTrustCenterRoadmapLead ?? "", /product roadmap/i);
  assert.match(en.investorRoadmap.candidateTrustCenterRoadmapBody ?? "", /Core privacy and consent controls remain available/i);
  assert.match(en.investorRoadmap.candidateTrustCenterRoadmapBody ?? "", /not part of the current pilot/i);
});

test("9 routes and SoR preserved — trust routes still registered", () => {
  const candidateRoutes = getSystemOfRecordRoutesForPersona("candidate");
  const ids = candidateRoutes.map((r) => r.id);
  assert.ok(ids.includes("candidate_trust"));
  assert.ok(ids.includes("candidate_trust_overview"));
  assert.ok(ids.includes("candidate_revoke_delete"));
  const trustSor = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_trust");
  assert.equal(trustSor?.href, "/dashboard/trust");
  assert.ok(SYSTEM_OF_RECORD_ROUTES.some((r) => r.href === "/dashboard/trust/overview"));
  const profileTrustPage = read("src/app/profile/trust/page.tsx");
  assert.match(profileTrustPage, /CandidateTrustCenterWorkspace/);
  const trustPage = read("src/app/dashboard/trust/page.tsx");
  assert.match(trustPage, /CandidateTrustCenterWorkspace/);
});

test("10 SoR hub split — candidate_trust hidden from primary, revoke_delete hidden", () => {
  const split = splitProductSurfaceRoutes("candidate", getSystemOfRecordRoutesForPersona("candidate"));
  assert.equal(split.roadmap.length, 0);
  assert.ok(!split.primary.some((r) => r.id === "candidate_trust"));
  assert.ok(split.hidden.some((r) => r.id === "candidate_trust"));
  assert.ok(split.hidden.some((r) => r.id === "candidate_revoke_delete"));
});

test("11 revoke delete — no false live delete claims in trust workspace copy", () => {
  const revoke = en.candidateRevokeDelete.panelLead ?? "";
  assert.match(revoke, /disabled|preview|no backend/i);
  const controlsLead = en.candidateTrustCenter.candidateControlsLead ?? "";
  assert.match(controlsLead, /disabled on pilot|preview only/i);
});

test("12 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE3_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
  const plLead = dictionaries.pl.investorRoadmap.candidateTrustCenterRoadmapLead ?? "";
  assert.match(plLead, /roadmapie produktu/i);
});

test("13 npm script test:all-workspace-modules-green-wave3-trust-center-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave3-trust-center-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave3-trust-center-guard\.test\.ts/);
});
