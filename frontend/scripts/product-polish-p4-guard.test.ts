/**
 * Product Polish 1.0 P4 — static guard for dashboard declutter, recruiter roadmap, honest social proof.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries } from "../src/lib/i18n";
import {
  SHOW_DASHBOARD_AUTO_APPLY_STRIP,
  SHOW_DASHBOARD_EXTENDED_HOME_MODULES,
  SHOW_RECRUITER_HUB_PRIMARY_PROMOS,
} from "../src/lib/product-polish-p0";
import {
  FOOTER_SOCIAL_PROOF_ILLUSTRATIVE_LABELS,
  MARK_ILLUSTRATIVE_SOCIAL_PROOF,
  SHOW_CAREER_COMPASS_ON_DASHBOARD_HOME,
  SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED,
  SUBTLE_MARQUEE_LOGO_DISCLAIMER,
} from "../src/lib/product-polish-p4";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const SLICE_DOC = "docs/PRODUCT_POLISH_1_P4_SLICE_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 dashboard declutter — auto-apply off, career compass gated, extended modules collapsed", () => {
  assert.equal(SHOW_DASHBOARD_AUTO_APPLY_STRIP, false);
  assert.equal(SHOW_DASHBOARD_EXTENDED_HOME_MODULES, false);
  assert.equal(SHOW_CAREER_COMPASS_ON_DASHBOARD_HOME, false);
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.doesNotMatch(dashboard, /<NightlyAutoApplyStrip/);
  assert.match(dashboard, /SHOW_CAREER_COMPASS_ON_DASHBOARD_HOME/);
  assert.match(dashboard, /data-dashboard-extended-modules/);
  assert.match(dashboard, /DashboardCommandCenter/);
  assert.match(dashboard, /WorkspaceQuickActions/);
});

test("2 recruiter hub — primary promos off, roadmap in collapsed details, inbox next action", () => {
  assert.equal(SHOW_RECRUITER_HUB_PRIMARY_PROMOS, false);
  assert.equal(SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED, true);
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED/);
  assert.match(hub, /data-recruiter-hub-roadmap-promos/);
  assert.match(hub, /RecruiterHubNextAction/);
  assert.doesNotMatch(hub, /border-violet-500\/25[\s\S]{0,200}RECRUITER_DAILY_COCKPIT_MARKERS\.hubPromo/);
});

test("3 illustrative social proof — pages, homepage, footer labels", () => {
  assert.equal(MARK_ILLUSTRATIVE_SOCIAL_PROOF, true);
  assert.equal(FOOTER_SOCIAL_PROOF_ILLUSTRATIVE_LABELS, true);
  assert.match(read("src/app/(marketing)/testimonials/page.tsx"), /MARK_ILLUSTRATIVE_SOCIAL_PROOF/);
  assert.match(read("src/app/(marketing)/case-studies/page.tsx"), /site\.casesDisclaimer/);
  assert.match(read("src/components/marketing/landing-live-proof.tsx"), /socialProofIllustrativeNote/);
  assert.match(read("src/components/site-footer.tsx"), /nav\.casesIllustrative/);
  assert.match(en.site.testimonialsDisclaimer ?? "", /Illustrative examples/i);
  assert.match(en.site.casesDisclaimer ?? "", /Illustrative examples/i);
});

test("4 subtle marquee logo disclaimer — premium copy, i18n visible on chrome", () => {
  assert.equal(SUBTLE_MARQUEE_LOGO_DISCLAIMER, true);
  const marquee = read("src/components/site-top-marquee.tsx");
  assert.match(marquee, /site\.marqueeLogoDisclaimer/);
  assert.match(en.site.marqueeLogoDisclaimer ?? "", /Representative market context/i);
  assert.match(dictionaries.pl.site.marqueeLogoDisclaimer ?? "", /kontekst rynkowy/i);
});

test("5 P4 slice doc exists with stance footer", () => {
  const doc = readRepo(SLICE_DOC);
  assert.match(doc, /P4 slice/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
});

test("6 npm script test:product-polish-p4-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:product-polish-p4-guard/);
});
