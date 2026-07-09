/**
 * Wave 1 — hide non-green workspace modules (static guard, 2026-07-09).
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
} from "../src/lib/seven-day-d2-candidate";
import {
  HIDE_RECRUITER_ANALYTICS_FROM_HUB,
  RECRUITER_PRIMARY_NAV_HREFS,
} from "../src/lib/seven-day-d3-recruiter";
import { COMPANY_PRIMARY_NAV_HREFS } from "../src/lib/seven-day-d4-company";
import {
  HIDE_INVESTOR_DATA_ROOM_FROM_HUB,
  INVESTOR_ROADMAP_MODULE_IDS,
} from "../src/lib/seven-day-d5-investor";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE1_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md";

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

test("2 WORKSPACE_GREEN_ONLY_MODE enabled with gate exports", () => {
  const src = read("src/lib/all-workspace-green-gate.ts");
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.match(src, /isWorkspaceGreenVisible/);
  assert.match(src, /GREEN_WORKSPACE_ALLOWED_IDS/);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
});

test("3 seven-day wave1 hide flags", () => {
  assert.equal(HIDE_CANDIDATE_REFERRALS_FROM_HUB, true);
  assert.equal(HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB, true);
  assert.equal(HIDE_RECRUITER_ANALYTICS_FROM_HUB, true);
  assert.equal(HIDE_INVESTOR_DATA_ROOM_FROM_HUB, true);
  assert.equal(INVESTOR_ROADMAP_MODULE_IDS.length, 0);
  assert.equal(RECRUITER_PRIMARY_NAV_HREFS.length, 4);
  assert.equal(COMPANY_PRIMARY_NAV_HREFS.length, 3);
  assert.ok(!RECRUITER_PRIMARY_NAV_HREFS.includes("/recruiter/analytics"));
  assert.ok(!COMPANY_PRIMARY_NAV_HREFS.includes("/company/talent-pool"));
});

test("4 splitWorkspaceModules — empty roadmap, only live primary cards", () => {
  const personas = ["candidate", "recruiter", "company", "investor"] as const;
  const modulesByPersona = {
    candidate: CANDIDATE_WORKSPACE_MODULES,
    recruiter: RECRUITER_WORKSPACE_MODULES,
    company: COMPANY_WORKSPACE_MODULES,
    investor: INVESTOR_WORKSPACE_MODULES,
  };

  for (const persona of personas) {
    const split = splitWorkspaceModules(persona, modulesByPersona[persona]);
    assert.equal(split.roadmap.length, 0, `${persona} roadmap must be empty`);
    assert.ok(split.primary.length > 0, `${persona} primary must not be empty`);
    assert.ok(
      split.primary.every((m) => m.status === "live"),
      `${persona} primary must be live-only`,
    );
    assert.ok(
      !split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])),
      `${persona} primary must not show non-green badges`,
    );
    const limit = WORKSPACE_GREEN_PRIMARY_LIMITS[persona];
    assert.ok(split.primary.length <= limit, `${persona}: ${split.primary.length} > ${limit}`);
  }
});

test("5 wave1 hidden card IDs not in primary hub", () => {
  for (const persona of Object.keys(WAVE1_HIDDEN_WORKSPACE_CARD_IDS) as Array<
    keyof typeof WAVE1_HIDDEN_WORKSPACE_CARD_IDS
  >) {
    const modules =
      persona === "candidate"
        ? CANDIDATE_WORKSPACE_MODULES
        : persona === "recruiter"
          ? RECRUITER_WORKSPACE_MODULES
          : persona === "company"
            ? COMPANY_WORKSPACE_MODULES
            : INVESTOR_WORKSPACE_MODULES;
    const split = splitWorkspaceModules(persona, modules);
    for (const id of WAVE1_HIDDEN_WORKSPACE_CARD_IDS[persona]) {
      assert.ok(!split.primary.some((m) => m.id === id), `${persona}/${id} must not be primary`);
      assert.equal(shouldHideFromDefaultHub(persona, id), true);
      assert.equal(shouldShowAsRoadmap(persona, id), false);
    }
  }
});

test("6 splitProductSurfaceRoutes — empty roadmap for all workspaces", () => {
  for (const persona of ["candidate", "recruiter", "company", "investor"] as const) {
    const split = splitProductSurfaceRoutes(persona, getSystemOfRecordRoutesForPersona(persona));
    assert.equal(split.roadmap.length, 0, `${persona} SoR roadmap must be empty`);
    assert.ok(
      split.primary.every((r) => r.status === "live"),
      `${persona} SoR primary must be live-only`,
    );
  }
});

test("7 green allowed IDs cover expected visible modules", () => {
  assert.ok(isWorkspaceGreenVisible("candidate", "jobs"));
  assert.ok(isWorkspaceGreenVisible("candidate", "evidence"));
  assert.ok(!isWorkspaceGreenVisible("candidate", "referrals"));
  assert.ok(isWorkspaceGreenVisible("recruiter", "inbox"));
  assert.ok(!isWorkspaceGreenVisible("recruiter", "analytics"));
  assert.ok(isWorkspaceGreenVisible("company", "roles"));
  assert.ok(!isWorkspaceGreenVisible("company", "talent_pool"));
  assert.ok(isWorkspaceGreenVisible("investor", "metrics"));
  assert.ok(!isWorkspaceGreenVisible("investor", "data_room"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes("career_compass"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes("search"));
});

test("8 product-surface-visibility integrates green gate", () => {
  const src = read("src/lib/product-surface-visibility.ts");
  assert.match(src, /WORKSPACE_GREEN_ONLY_MODE/);
  assert.match(src, /all-workspace-green-gate/);
  assert.match(src, /getWorkspacePrimaryLimits/);
  assert.deepEqual(getWorkspacePrimaryLimits(), WORKSPACE_GREEN_PRIMARY_LIMITS);
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
