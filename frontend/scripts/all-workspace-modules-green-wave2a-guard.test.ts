/**
 * Wave 2A — MAKE_GREEN one module (recruiter analytics) static guard (2026-07-09).
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
  WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2A_MAKE_GREEN_MODULE_ID,
  WAVE2A_MAKE_GREEN_SOR_IDS,
  WAVE2A_RESTORED_WORKSPACE_CARD_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import { RECRUITER_ANALYTICS_SHIP_STATUS, HIDE_RECRUITER_ANALYTICS_FROM_HUB, RECRUITER_PRIMARY_NAV_HREFS } from "../src/lib/seven-day-d3-recruiter";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE2A_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md";
const WAVE1_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md";

const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave2a doc exists with stance and selected module", () => {
  const doc = readRepo(WAVE2A_DOC);
  assert.match(doc, /Wave 2A/i);
  assert.match(doc, /WAVE2A_MAKE_GREEN_MODULE: analytics/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
  assert.match(doc, /WAVE2A_BACK_IN_HUB: true/);
});

test("2 wave2a gate exports — analytics green, effective hidden count", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WAVE2A_MAKE_GREEN_MODULE_ID, "analytics");
  assert.deepEqual(WAVE2A_MAKE_GREEN_SOR_IDS, ["analytics", "recruiter_analytics"]);
  assert.deepEqual(WAVE2A_RESTORED_WORKSPACE_CARD_IDS.recruiter, ["analytics"]);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes("analytics"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes("recruiter_analytics"));
});

test("3 seven-day-d3 — analytics live, visible in hub", () => {
  assert.equal(RECRUITER_ANALYTICS_SHIP_STATUS, "live");
  assert.equal(HIDE_RECRUITER_ANALYTICS_FROM_HUB, false);
  assert.equal(RECRUITER_PRIMARY_NAV_HREFS.length, 5);
  assert.ok((RECRUITER_PRIMARY_NAV_HREFS as readonly string[]).includes("/recruiter/analytics"));
});

test("4 recruiter workspace — analytics primary live, pilot modules stay hidden", () => {
  const split = splitWorkspaceModules("recruiter", RECRUITER_WORKSPACE_MODULES);
  const analytics = split.primary.find((m) => m.id === "analytics");
  assert.ok(analytics);
  assert.equal(analytics?.status, "live");
  assert.equal(split.primary.filter((m) => m.status === "live").length, 5);
  assert.equal(split.roadmap.length, 0);
  assert.ok(!split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])));
  assert.ok(split.hidden.some((m) => m.id === "talent_pool"));
  assert.ok(split.hidden.some((m) => m.id === "integrations"));
  assert.equal(shouldHideFromDefaultHub("recruiter", "analytics"), false);
  assert.equal(shouldHideFromDefaultHub("recruiter", "talent_pool"), true);
  assert.equal(classifyProductSurfaceTier("recruiter", "analytics"), "LIVE");
});

test("5 recruiter hub and analytics page — live UX, no preview copy", () => {
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /\/recruiter\/analytics/);
  assert.match(hub, /recruiterAnalyticsCta/);

  const client = read("src/app/recruiter/analytics/recruiter-analytics-client.tsx");
  assert.match(client, /RECRUITER_ANALYTICS_SHIP_STATUS/);
  assert.match(client, /deriveRecruiterAnalyticsSummary/);

  assert.doesNotMatch(en.recruiterAnalytics.notLiveNote ?? "", /preview metrics only/i);
  assert.doesNotMatch(dictionaries.pl.recruiterAnalytics.notLiveNote ?? "", /metryki podglądu/i);
  assert.match(en.recruiterAnalytics.notLiveNote ?? "", /read-only/i);
});

test("6 SoR analytics route status live", () => {
  const routes = getSystemOfRecordRoutesForPersona("recruiter");
  const analytics = routes.find((r) => r.id === "recruiter_analytics");
  assert.ok(analytics);
  assert.equal(analytics?.status, "live");
});

test("7 primary limits — recruiter 5, wave1 modules unchanged", () => {
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.recruiter, 5);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.candidate, 10);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.company, 3);
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.investor, 4);
  assert.ok(isWorkspaceGreenVisible("candidate", "evidence"));
  assert.ok(!isWorkspaceGreenVisible("candidate", "referrals"));
  assert.ok(!isWorkspaceGreenVisible("company", "talent_pool"));
});

test("8 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE2A_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
  const wave1 = readRepo(WAVE1_DOC);
  assert.match(wave1, /Wave 1/i);
});

test("9 npm script test:all-workspace-modules-green-wave2a-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave2a-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave2a-guard\.test\.ts/);
});
