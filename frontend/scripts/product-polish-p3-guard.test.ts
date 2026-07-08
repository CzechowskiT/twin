/**
 * Product Polish 1.0 P3 — static guard for demo journey badge migration and investor invite-only copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries } from "../src/lib/i18n";
import {
  DEMO_JOURNEY_BADGE_MIGRATION,
  DEMO_JOURNEY_DEFAULT_STATUS,
  INVESTOR_LOGIN_INVITE_ONLY_PREVIEW,
  UNIFIED_DEMO_JOURNEY_COPY,
} from "../src/lib/product-polish-p3";
import { INVESTOR_PUBLIC_PREVIEW_MODULES } from "../src/lib/investor-workspace-modules";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const SLICE_DOC = "docs/PRODUCT_POLISH_1_P3_SLICE_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 demo journey badge migration flags", () => {
  assert.equal(DEMO_JOURNEY_BADGE_MIGRATION, true);
  assert.equal(DEMO_JOURNEY_DEFAULT_STATUS, "preview");
  assert.equal(UNIFIED_DEMO_JOURNEY_COPY, true);
  const component = read("src/components/workspace/demo-journey-pilot-status.tsx");
  assert.match(component, /DemoJourneyPilotStatus/);
  assert.match(component, /WorkspaceStatusBadge/);
  assert.match(component, /productPolish\.demoJourneyLead/);
});

test("2 unified demo journey copy in i18n", () => {
  assert.match(en.productPolish.demoJourneyLead, /not part of public launch/i);
  assert.match(en.productPolish.demoJourneyLead, /Human decision required/i);
  assert.match(dictionaries.pl.productPolish.demoJourneyLead, /poza publicznym launch/i);
});

test("3 canonical status label — Limited Pilot", () => {
  assert.match(en.workspaceModules.statusPilot, /Limited Pilot/i);
  assert.match(dictionaries.pl.workspaceModules.statusPilot, /Ograniczony pilot/i);
});

test("4 investor login invite-only preview — not needs_setup", () => {
  assert.equal(INVESTOR_LOGIN_INVITE_ONLY_PREVIEW, true);
  const login = read("src/app/login/investor/page.tsx");
  assert.match(login, /INVESTOR_LOGIN_INVITE_ONLY_PREVIEW/);
  assert.match(login, /productPolish\.investorInviteOnlyBadge/);
  assert.match(login, /productPolish\.investorInviteOnlyLead/);
  const loginModule = INVESTOR_PUBLIC_PREVIEW_MODULES.find((m) => m.id === "login");
  assert.ok(loginModule);
  assert.equal(loginModule.status, "preview");
  assert.equal(loginModule.statusLabelKey, "productPolish.investorInviteOnlyBadge");
  assert.match(en.productPolish.investorInviteOnlyBadge, /Invite-only preview/i);
  assert.match(en.productPolish.investorInviteOnlyLead, /invite-only/i);
});

test("5 demo journey workspaces use DemoJourneyPilotStatus", () => {
  const samples = [
    "src/components/recruiter/decision-memory-workspace.tsx",
    "src/components/recruiter/candidate-collaboration-workspace.tsx",
    "src/components/candidate/candidate-trust-overview-workspace.tsx",
    "src/components/investor/investor-trust-proof-workspace.tsx",
    "src/components/hiring-journey/HiringJourneyTimeline.tsx",
    "src/components/scheduling-proposal/SchedulingProposalPanel.tsx",
  ];
  for (const rel of samples) {
    const src = read(rel);
    assert.match(src, /DemoJourneyPilotStatus/, `${rel} should use DemoJourneyPilotStatus`);
    assert.doesNotMatch(
      src,
      /border-amber-500\/40 bg-amber-500\/10.*pilotBadge/,
      `${rel} should not keep inline amber pilot chip`,
    );
  }
});

test("6 workspace status badge supports label override", () => {
  const badge = read("src/components/workspace/workspace-status-badge.tsx");
  assert.match(badge, /labelKey/);
  const card = read("src/components/workspace/workspace-module-card.tsx");
  assert.match(card, /mod\.statusLabelKey/);
});

test("7 P3 slice doc exists with stance footer", () => {
  const doc = readRepo(SLICE_DOC);
  assert.match(doc, /P3 slice/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
});
