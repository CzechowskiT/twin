/**
 * Static guardrails for company team & permissions MVP.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import { en, dictionaries, LOCALES } from "../src/lib/i18n";
import {
  COMPANY_TEAM_FORBIDDEN_PATTERNS,
  COMPANY_TEAM_ROUTE,
  COMPANY_TEAM_ROLE_IDS,
  companyTeamCopyIsSafe,
} from "../src/lib/company-team-permissions";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const CLIENT = "src/app/company/team/company-team-client.tsx";
const PANEL = "src/components/company/company-team-panel.tsx";
const NAV = "src/components/company/company-workspace-nav.tsx";
const API = "src/app/api/company/team/route.ts";
const DOC = "../docs/COMPANY_TEAM_PERMISSIONS_MVP_2026-06-11.md";
const SERVICE = "../backend/app/services/company_team.py";
const COMPANY_API = "../backend/app/api/company.py";

test("team route and page exist", () => {
  assert.equal(COMPANY_TEAM_ROUTE, "/company/team");
  assert.match(read(CLIENT), /data-company-team-page="true"/);
  assert.match(read(CLIENT), /RecruiterAccessFields/);
});

test("five role preview cards and readiness markers", () => {
  const panel = read(PANEL);
  assert.match(panel, /COMPANY_TEAM_VISUAL_MARKERS\.readinessBanner/);
  assert.match(panel, /COMPANY_TEAM_VISUAL_MARKERS\.inviteDisabled/);
  assert.equal(COMPANY_TEAM_ROLE_IDS.length, 5);
  assert.match(panel, /data-company-team-role-card=\{roleId\}/);
});

test("invite CTA disabled and labeled not live", () => {
  const panel = read(PANEL);
  assert.match(panel, /companyTeam\.inviteNotLive/);
  assert.match(panel, /disabled/);
  assert.match(panel, /companyTeam\.inviteDisabledCta/);
});

test("forbidden patterns absent from UI and service", () => {
  const blob = [read(PANEL), read(CLIENT), read(SERVICE), read(COMPANY_API)].join("\n");
  for (const pattern of COMPANY_TEAM_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(blob, pattern, `Forbidden: ${pattern}`);
  }
  assert.ok(companyTeamCopyIsSafe(en.companyTeam.trustBody));
});

test("readiness flags hard-coded false in backend service", () => {
  const service = read(SERVICE);
  assert.match(service, /"invites_live": False/);
  assert.match(service, /"rbac_live": False/);
  assert.match(service, /"membership_model_live": False/);
});

test("company workspace nav links team and B2B calculator", () => {
  const nav = read(NAV);
  assert.match(nav, /COMPANY_TEAM_ROUTE/);
  assert.match(nav, /\/calculator\/b2b/);
  assert.match(nav, /key: "navTeam"/);
});

test("api proxy targets company team endpoint (GET only)", () => {
  assert.match(read(API), /\/api\/v1\/company\/team/);
  assert.match(read(API), /recruiterInboxProxyGate/);
  assert.doesNotMatch(read(API), /\bPOST\b/);
});

test("companyTeam i18n keys exist for all locales", () => {
  const keys = Object.keys(en.companyTeam);
  for (const locale of LOCALES) {
    const section = dictionaries[locale].companyTeam;
    for (const key of keys) {
      assert.ok(section[key as keyof typeof section]?.trim(), `${locale} missing companyTeam.${key}`);
    }
  }
});

test("mvp doc states read-only scope and bans", () => {
  const doc = read(DOC);
  assert.match(doc, /read-only/i);
  assert.match(doc, /No outbound/i);
  assert.match(doc, /fake team members/i);
});

console.log("company-team-permissions-mvp: ok");
