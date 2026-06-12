import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("workspace status badge renders all tiers", () => {
  const src = readFileSync(join(root, "src/components/workspace/workspace-status-badge.tsx"), "utf8");
  for (const tier of ["live", "pilot", "planned", "not_live", "needs_setup", "paused"]) {
    assert.match(src, new RegExp(tier));
  }
});

test("module cards use premium dark studio surfaces", () => {
  const card = readFileSync(join(root, "src/components/workspace/workspace-module-card.tsx"), "utf8");
  assert.match(card, /twin-surface-2/);
  assert.match(card, /WorkspaceStatusBadge/);
  assert.match(card, /data-workspace-module/);
});

test("company integrations client has readiness rows not blank shell", () => {
  const src = readFileSync(join(root, "src/app/company/integrations/company-integrations-client.tsx"), "utf8");
  assert.match(src, /COMPANY_INTEGRATION_ROWS/);
  assert.match(src, /CompanyWorkspaceNav/);
  assert.doesNotMatch(src, /return null/);
});

test("investor public room has gated preview grid", () => {
  const src = readFileSync(join(root, "src/components/investor/investor-room-page.tsx"), "utf8");
  assert.match(src, /investor-gated-preview/);
  assert.match(src, /WorkspaceModuleGrid/);
});

test("company billing module honest not live", () => {
  const billing = COMPANY_WORKSPACE_MODULES.find((m) => m.id === "billing");
  assert.ok(billing);
  assert.equal(billing.status, "not_live");
  assert.match(en.workspaceModules.companyBillingValue.toLowerCase(), /not live/);
});

test("guided empty state still used on company roles", () => {
  assert.match(readFileSync(join(root, "src/app/company/roles/page.tsx"), "utf8"), /GuidedEmptyState/);
});

test("empty state i18n keys present", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].companyHiring.emptyTitle.length > 0, locale);
    assert.ok(dictionaries[locale].companyIntegrations.lead.length > 0, locale);
  }
});
