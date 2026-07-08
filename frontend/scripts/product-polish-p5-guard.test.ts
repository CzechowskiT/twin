/**
 * Product Polish 1.0 P5 — static guard for company hub cleanup, homepage social proof, launch-perception copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries } from "../src/lib/i18n";
import { BILLING_PREMIUM_PREVIEW_ONLY } from "../src/lib/product-polish-p2";
import { SUBTLE_MARQUEE_LOGO_DISCLAIMER } from "../src/lib/product-polish-p4";
import {
  INTEGRATIONS_HONEST_NOT_LIVE_SYNC,
  LIMIT_HOMEPAGE_SOCIAL_PROOF_BAND,
  SHOW_COMPANY_HUB_NEXT_ACTION,
  SHOW_COMPANY_HUB_PRIMARY_PROMOS,
  SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED,
} from "../src/lib/product-polish-p5";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const SLICE_DOC = "docs/PRODUCT_POLISH_1_P5_SLICE_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 company dashboard — primary promos off, roadmap collapsed, next action", () => {
  assert.equal(SHOW_COMPANY_HUB_PRIMARY_PROMOS, false);
  assert.equal(SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED, true);
  assert.equal(SHOW_COMPANY_HUB_NEXT_ACTION, true);
  const dashboard = read("src/app/company/dashboard/company-dashboard-client.tsx");
  assert.match(dashboard, /SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED/);
  assert.match(dashboard, /data-company-hub-roadmap-promos/);
  assert.match(dashboard, /CompanyHubNextAction/);
  assert.doesNotMatch(dashboard, /border-violet-500\/25[\s\S]{0,200}SHOW_COMPANY_HUB_PRIMARY_PROMOS/);
});

test("2 homepage social proof — limited band, illustrative context", () => {
  assert.equal(LIMIT_HOMEPAGE_SOCIAL_PROOF_BAND, true);
  const home = read("src/app/(marketing)/page.tsx");
  assert.match(home, /LIMIT_HOMEPAGE_SOCIAL_PROOF_BAND/);
  assert.match(home, /!LIMIT_HOMEPAGE_SOCIAL_PROOF_BAND \? <DemoLiveSnapshot/);
  assert.match(read("src/components/marketing/landing-home-stats.tsx"), /homepageStatsContextNote/);
  assert.match(read("src/components/marketing/landing-live-proof.tsx"), /socialProofIllustrativeNote/);
  assert.match(read("src/components/site-footer.tsx"), /nav\.casesIllustrative/);
});

test("3 logo disclaimer — short premium copy unchanged", () => {
  assert.equal(SUBTLE_MARQUEE_LOGO_DISCLAIMER, true);
  assert.match(en.site.marqueeLogoDisclaimer ?? "", /Representative market context/i);
  assert.doesNotMatch(en.site.marqueeLogoDisclaimer ?? "", /not all customers/i);
  assert.match(read("src/components/site-top-marquee.tsx"), /site\.marqueeLogoDisclaimer/);
});

test("4 launch-perception copy — billing preview, integrations not live sync", () => {
  assert.equal(BILLING_PREMIUM_PREVIEW_ONLY, true);
  assert.equal(INTEGRATIONS_HONEST_NOT_LIVE_SYNC, true);
  const integrations = read("src/app/company/integrations/company-integrations-client.tsx");
  assert.match(integrations, /integrationsPreviewNotLiveSyncNote/);
  assert.match(en.companyIntegrations.lead, /No live ATS sync/i);
  assert.match(en.workspaceModules.companyIntegrationsHint, /No live ATS sync/i);
  assert.match(en.productPolish.integrationsPreviewNotLiveSyncNote, /No live two-way sync/i);
  assert.match(dictionaries.pl.companyIntegrations.lead, /Bez live sync ATS/i);
});

test("5 P5 slice doc exists with stance footer", () => {
  const doc = readRepo(SLICE_DOC);
  assert.match(doc, /P5 slice/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
});

test("6 npm script test:product-polish-p5-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:product-polish-p5-guard/);
});
