/**
 * Wave 1 — hide non-green workspace modules (static guard, 2026-07-09).
 * @deprecated Superseded by founder decision 2026-07-10 — historical audit only.
 * See test:all-workspace-modules-visible-guard and activation-plan-guard.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GREEN_WORKSPACE_ALLOWED_IDS,
  isWorkspaceGreenVisible,
  WAVE1_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE1_HIDDEN_WORKSPACE_CARD_IDS,
  WAVE2A_RESTORED_WORKSPACE_CARD_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { INVESTOR_WORKSPACE_MODULES } from "../src/lib/investor-workspace-modules";
import {
  getWorkspacePrimaryLimits,
  shouldHideFromDefaultHub,
  shouldShowAsRoadmap,
  splitProductSurfaceRoutes,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import {
  HIDE_CANDIDATE_REFERRALS_FROM_HUB,
  HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB,
  TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "../src/lib/seven-day-d2-candidate";
import {
  HIDE_RECRUITER_INTEGRATIONS_FROM_HUB,
  HIDE_RECRUITER_INTEGRATIONS_FROM_NAV,
  RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "../src/lib/seven-day-d3-recruiter";
import {
  HIDE_COMPANY_INTEGRATIONS_FROM_HUB,
  HIDE_COMPANY_INTEGRATIONS_FROM_NAV,
  COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "../src/lib/seven-day-d4-company";
import {
  HIDE_INVESTOR_DATA_ROOM_FROM_HUB,
  HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW,
  INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  INVESTOR_ROADMAP_MODULE_IDS,
} from "../src/lib/seven-day-d5-investor";
import {
  RECRUITER_PRIMARY_NAV_HREFS,
} from "../src/lib/seven-day-d3-recruiter";
import { COMPANY_PRIMARY_NAV_HREFS } from "../src/lib/seven-day-d4-company";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE1_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md";
const SUPERSEDED_DOC = "docs/FOUNDER_ALL_MODULES_VISIBLE_AND_GREEN_DECISION_2026-07-10.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

test("1 wave1 doc exists with stance and green-only mode", () => {
  const doc = readRepo(WAVE1_DOC);
  assert.match(doc, /Wave 1/i);
  assert.match(doc, /WORKSPACE_GREEN_ONLY_MODE: true/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
});

test("2 WORKSPACE_GREEN_ONLY_MODE disabled — historical gate exports retained", () => {
  const src = read("src/lib/all-workspace-green-gate.ts");
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, false);
  assert.match(src, /isWorkspaceGreenVisible/);
  assert.match(src, /GREEN_WORKSPACE_ALLOWED_IDS/);
  assert.match(src, /@deprecated/i);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  const superseded = readRepo(SUPERSEDED_DOC);
  assert.match(superseded, /Supersedes/);
});

test("3 seven-day hide flags reversed — modules restored to hub", () => {
  assert.equal(HIDE_CANDIDATE_REFERRALS_FROM_HUB, false);
  assert.equal(HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB, false);
  assert.equal(TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  assert.equal(HIDE_RECRUITER_INTEGRATIONS_FROM_HUB, false);
  assert.equal(RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  assert.equal(HIDE_RECRUITER_INTEGRATIONS_FROM_NAV, false);
  assert.equal(HIDE_COMPANY_INTEGRATIONS_FROM_HUB, false);
  assert.equal(COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  assert.equal(HIDE_COMPANY_INTEGRATIONS_FROM_NAV, false);
  assert.equal(HIDE_INVESTOR_DATA_ROOM_FROM_HUB, true);
  assert.equal(HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW, true);
  assert.equal(INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, true);
  assert.equal(INVESTOR_ROADMAP_MODULE_IDS.length, 0);
});

test("4 splitWorkspaceModules — pilot modules in roadmap section", () => {
  const personas = ["candidate", "recruiter", "company", "investor"] as const;
  const modulesByPersona = {
    candidate: CANDIDATE_WORKSPACE_MODULES,
    recruiter: RECRUITER_WORKSPACE_MODULES,
    company: COMPANY_WORKSPACE_MODULES,
    investor: INVESTOR_WORKSPACE_MODULES,
  };

  for (const persona of personas) {
    const split = splitWorkspaceModules(persona, modulesByPersona[persona]);
    assert.ok(split.primary.length > 0, `${persona} primary must not be empty`);
    if (persona !== "investor") {
      assert.ok(split.roadmap.length >= 1, `${persona} roadmap must show pilot modules`);
    }
  }
});

test("5 wave1 hidden card IDs may appear in roadmap — historical audit list preserved", () => {
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_IDS.candidate.includes("trust_center"), true);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_IDS.recruiter.includes("integrations"), true);
  const candidateSplit = splitWorkspaceModules("candidate", CANDIDATE_WORKSPACE_MODULES);
  const shown = [...candidateSplit.primary, ...candidateSplit.roadmap];
  assert.ok(shown.some((m) => m.id === "trust_center"));
});

test("6 splitProductSurfaceRoutes — roadmap non-empty for candidate", () => {
  const split = splitProductSurfaceRoutes("candidate", getSystemOfRecordRoutesForPersona("candidate"));
  assert.ok(split.roadmap.length >= 1);
  const shown = [...split.primary, ...split.roadmap];
  assert.ok(shown.some((r) => r.id === "candidate_trust"));
});

test("7 green allowed IDs — historical audit constants unchanged", () => {
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes("career_compass"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes("search"));
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes("referrals"));
});

test("8 product-surface-visibility uses activation model", () => {
  const src = read("src/lib/product-surface-visibility.ts");
  assert.match(src, /all-workspace-modules-activation/);
  assert.match(src, /splitActivationSurfaceRoutes/);
  assert.match(src, /getWorkspacePrimaryLimits/);
});

test("9 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE1_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
});

test("10 npm script test:all-workspace-modules-green-wave1-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave1-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave1-guard\.test\.ts/);
});
