/**
 * Wave 3 Slice 3 — investor public login MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE guard (2026-07-09).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GREEN_WORKSPACE_ALLOWED_IDS,
  INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF,
  isWorkspaceGreenVisible,
  WAVE1_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE3_SLICE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE3_SLICE3_INVESTOR_LOGIN_MODULE_ID,
  WAVE3_SLICE3_INVESTOR_LOGIN_SOR_IDS,
  WAVE3_SLICE3_MOVE_TO_ROADMAP_ACTION,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import {
  INVESTOR_PUBLIC_PREVIEW_MODULES,
  INVESTOR_WORKSPACE_MODULES,
} from "../src/lib/investor-workspace-modules";
import { getPersonaBundle } from "../src/lib/persona-pages";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import {
  HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW,
  INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  INVESTOR_PUBLIC_LOGIN_ROADMAP_STATUS,
  LOGIN_HUB_INVESTOR_ZONE_HREF,
} from "../src/lib/seven-day-d5-investor";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { HEADER_EXPLORE_MEGA_PANEL_GROUPS } from "../src/lib/public-explore-mega-panel-routes";
import { LOGIN_PATH } from "../src/lib/persona-auth";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE3_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE3_INVESTOR_LOGIN_2026-07-09.md";
const PR_442_MERGE_SHA = "8335bf8523f04b6beb9b0939e795e416c9a661bc";

const INVESTOR_HUB_CARD_IDS = ["metrics", "roadmap", "calculator", "contact"] as const;
const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave3 investor login doc exists with stance and PR #442 merge SHA", () => {
  const doc = readRepo(WAVE3_DOC);
  assert.match(doc, /Wave 3/i);
  assert.match(doc, new RegExp(PR_442_MERGE_SHA));
  assert.match(doc, /MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE/);
  assert.match(doc, /WAVE3_SLICE3_MOVE_TO_ROADMAP_MODULES: investor_public_login/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
  assert.match(doc, /WAVE3_COMPLETE: true/);
});

test("2 wave3 slice3 gate exports — login not green, roadmap outside href", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WAVE3_SLICE3_INVESTOR_LOGIN_MODULE_ID, "login");
  assert.equal(WAVE3_SLICE3_MOVE_TO_ROADMAP_ACTION, "MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE");
  assert.equal(INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF, "/investor/roadmap#investor-public-login");
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE3_SLICE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.investor.includes("login"));
  assert.ok(!isWorkspaceGreenVisible("investor", "login"));
  assert.ok(WAVE3_SLICE3_INVESTOR_LOGIN_SOR_IDS.includes("login"));
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.investor, 4);
});

test("3 seven-day flags — investor login roadmap outside workspace, hidden from preview", () => {
  assert.equal(INVESTOR_PUBLIC_LOGIN_ROADMAP_STATUS, "coming_soon");
  assert.equal(HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW, true);
  assert.equal(INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, true);
  assert.equal(LOGIN_HUB_INVESTOR_ZONE_HREF, INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF);
  assert.equal(shouldHideFromDefaultHub("investor", "login"), true);
  assert.equal(classifyProductSurfaceTier("investor", "login", "preview"), "INTERNAL");
});

test("4 investor workspace — quartet primary live, login hidden from modules", () => {
  const split = splitWorkspaceModules("investor", INVESTOR_WORKSPACE_MODULES);
  assert.equal(split.primary.length, 4);
  assert.equal(split.roadmap.length, 0);
  for (const id of INVESTOR_HUB_CARD_IDS) {
    assert.ok(split.primary.some((m) => m.id === id), `missing green hub card ${id}`);
  }
  assert.ok(!split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])));

  const previewSplit = splitWorkspaceModules("investor", INVESTOR_PUBLIC_PREVIEW_MODULES);
  assert.ok(!previewSplit.primary.some((m) => m.id === "login"));
  assert.ok(previewSplit.hidden.some((m) => m.id === "login"));
});

test("5 investor room — login card removed from public preview grid", () => {
  const room = read("src/components/investor/investor-room-page.tsx");
  assert.match(room, /HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW/);
  assert.doesNotMatch(room.split("INVESTOR_PUBLIC_PREVIEW_MODULES").pop() ?? "", /login\/investor/);
});

test("6 login hub — investor zone routes to roadmap, not primary self-service login", () => {
  const hub = read("src/components/auth/login-zone-hub.tsx");
  assert.match(hub, /INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE/);
  assert.match(hub, /LOGIN_HUB_INVESTOR_ZONE_HREF/);
  assert.equal(LOGIN_PATH.investor, "/login/investor");
  assert.match(en.login.hubLead ?? "", /invite-only|Invite-only/i);
  assert.match(en.authRoles.investorTools ?? "", /Invite-only|Roadmap/i);
});

test("7 deep link /login/investor — invite-only badge, roadmap note, request access, no needs_setup", () => {
  const login = read("src/app/login/investor/page.tsx");
  assert.match(login, /INVESTOR_LOGIN_INVITE_ONLY_PREVIEW/);
  assert.match(login, /productPolish\.investorInviteOnlyBadge/);
  assert.match(login, /data-wave3-investor-public-login-roadmap/);
  assert.match(login, /INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF/);
  assert.match(login, /investorLogin\.requestAccessCta/);
  assert.match(login, /investorLogin\.contactFounderCta/);
  assert.doesNotMatch(login, /needs_setup/i);
  assert.match(en.investorLogin.outsideWorkspaceNote ?? "", /outside the green workspace|poza zielonym workspace/i);
  assert.match(en.investorLogin.noPublicSelfServiceBody ?? "", /not available|nie są dostępne/i);
});

test("8 investor roadmap — investor-public-login section", () => {
  const panel = read("src/components/investor/investor-roadmap-founder-updates-panel.tsx");
  assert.match(panel, /id="investor-public-login"/);
  assert.match(panel, /data-wave3-investor-public-login-roadmap/);
  assert.match(panel, /\/login\/investor/);
  assert.match(en.investorRoadmap.investorPublicLoginRoadmapLead ?? "", /product roadmap|roadmapie produktu/i);
  assert.match(en.investorRoadmap.investorPublicLoginRoadmapBody ?? "", /invite-only|zaproszenie/i);
  assert.match(en.investorRoadmap.investorPublicLoginRoadmapBody ?? "", /no public self-service|bez publicznego/i);
  const founderRoadmap = read("src/lib/investor-founder-roadmap.ts");
  assert.match(founderRoadmap, /nextInvestorPublicLogin/);
});

test("9 marketing — no primary sign-in CTAs to /login/investor on public surfaces", () => {
  const investorsEn = getPersonaBundle("investors", "en");
  assert.doesNotMatch(investorsEn.primaryCta.href, /\/login\/investor/);
  assert.match(investorsEn.primaryCta.label, /Request access|Poproś o dostęp/i);
  assert.equal(investorsEn.secondaryCta?.href, INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF);
  assert.ok(!investorsEn.tiers.some((tier) => tier.href === "/login/investor"));

  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assert.doesNotMatch(fundraising, /href="\/login\/investor"/);
  assert.match(fundraising, /INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF/);

  const marketing = read("src/components/marketing/persona-marketing-page.tsx");
  assert.match(marketing, /data-wave3-investor-login-marketing-roadmap/);
  assert.match(marketing, /INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF/);

  const gate = read("src/components/candidate-workspace-gate.tsx");
  assert.doesNotMatch(gate, /href="\/login\/investor"/);
  assert.match(gate, /investorLogin\.requestAccessCta/);
});

test("10 explore header — investor access roadmap link, not login hub primary", () => {
  const investorsGroup = HEADER_EXPLORE_MEGA_PANEL_GROUPS.find((g) => g.id === "investors");
  assert.ok(investorsGroup);
  assert.ok(investorsGroup!.links.some((l) => l.href === INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF));
  assert.ok(!investorsGroup!.links.some((l) => l.href === "/login/investor"));
});

test("11 route preserved — login path and preview module registry intact", () => {
  const loginModule = INVESTOR_PUBLIC_PREVIEW_MODULES.find((m) => m.id === "login");
  assert.ok(loginModule);
  assert.equal(loginModule?.href, "/login/investor");
  assert.equal(loginModule?.status, "preview");
  assert.equal(LOGIN_PATH.investor, "/login/investor");
});

test("12 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE3_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
  const plLead = dictionaries.pl.investorRoadmap.investorPublicLoginRoadmapLead ?? "";
  assert.match(plLead, /roadmapie produktu/i);
});

test("13 npm script test:all-workspace-modules-green-wave3-investor-login-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave3-investor-login-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave3-investor-login-guard\.test\.ts/);
});
