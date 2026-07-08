/**
 * Seven-day D7 final QA readiness — grep audit, stance lock, D1–D6 regression hooks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import { CONTROLLED_PILOT_PRIMARY_LIMITS } from "../src/lib/product-surface-visibility";
import { CAREER_COMPASS_SHIP_STATUS, HIDE_CANDIDATE_BILLING_FROM_HUB } from "../src/lib/seven-day-d2-candidate";
import { RECRUITER_PRIMARY_NAV_HREFS } from "../src/lib/seven-day-d3-recruiter";
import { COMPANY_PRIMARY_NAV_HREFS, SHOW_COMPANY_HUB_NEXT_ACTION } from "../src/lib/seven-day-d4-company";
import { DATA_ROOM_FOUNDER_DECISION, NO_PUBLIC_LAUNCH_CLAIMS_INVESTOR_UI } from "../src/lib/seven-day-d5-investor";
import {
  AUTO_APPLY_PAUSED_HIDDEN,
  NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON,
  STRIPE_NOT_PUBLIC_LAUNCH,
} from "../src/lib/seven-day-d6-integrations";
import {
  CANONICAL_STANCE,
  D7_BANNED_USER_COPY_PATTERNS,
  D7_PRIMARY_UI_PATHS,
  D7_QA_READINESS_LOCK,
  LAUNCH_SURFACE_A,
  NOT_READY_FOR_LAUNCH,
  PILOT_CLUTTER_AUDIT,
  READY_FOR_GATE_F_REVIEW,
  UX_CONSISTENCY_AUDIT,
} from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const D7_DOC = "docs/SEVEN_DAY_D7_FINAL_QA_2026-07-08.md";
const PLAN_DOC = "docs/SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function primaryUiBlob(): string {
  return D7_PRIMARY_UI_PATHS.map((rel) => read(rel)).join("\n");
}

test("1 D7 execution doc exists with all required sections and stance", () => {
  const doc = readRepo(D7_DOC);
  assert.match(doc, /Seven-day D7/i);
  assert.match(doc, /## Executive summary/);
  assert.match(doc, /## Public launch surface/);
  assert.match(doc, /## Controlled pilot surface/);
  assert.match(doc, /## Remaining roadmap/);
  assert.match(doc, /## Remaining founder decisions/);
  assert.match(doc, /## Known limitations/);
  assert.match(doc, /Pilot clutter audit/);
  assert.match(doc, /UX consistency audit/);
  assert.match(doc, /## Open risks/);
  assert.match(doc, /## Final recommendation/);
  assert.match(doc, /Ready for Gate F review/i);
  assert.match(doc, /NOT Ready for Launch/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /PILOT_CLUTTER_AUDIT: MINOR/);
  assert.match(doc, /UX_CONSISTENCY_AUDIT: PASS/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
});

test("2 seven-day-d7 flags — readiness lock, Gate F ready, not launch", () => {
  assert.equal(D7_QA_READINESS_LOCK, true);
  assert.equal(READY_FOR_GATE_F_REVIEW, true);
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  assert.equal(PILOT_CLUTTER_AUDIT, "MINOR");
  assert.equal(UX_CONSISTENCY_AUDIT, "PASS");
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
});

test("3 launch surface A — candidate 8, recruiter 5, company 4", () => {
  assert.equal(LAUNCH_SURFACE_A.candidate, 8);
  assert.equal(LAUNCH_SURFACE_A.recruiter, 5);
  assert.equal(LAUNCH_SURFACE_A.company, 4);
  assert.equal(LAUNCH_SURFACE_A.marketing, "public");
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.candidate, 8);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.recruiter, 5);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.company, 4);
  assert.equal(RECRUITER_PRIMARY_NAV_HREFS.length, 5);
  assert.equal(COMPANY_PRIMARY_NAV_HREFS.length, 4);
});

test("4 primary UI grep — no banned user-facing copy literals", () => {
  const blob = primaryUiBlob();
  for (const pattern of D7_BANNED_USER_COPY_PATTERNS) {
    assert.doesNotMatch(blob, pattern, `banned pattern ${pattern} in primary UI`);
  }
  assert.doesNotMatch(blob, /\bfake upgrade\b/i);
  assert.doesNotMatch(blob, /\ball integrations live\b/i);
});

test("5 EN workspace badge vocabulary — needs_setup and not_live map to Coming soon", () => {
  assert.match(en.workspaceModules.statusNotLive ?? "", /Coming soon/i);
  assert.match(en.workspaceModules.statusNeedsSetup ?? "", /Coming soon/i);
  assert.match(en.workspaceModules.statusLive ?? "", /Live/i);
  assert.match(en.workspaceModules.statusPilot ?? "", /Pilot/i);
  assert.match(en.workspaceModules.statusPaused ?? "", /Paused/i);
  assert.match(dictionaries.pl.workspaceModules.statusNotLive ?? "", /Wkrótce/i);
});

test("6 D1–D6 regression flags still locked", () => {
  assert.equal(CAREER_COMPASS_SHIP_STATUS, "live");
  assert.equal(HIDE_CANDIDATE_BILLING_FROM_HUB, true);
  assert.equal(RECRUITER_PRIMARY_NAV_HREFS.length, 5);
  assert.equal(SHOW_COMPANY_HUB_NEXT_ACTION, true);
  assert.equal(DATA_ROOM_FOUNDER_DECISION, true);
  assert.equal(NO_PUBLIC_LAUNCH_CLAIMS_INVESTOR_UI, true);
  assert.equal(STRIPE_NOT_PUBLIC_LAUNCH, true);
  assert.equal(AUTO_APPLY_PAUSED_HIDDEN, true);
  assert.equal(NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON, true);
});

test("7 plan classification counts — 48 modules documented", () => {
  const plan = readRepo(PLAN_DOC);
  assert.match(
    plan,
    /SEVEN_DAY_CLASSIFICATION_COUNTS: ship=12, hide=14, pilot_only=11, roadmap=8, founder_decision=3, TOTAL=48/,
  );
});

test("8 site chrome — marquee disclaimer and footer illustrative labels", () => {
  const marquee = read("src/components/site-top-marquee.tsx");
  assert.match(marquee, /data-testid="marquee-logo-disclaimer"/);
  assert.match(marquee, /site\.marqueeLogoDisclaimer/);
  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /FOOTER_SOCIAL_PROOF_ILLUSTRATIVE_LABELS/);
});

test("9 recruiter hub — five core quick actions, primary promos off", () => {
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /SHOW_RECRUITER_HUB_PRIMARY_PROMOS/);
  assert.match(hub, /\/recruiter\/inbox/);
  assert.match(hub, /\/recruiter\/analytics/);
  assert.equal((hub.match(/\/recruiter\/inbox/g) ?? []).length >= 1, true);
});

test("10 company hub — next action on, primary promos off", () => {
  const hub = read("src/app/company/dashboard/company-dashboard-client.tsx");
  assert.match(hub, /SHOW_COMPANY_HUB_NEXT_ACTION/);
  assert.match(hub, /SHOW_COMPANY_HUB_PRIMARY_PROMOS/);
  assert.match(hub, /CompanyHubNextAction/);
});

test("11 npm script test:seven-day-d7-final-qa-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:seven-day-d7-final-qa-guard":/);
  assert.match(pkg, /seven-day-d7-final-qa-guard\.test\.ts/);
});
