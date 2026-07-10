/**
 * Wave 2B Slice 4 — investor workspace core MAKE_GREEN static guard (2026-07-09).
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
  WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2B_INVESTOR_CORE_ALWAYS_IN_HUB,
  WAVE2B_SLICE4_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2B_SLICE4_MAKE_GREEN_MODULE_ID,
  WAVE2B_SLICE4_MAKE_GREEN_SOR_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import { INVESTOR_WORKSPACE_MODULES } from "../src/lib/investor-workspace-modules";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitProductSurfaceRoutes,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import {
  INVESTOR_CALCULATOR_SHIP_STATUS,
  INVESTOR_CONTACT_SHIP_STATUS,
  INVESTOR_HUB_NEXT_ACTION_HREF,
  INVESTOR_METRICS_SHIP_STATUS,
  INVESTOR_PRIMARY_MODULE_IDS,
  INVESTOR_ROADMAP_SHIP_STATUS,
} from "../src/lib/seven-day-d5-investor";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE2B_INVESTOR_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE2B_INVESTOR_WORKSPACE_2026-07-09.md";

const INVESTOR_HUB_CARD_IDS = ["metrics", "roadmap", "calculator", "contact"] as const;

const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave2b investor workspace doc exists with stance and selected workspace", () => {
  const doc = readRepo(WAVE2B_INVESTOR_DOC);
  assert.match(doc, /Wave 2B/i);
  assert.match(doc, /Selected workspace:\*\* Investor/);
  assert.match(doc, /f262162a20ff6d028f390ff066e64b90747175a7/);
  assert.match(doc, /WAVE2B_SLICE4_MAKE_GREEN_MODULE: metrics/);
  assert.match(doc, /WAVE2B_SLICE4_BACK_IN_HUB: true/);
  assert.match(doc, /WAVE2B_SLICE4_M9_SMOKE: NEEDS_FOUNDER_VISUAL_SMOKE/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
});

test("2 wave2b slice4 gate exports — investor core green, hidden count unchanged", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WAVE2B_SLICE4_MAKE_GREEN_MODULE_ID, "metrics");
  assert.deepEqual(WAVE2B_SLICE4_MAKE_GREEN_SOR_IDS, [
    "metrics",
    "investor_metrics",
    "roadmap",
    "investor_roadmap",
    "calculator",
    "investor_calculator",
    "contact",
    "investor_contact",
  ]);
  assert.equal(WAVE2B_INVESTOR_CORE_ALWAYS_IN_HUB, true);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.equal(WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.equal(WAVE2B_SLICE4_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);

  const hubIds = GREEN_WORKSPACE_ALLOWED_IDS.investor.filter(
    (id) => !id.startsWith("investor_"),
  );
  assert.deepEqual(hubIds, [...INVESTOR_HUB_CARD_IDS]);
  for (const id of INVESTOR_HUB_CARD_IDS) {
    assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.investor.includes(id));
  }
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.investor.includes("investor_workspace_hub"));
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.investor.includes("investor_public_room"));
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.investor.includes("public_room"));
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.investor.includes("data_room"));
});

test("3 seven-day-d5 — investor quartet live, visible in hub", () => {
  assert.equal(INVESTOR_METRICS_SHIP_STATUS, "live");
  assert.equal(INVESTOR_ROADMAP_SHIP_STATUS, "live");
  assert.equal(INVESTOR_CALCULATOR_SHIP_STATUS, "live");
  assert.equal(INVESTOR_CONTACT_SHIP_STATUS, "live");
  assert.equal(INVESTOR_HUB_NEXT_ACTION_HREF, "/investor/metrics");
  for (const id of INVESTOR_HUB_CARD_IDS) {
    assert.equal(shouldHideFromDefaultHub("investor", id), false);
    assert.equal(classifyProductSurfaceTier("investor", id), "LIVE");
  }
  assert.deepEqual(
    INVESTOR_PRIMARY_MODULE_IDS.filter((id) => !id.startsWith("investor_")),
    [...INVESTOR_HUB_CARD_IDS],
  );
});

test("4 investor workspace — quartet primary live, non-green hidden", () => {
  const split = splitWorkspaceModules("investor", INVESTOR_WORKSPACE_MODULES);
  assert.equal(split.primary.length, 4);
  assert.equal(split.roadmap.length, 0);
  assert.ok(split.primary.some((m) => m.id === "metrics"));
  assert.ok(split.primary.some((m) => m.id === "roadmap"));
  assert.ok(split.primary.some((m) => m.id === "calculator"));
  assert.ok(split.primary.some((m) => m.id === "contact"));
  assert.ok(!split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])));
  assert.ok(split.hidden.some((m) => m.id === "data_room"));
  assert.ok(split.hidden.some((m) => m.id === "placement"));
});

test("5 investor pages — ship markers, illustrative calculator, contact action", () => {
  const metrics = read("src/components/investor/investor-metrics-reality-dashboard.tsx");
  assert.match(metrics, /INVESTOR_METRICS_SHIP_STATUS/);
  assert.match(metrics, /data-wave2b-investor-metrics-green/);

  const roadmap = read("src/app/investor/roadmap/page.tsx");
  assert.match(roadmap, /INVESTOR_ROADMAP_SHIP_STATUS/);
  assert.match(roadmap, /data-wave2b-investor-roadmap-green/);

  const calc = read("src/components/marketing/investor-calculator.tsx");
  assert.match(calc, /INVESTOR_CALCULATOR_SHIP_STATUS/);
  assert.match(calc, /data-wave2b-investor-calculator-green/);
  assert.match(calc, /data-seven-day-investor-calculator-illustrative/);

  const hub = read("src/app/workspace/investor/page.tsx");
  assert.match(hub, /data-wave2b-investor-workspace-green/);
  assert.match(hub, /WAVE2B_SLICE4_MAKE_GREEN_MODULE_ID/);

  const modules = read("src/lib/investor-workspace-modules.ts");
  assert.match(modules, /DECK_MAIL = "contact@twin\.care"/);
  assert.match(modules, /mailto:\$\{DECK_MAIL\}/);
  assert.match(modules, /investorContactCta/);
});

test("6 SoR investor — data room and board hidden, metrics primary", () => {
  const split = splitProductSurfaceRoutes("investor", getSystemOfRecordRoutesForPersona("investor"));
  assert.ok(split.primary.some((r) => r.id === "investor_metrics"));
  assert.ok(split.hidden.some((r) => r.id === "investor_data_room"));
  assert.ok(split.hidden.some((r) => r.href.startsWith("/board/")));
  assert.ok(!split.primary.some((r) => r.id === "investor_trust_proof"));
  assert.ok(!split.primary.some((r) => r.id === "investor_product_proof"));
  assert.equal(shouldHideFromDefaultHub("investor", "data_room"), true);
  assert.equal(shouldHideFromDefaultHub("investor", "/board/working-features-readiness"), true);
});

test("7 honest copy — read-only metrics, illustrative calculator, founder contact", () => {
  const metricsValue = en.workspaceModules.investorMetricsValue ?? "";
  const roadmapValue = en.workspaceModules.investorRoadmapValue ?? "";
  const calculatorValue = en.workspaceModules.investorCalculatorValue ?? "";
  const contactValue = en.workspaceModules.investorContactValue ?? "";
  const hubLead = en.sevenDayD5.investorWorkspaceHubLead ?? "";
  const dataRoomValue = en.workspaceModules.investorDataRoomValue ?? "";
  const calcBody = en.sevenDayD5.calculatorIllustrativeBody ?? "";
  const trustBody = en.sevenDayD5.trustProofPreviewBoundaryBody ?? "";
  const productBody = en.sevenDayD5.productProofPreviewBoundaryBody ?? "";

  assert.match(metricsValue, /read-only/i);
  assert.match(roadmapValue, /transparent/i);
  assert.match(calculatorValue, /not investment advice/i);
  assert.match(contactValue, /founder/i);
  assert.match(hubLead, /four live modules/i);
  assert.match(dataRoomValue, /invite-only/i);
  assert.match(calcBody, /not investment advice/i);
  assert.match(trustBody, /founder-led/i);
  assert.match(trustBody, /No verified external customer/i);
  assert.match(productBody, /not third-party customer/i);

  const plCalc = dictionaries.pl.sevenDayD5.calculatorIllustrativeBody ?? "";
  assert.match(plCalc, /nie porada inwestycyjna/i);
});

test("8 investor login — invite-only preview, roadmap outside workspace, no needs_setup", () => {
  const login = read("src/app/login/investor/page.tsx");
  assert.match(login, /INVESTOR_LOGIN_INVITE_ONLY_PREVIEW/);
  assert.match(login, /data-wave3-investor-public-login-roadmap/);
  assert.match(login, /investorLogin\.requestAccessCta/);
  assert.doesNotMatch(login, /needs_setup/i);
});

test("9 primary limits — investor ceiling 4, core green visible", () => {
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.investor, 4);
  for (const id of INVESTOR_HUB_CARD_IDS) {
    assert.ok(isWorkspaceGreenVisible("investor", id));
  }
  assert.ok(!isWorkspaceGreenVisible("investor", "data_room"));
  assert.ok(!isWorkspaceGreenVisible("investor", "placement"));
  assert.ok(!isWorkspaceGreenVisible("investor", "investor_data_room"));
});

test("10 routes preserved — SoR registry still lists hidden investor modules", () => {
  const routes = getSystemOfRecordRoutesForPersona("investor");
  const ids = routes.map((r) => r.id);
  assert.ok(ids.includes("investor_data_room"));
  assert.ok(ids.includes("investor_placement"));
  assert.ok(ids.includes("investor_trust_proof"));
  assert.ok(ids.includes("investor_product_proof"));
  assert.ok(ids.some((id) => id.startsWith("board_") || routes.find((r) => r.id === id)?.href.startsWith("/board/")));
});

test("11 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE2B_INVESTOR_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
});

test("12 npm script test:all-workspace-modules-green-wave2b-investor-workspace-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave2b-investor-workspace-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave2b-investor-workspace-guard\.test\.ts/);
});
