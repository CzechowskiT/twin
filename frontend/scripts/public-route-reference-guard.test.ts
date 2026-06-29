/**
 * Slice 24 — public route reference audit (static, no browser).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDER_DEMO_CROSSLINKS_BY_PAGE,
  founderDemoCrosslinkHrefs,
} from "../src/lib/founder-demo-crosslinks-routes";
import { headerMarketingLaneLinks } from "../src/lib/persona-access";
import {
  HEADER_EXPLORE_MEGA_PANEL_GROUPS,
  HEADER_EXPLORE_MEGA_PANEL_HREFS,
} from "../src/lib/public-explore-mega-panel-routes";
import { PUBLIC_EXPLORE_TWIN_ENTRIES, PUBLIC_EXPLORE_TWIN_HREFS } from "../src/lib/public-explore-twin-routes";
import { PUBLIC_FOOTER_SITEMAP_HREFS } from "../src/lib/public-footer-sitemap-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function assertUnique(hrefs: readonly string[], label: string): void {
  const unique = new Set(hrefs);
  assert.equal(unique.size, hrefs.length, `${label}: duplicate hrefs`);
}

const REQUIRED_NAV_HREFS = [
  "/for-candidates",
  "/for-recruiters",
  "/for-companies",
  "/for-investors",
  "/investor",
  "/investor/product-proof",
  "/demo",
  "/how-it-works",
  "/faq",
  "/dashboard/trust",
  "/status",
] as const;

const REQUIRED_LEGAL_HREFS = ["/privacy", "/terms"] as const;

test("1 required public/demo/investor hrefs appear in known registries", () => {
  const registryHrefs = new Set([
    ...headerMarketingLaneLinks().map((l) => l.href),
    ...HEADER_EXPLORE_MEGA_PANEL_HREFS,
    ...PUBLIC_EXPLORE_TWIN_HREFS,
    ...PUBLIC_FOOTER_SITEMAP_HREFS,
    ...Object.values(FOUNDER_DEMO_CROSSLINKS_BY_PAGE).flatMap((links) => links.map((l) => l.href)),
  ]);
  for (const href of REQUIRED_NAV_HREFS) {
    assert.ok(registryHrefs.has(href), `missing registry href ${href}`);
  }
  const footer = read("src/components/site-footer.tsx");
  for (const href of REQUIRED_LEGAL_HREFS) {
    assert.match(footer, new RegExp(`href="${href.replace("/", "\\/")}"`));
  }
});

test("2 registry groups keep unique hrefs within each lane", () => {
  assertUnique(headerMarketingLaneLinks().map((l) => l.href), "header marketing lane");
  assertUnique(HEADER_EXPLORE_MEGA_PANEL_HREFS, "explore mega-panel");
  assertUnique(PUBLIC_EXPLORE_TWIN_HREFS, "homepage explore twin");
  assertUnique(PUBLIC_FOOTER_SITEMAP_HREFS, "footer sitemap");
  for (const [page, links] of Object.entries(FOUNDER_DEMO_CROSSLINKS_BY_PAGE)) {
    assertUnique(
      links.map((l) => l.href),
      `founder demo crosslinks (${page})`,
    );
  }
});

test("3 guest header investor link is /for-investors — executive room stays in Explore panel", () => {
  const lane = headerMarketingLaneLinks();
  assert.ok(!lane.some((l) => l.href === "/investor" || l.href.startsWith("/investor/")));
  const investor = lane.find((l) => l.labelKey === "nav.personaInvestor");
  assert.equal(investor?.href, "/for-investors");
  assert.ok(HEADER_EXPLORE_MEGA_PANEL_HREFS.includes("/investor"));
  assert.ok(HEADER_EXPLORE_MEGA_PANEL_HREFS.includes("/for-investors"));
});

test("4 recruiter lane has no /calculator/b2b leak", () => {
  const recruiterLaneHrefs = [
    ...headerMarketingLaneLinks().map((l) => l.href),
    ...HEADER_EXPLORE_MEGA_PANEL_GROUPS.find((g) => g.id === "product")!.links.map((l) => l.href),
  ];
  assert.ok(!recruiterLaneHrefs.includes("/calculator/b2b"));
});

test("5 homepage Explore TWIN panel has 10 cards — no stale 7-card inventory", () => {
  assert.equal(PUBLIC_EXPLORE_TWIN_ENTRIES.length, 10);
  assert.ok(PUBLIC_EXPLORE_TWIN_HREFS.includes("/investor/product-proof"));
  assert.ok(PUBLIC_EXPLORE_TWIN_HREFS.includes("/faq"));
  assert.ok(PUBLIC_EXPLORE_TWIN_HREFS.includes("/how-it-works"));
});

test("6 /investor/product-proof discoverable from mega-panel, Explore TWIN, fundraising CTAs, crosslinks", () => {
  assert.ok(HEADER_EXPLORE_MEGA_PANEL_HREFS.includes("/investor/product-proof"));
  assert.ok(PUBLIC_EXPLORE_TWIN_HREFS.includes("/investor/product-proof"));
  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assert.match(fundraising, /href="\/investor\/product-proof"/);
  assert.ok(founderDemoCrosslinkHrefs("for-investors").includes("/investor/product-proof"));
  assert.ok(founderDemoCrosslinkHrefs("investor").includes("/investor/product-proof"));
});

test("7 /demo reachable from all founder-led investor journey surfaces", () => {
  const investorJourneyPages = ["for-investors", "investor", "investor-product-proof"] as const;
  for (const page of investorJourneyPages) {
    assert.ok(
      founderDemoCrosslinkHrefs(page).includes("/demo"),
      `missing /demo on founder crosslinks for ${page}`,
    );
  }
  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assert.match(fundraising, /href="\/demo"/);
});

test("8 /for-investors and /investor remain semantically separate routes", () => {
  assert.notEqual(
    headerMarketingLaneLinks().find((l) => l.labelKey === "nav.personaInvestor")?.href,
    "/investor",
  );
  const investorsGroup = HEADER_EXPLORE_MEGA_PANEL_GROUPS.find((g) => g.id === "investors")!;
  const fundraisingHref = investorsGroup.links.find((l) => l.href === "/for-investors");
  const roomHref = investorsGroup.links.find((l) => l.href === "/investor");
  assert.ok(fundraisingHref);
  assert.ok(roomHref);
  assert.ok(roomHref.highlight);
});
