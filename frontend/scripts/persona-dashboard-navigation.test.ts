import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import { RECRUITER_HUB_ROUTE, RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { INVESTOR_WORKSPACE_MODULES } from "../src/lib/investor-workspace-modules";
import { RECRUITER_INTEGRATIONS_ROUTE } from "../src/lib/recruiter-integrations-readiness";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("workspace module components exist", () => {
  for (const file of [
    "workspace-status-badge.tsx",
    "workspace-module-card.tsx",
    "workspace-module-grid.tsx",
    "workspace-quick-actions.tsx",
    "workspace-module-hub.tsx",
  ]) {
    assert.match(readFileSync(join(root, `src/components/workspace/${file}`), "utf8"), /export function/);
  }
});

test("recruiter hub route and redirect", () => {
  assert.equal(RECRUITER_HUB_ROUTE, "/recruiter");
  assert.match(readFileSync(join(root, "src/app/recruiter/page.tsx"), "utf8"), /SystemOfRecordNavigationHub/);
  assert.match(readFileSync(join(root, "src/app/workspace/recruiter/page.tsx"), "utf8"), /redirect/);
});

test("workspace recruiter integrations redirects to canonical route", () => {
  const src = readFileSync(join(root, "src/app/workspace/recruiter/integrations/page.tsx"), "utf8");
  assert.match(src, /RECRUITER_INTEGRATIONS_ROUTE/);
  assert.match(src, /redirect/);
});

test("candidate dashboard includes module nav", () => {
  const dash = readFileSync(join(root, "src/app/dashboard/page.tsx"), "utf8");
  assert.match(dash, /CandidateModuleNav/);
  assert.ok(CANDIDATE_WORKSPACE_MODULES.some((m) => m.id === "auto_apply" && m.status === "paused"));
});

test("auto-apply anchor on nightly strip", () => {
  assert.match(readFileSync(join(root, "src/components/nightly-auto-apply-strip.tsx"), "utf8"), /id="auto-apply-readiness"/);
});

test("recruiter calendar module is not live", () => {
  const cal = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "calendar");
  assert.ok(cal);
  assert.equal(cal.status, "not_live");
});

test("company and investor hubs wired", () => {
  assert.ok(COMPANY_WORKSPACE_MODULES.length >= 6);
  assert.ok(INVESTOR_WORKSPACE_MODULES.length >= 5);
  assert.match(readFileSync(join(root, "src/app/company/dashboard/company-dashboard-client.tsx"), "utf8"), /SystemOfRecordNavigationHub/);
  assert.match(readFileSync(join(root, "src/app/workspace/investor/page.tsx"), "utf8"), /SystemOfRecordNavigationHub/);
});

test("workspaceModules i18n keys for all locales", () => {
  for (const locale of LOCALES) {
    const block = dictionaries[locale].workspaceModules;
    assert.ok(block.statusLive.length > 0, locale);
    assert.ok(block.recruiterHubTitle.length > 0, locale);
    assert.ok(block.candidateAutoApplyTitle.length > 0, locale);
  }
});

test("copy avoids fake live calendar sync", () => {
  const text = [
    en.workspaceModules.recruiterCalendarValue,
    en.workspaceModules.recruiterCalendarHint,
    en.workspaceModules.candidateAutoApplyValue,
  ].join("\n");
  assert.match(text.toLowerCase(), /not live|paused|wstrzymany/i);
});

test("SoR registry includes reconciled workspace-only modules", () => {
  const byId = Object.fromEntries(SYSTEM_OF_RECORD_ROUTES.map((r) => [r.id, r]));
  assert.equal(byId.recruiter_pipeline?.status, "live");
  assert.equal(byId.recruiter_calendar?.status, "not_live");
  assert.equal(byId.company_pipeline?.status, "live");
  assert.equal(byId.candidate_career_compass?.status, "pilot");
});

test("company live SoR modules surface tenant token hints", () => {
  const live = SYSTEM_OF_RECORD_ROUTES.filter((r) => r.persona === "company" && r.status === "live");
  assert.ok(live.every((r) => r.hintKey));
  assert.match(en.systemOfRecord.companyDashboardHint.toLowerCase(), /token|pilot|slug|tenant/i);
});
