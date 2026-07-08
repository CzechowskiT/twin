/**
 * Seven-day D5 investor slice — preview hierarchy, invite-only data room, board hidden.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import { INVESTOR_WORKSPACE_MODULES } from "../src/lib/investor-workspace-modules";
import { INVESTOR_LOGIN_INVITE_ONLY_PREVIEW } from "../src/lib/product-polish-p3";
import {
  COLLAPSE_INVESTOR_ROOM_DETAIL_SECTIONS,
  DATA_ROOM_FOUNDER_DECISION,
  DATA_ROOM_INVITE_ONLY_PREVIEW,
  HIDE_BOARD_FROM_INVESTOR_DEFAULT_HUB,
  HIDE_INVESTOR_SOR_ON_PUBLIC_ROOM,
  INVESTOR_BOARD_COLLAPSED_DEFAULT,
  INVESTOR_CALCULATOR_ILLUSTRATIVE_ONLY,
  INVESTOR_HUB_NEXT_ACTION_HREF,
  INVESTOR_METRICS_CONTROLLED_PREVIEW,
  INVESTOR_PRIMARY_MODULE_IDS,
  INVESTOR_ROADMAP_CONTROLLED_PREVIEW,
  INVESTOR_ROADMAP_MODULE_IDS,
  INVESTOR_ROOM_SIMPLIFIED_HIERARCHY,
  NO_PUBLIC_LAUNCH_CLAIMS_INVESTOR_UI,
  PLACEMENT_LIMITED_PILOT,
  PRODUCT_PROOF_PREVIEW_BOUNDARY,
  SHOW_INVESTOR_HUB_NEXT_ACTION,
  TRUST_PROOF_PREVIEW_BOUNDARY,
} from "../src/lib/seven-day-d5-investor";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitProductSurfaceRoutes,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const D5_DOC = "docs/SEVEN_DAY_D5_INVESTOR_EXECUTION_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function moduleStatus(id: string) {
  const mod = INVESTOR_WORKSPACE_MODULES.find((m) => m.id === id);
  assert.ok(mod, `missing module ${id}`);
  return mod!;
}

function investorUiBlob(): string {
  return [
    read("src/components/investor/investor-room-page.tsx"),
    read("src/app/workspace/investor/page.tsx"),
    read("src/app/investor/data-room/page.tsx"),
    read("src/components/investor/investor-data-room-panel.tsx"),
    read("src/app/investor/placement/page.tsx"),
    read("src/components/investor/investor-trust-proof-workspace.tsx"),
    read("src/components/investor/executive-product-proof-board.tsx"),
    read("src/components/investor/investor-metrics-reality-dashboard.tsx"),
    read("src/components/marketing/investor-calculator.tsx"),
    read("src/app/investor/roadmap/page.tsx"),
    read("src/components/workspace/system-of-record-navigation-hub.tsx"),
  ].join("\n");
}

test("1 D5 execution doc exists with stance footer", () => {
  const doc = readRepo(D5_DOC);
  assert.match(doc, /Seven-day D5/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /NOT Launch GO/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
});

test("2 seven-day-d5 flags — preview hierarchy, data room founder decision, board hidden", () => {
  assert.equal(INVESTOR_ROOM_SIMPLIFIED_HIERARCHY, true);
  assert.equal(HIDE_INVESTOR_SOR_ON_PUBLIC_ROOM, true);
  assert.equal(COLLAPSE_INVESTOR_ROOM_DETAIL_SECTIONS, true);
  assert.equal(SHOW_INVESTOR_HUB_NEXT_ACTION, true);
  assert.equal(INVESTOR_HUB_NEXT_ACTION_HREF, "/investor/metrics");
  assert.equal(DATA_ROOM_INVITE_ONLY_PREVIEW, true);
  assert.equal(DATA_ROOM_FOUNDER_DECISION, true);
  assert.equal(PLACEMENT_LIMITED_PILOT, true);
  assert.equal(TRUST_PROOF_PREVIEW_BOUNDARY, true);
  assert.equal(PRODUCT_PROOF_PREVIEW_BOUNDARY, true);
  assert.equal(HIDE_BOARD_FROM_INVESTOR_DEFAULT_HUB, true);
  assert.equal(INVESTOR_BOARD_COLLAPSED_DEFAULT, true);
  assert.equal(INVESTOR_METRICS_CONTROLLED_PREVIEW, true);
  assert.equal(INVESTOR_CALCULATOR_ILLUSTRATIVE_ONLY, true);
  assert.equal(INVESTOR_ROADMAP_CONTROLLED_PREVIEW, true);
  assert.equal(NO_PUBLIC_LAUNCH_CLAIMS_INVESTOR_UI, true);
  assert.ok(INVESTOR_PRIMARY_MODULE_IDS.includes("metrics"));
  assert.ok(INVESTOR_ROADMAP_MODULE_IDS.includes("data_room"));
});

test("3 workspace modules — data room preview invite-only, placement pilot", () => {
  const dataRoom = moduleStatus("data_room");
  assert.equal(dataRoom.status, "preview");
  assert.equal(dataRoom.statusLabelKey, "sevenDayD5.dataRoomInviteOnlyBadge");
  assert.equal(moduleStatus("placement").status, "pilot");
  assert.equal(moduleStatus("metrics").status, "live");
  assert.equal(moduleStatus("calculator").status, "live");
});

test("4 product surface — board hidden, data room roadmap, metrics primary", () => {
  const split = splitWorkspaceModules("investor", INVESTOR_WORKSPACE_MODULES);
  assert.ok(split.primary.some((m) => m.id === "metrics"));
  assert.ok(split.roadmap.some((m) => m.id === "data_room"));
  assert.ok(split.roadmap.some((m) => m.id === "placement"));

  const sor = splitProductSurfaceRoutes("investor", getSystemOfRecordRoutesForPersona("investor"));
  assert.ok(sor.primary.some((r) => r.id === "investor_metrics"));
  assert.ok(sor.roadmap.some((r) => r.id === "investor_data_room"));
  assert.ok(sor.hidden.some((r) => r.href.startsWith("/board/")));
  assert.equal(shouldHideFromDefaultHub("investor", "/board/working-features-readiness"), true);
  assert.equal(classifyProductSurfaceTier("investor", "data_room", "preview"), "PILOT");
});

test("5 investor room — preview copy, collapsed details, no duplicate SoR", () => {
  const room = read("src/components/investor/investor-room-page.tsx");
  assert.match(room, /INVESTOR_ROOM_SIMPLIFIED_HIERARCHY/);
  assert.match(room, /HIDE_INVESTOR_SOR_ON_PUBLIC_ROOM/);
  assert.match(room, /COLLAPSE_INVESTOR_ROOM_DETAIL_SECTIONS/);
  assert.match(room, /data-seven-day-investor-room-details-collapsed/);
  assert.match(en.sevenDayD5.investorRoomPreviewLead ?? "", /on request/i);
  assert.match(en.sevenDayD5.investorRoomPreviewLead ?? "", /No public launch/i);
  assert.match(room, /HIDE_INVESTOR_SOR_ON_PUBLIC_ROOM \? null/);
});

test("6 workspace hub — next action and board collapsed internal", () => {
  const hub = read("src/app/workspace/investor/page.tsx");
  assert.match(hub, /InvestorHubNextAction/);
  assert.match(hub, /SHOW_INVESTOR_HUB_NEXT_ACTION/);
  const sorHub = read("src/components/workspace/system-of-record-navigation-hub.tsx");
  assert.match(sorHub, /data-seven-day-investor-board-hidden/);
  assert.match(sorHub, /investor-board-internal-toggle/);
  assert.match(sorHub, /HIDE_BOARD_FROM_INVESTOR_DEFAULT_HUB/);
});

test("7 data room — invite-only badge, request access, no fake secure room", () => {
  const page = read("src/app/investor/data-room/page.tsx");
  assert.match(page, /DATA_ROOM_INVITE_ONLY_PREVIEW/);
  assert.match(page, /sevenDayD5\.dataRoomInviteOnlyBadge/);
  const panel = read("src/components/investor/investor-data-room-panel.tsx");
  assert.match(panel, /data-seven-day-investor-data-room-invite-boundary/);
  assert.match(panel, /requestAccessCta/);
  assert.match(en.sevenDayD5.dataRoomBoundaryBody ?? "", /No live secure|not a fake/i);
  assert.doesNotMatch(panel, /secure vault is live/i);
});

test("8 placement and proof — pilot/preview boundaries", () => {
  const placement = read("src/app/investor/placement/page.tsx");
  assert.match(placement, /data-seven-day-investor-placement-pilot-boundary/);
  assert.match(en.sevenDayD5.placementPilotBoundaryBody ?? "", /limited pilot/i);
  const trust = read("src/components/investor/investor-trust-proof-workspace.tsx");
  assert.match(trust, /data-seven-day-investor-trust-proof-preview-boundary/);
  const product = read("src/components/investor/executive-product-proof-board.tsx");
  assert.match(product, /data-seven-day-investor-product-proof-preview-boundary/);
  assert.match(en.sevenDayD5.trustProofPreviewBoundaryBody ?? "", /founder-led/i);
  assert.match(en.sevenDayD5.productProofPreviewBoundaryBody ?? "", /third-party customer/i);
});

test("9 investor login — invite-only preview builds on P3", () => {
  assert.equal(INVESTOR_LOGIN_INVITE_ONLY_PREVIEW, true);
  const login = read("src/app/login/investor/page.tsx");
  assert.match(login, /INVESTOR_LOGIN_INVITE_ONLY_PREVIEW/);
  assert.match(login, /productPolish\.investorInviteOnlyBadge/);
  assert.doesNotMatch(login, /needs_setup/i);
});

test("10 metrics calculator roadmap — controlled illustrative copy", () => {
  const metrics = read("src/components/investor/investor-metrics-reality-dashboard.tsx");
  assert.match(metrics, /data-seven-day-investor-metrics-controlled-preview/);
  const calc = read("src/components/marketing/investor-calculator.tsx");
  assert.match(calc, /data-seven-day-investor-calculator-illustrative/);
  const roadmap = read("src/app/investor/roadmap/page.tsx");
  assert.match(roadmap, /data-seven-day-investor-roadmap-controlled-preview/);
  assert.match(en.sevenDayD5.calculatorIllustrativeBody ?? "", /not investment advice/i);
  assert.match(dictionaries.pl.sevenDayD5.calculatorIllustrativeBody ?? "", /nie porada inwestycyjna/i);
});

test("11 no public launch claims in investor UI", () => {
  const blob = investorUiBlob();
  assert.doesNotMatch(blob, /\bpublic launch is GO\b/i);
  assert.doesNotMatch(blob, /\blaunch:\s*GO\b/i);
  assert.match(en.investorRoom.launchStanceBody ?? "", /NO-GO/i);
});

test("12 npm script test:seven-day-d5-investor-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:seven-day-d5-investor-guard":/);
  assert.match(pkg, /seven-day-d5-investor-guard\.test\.ts/);
});
