/**
 * Slice 20 — public marketing consistency guards (static, no browser).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  headerMarketingLaneLinks,
} from "../src/lib/persona-access";
import { getPersonaBundle } from "../src/lib/persona-pages";
import {
  HEADER_EXPLORE_MEGA_PANEL_GROUPS,
  HEADER_EXPLORE_MEGA_PANEL_HREFS,
} from "../src/lib/public-explore-mega-panel-routes";
import { PUBLIC_EXPLORE_TWIN_ENTRIES, PUBLIC_EXPLORE_TWIN_HREFS } from "../src/lib/public-explore-twin-routes";
import { PUBLIC_FOOTER_SITEMAP_HREFS } from "../src/lib/public-footer-sitemap-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const CONTAINER_TOKENS = ["mx-auto", "max-w-6xl", "px-4", "sm:px-6"];

test("guest header main lane preserves PR #337 six marketing links — no /investor shortcut", () => {
  const links = headerMarketingLaneLinks();
  assert.deepEqual(
    links.map((l) => l.href),
    ["/for-candidates", "/for-recruiters", "/for-companies", "/for-investors", "/faq", "/demo"],
  );
  assert.ok(!links.some((l) => l.href === "/investor" || l.href.startsWith("/investor/")));
  const investor = links.find((l) => l.labelKey === "nav.personaInvestor");
  assert.equal(investor?.href, "/for-investors");
});

test("explore mega-panel groups and links remain complete", () => {
  assert.deepEqual(
    HEADER_EXPLORE_MEGA_PANEL_GROUPS.map((g) => g.id),
    ["product", "investors", "demo", "trust"],
  );
  assert.deepEqual(HEADER_EXPLORE_MEGA_PANEL_HREFS, [
    "/dashboard",
    "/recruiter",
    "/company/dashboard",
    "/for-investors",
    "/investor",
    "/investor/product-proof",
    "/how-it-works",
    "/faq",
    "/dashboard/trust",
    "/status",
  ]);
  const investors = HEADER_EXPLORE_MEGA_PANEL_GROUPS.find((g) => g.id === "investors");
  assert.ok(investors?.links.some((l) => l.href === "/investor" && l.highlight));
  const investorHrefs = investors?.links.map((l) => l.href) ?? [];
  assert.equal(new Set(investorHrefs).size, investorHrefs.length);
});

test("explore twin homepage panel keeps ten unique hrefs", () => {
  assert.equal(PUBLIC_EXPLORE_TWIN_ENTRIES.length, 10);
  assert.equal(new Set(PUBLIC_EXPLORE_TWIN_HREFS).size, 10);
});

test("footer sitemap keeps nine stable links with distinct investor labels", () => {
  assert.deepEqual(PUBLIC_FOOTER_SITEMAP_HREFS, [
    "/for-candidates",
    "/for-recruiters",
    "/for-companies",
    "/for-investors",
    "/investor",
    "/demo",
    "/faq",
    "/status",
    "/dashboard/trust",
  ]);
  assert.notEqual(en.site.footerForInvestors, en.site.footerInvestorRoom);
  assert.notEqual(dictionaries.pl.site.footerForInvestors, dictionaries.pl.site.footerInvestorRoom);
});

test("for-investors marketing page links to investor room, product proof, and demo", () => {
  const page = read("src/app/(marketing)/for-investors/page.tsx");
  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assert.match(page, /InvestorFundraisingPage/);
  assert.doesNotMatch(page, /InvestorRoomPage/);
  for (const href of ["/investor", "/investor/product-proof", "/demo"]) {
    assert.match(fundraising, new RegExp(`href="${href.replace("/", "\\/")}"`));
  }
});

test("faq and how-it-works link back to demo, how-it-works, or explore twin via crosslinks band", () => {
  const faq = read("src/app/(marketing)/faq/page.tsx");
  const how = read("src/app/(marketing)/how-it-works/page.tsx");
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  assert.match(faq, /page="faq"/);
  assert.match(how, /page="how-it-works"/);
  for (const href of ["/demo", "/how-it-works", "/#explore-twin"]) {
    assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`));
  }
  assert.match(routes, /"how-it-works":[\s\S]*"\/faq"/);
  assert.match(routes, /faq:[\s\S]*"\/how-it-works"/);
});

test("persona marketing CTAs stay lane-coherent — recruiter avoids B2B calculator", () => {
  const recruiters = getPersonaBundle("recruiters", "en");
  const companies = getPersonaBundle("companies", "en");
  const recruiterBlob = JSON.stringify(recruiters);
  assert.doesNotMatch(recruiterBlob, /\/calculator\/b2b/);
  assert.match(JSON.stringify(companies), /\/calculator\/b2b/);
});

test("mobile explore panel renders grouped mega-panel links", () => {
  const panel = read("src/components/site-header-explore-panel.tsx");
  assert.match(panel, /HEADER_EXPLORE_MEGA_PANEL_GROUPS/);
  assert.match(panel, /variant === "mobile"/);
  assert.equal(HEADER_EXPLORE_MEGA_PANEL_HREFS.length, 10);
  assert.ok(!HEADER_EXPLORE_MEGA_PANEL_HREFS.includes("/demo"));
});

test("public marketing surfaces keep container rhythm", () => {
  const paths = [
    "src/components/marketing/investor-fundraising-page.tsx",
    "src/components/marketing/marketing-page-surface.tsx",
    "src/components/marketing/marketing-crosslinks-band.tsx",
    "src/components/investor/executive-product-proof-board.tsx",
    "src/app/(marketing)/faq/page.tsx",
    "src/app/(marketing)/how-it-works/page.tsx",
    "src/components/marketing/founder-led-demo-flow.tsx",
    "src/app/(marketing)/status/page.tsx",
  ];
  for (const path of paths) {
    const src = read(path);
    const hasSurface = src.includes("MarketingPageSurface");
    const hasTokens = CONTAINER_TOKENS.every((token) => src.includes(token) || hasSurface);
    assert.ok(hasTokens, `${path} missing container rhythm (direct or via MarketingPageSurface)`);
  }
});

test("/investor executive room remains distinct from fundraising page", () => {
  const room = read("src/components/investor/investor-room-page.tsx");
  const investorRoot = read("src/app/investor/page.tsx");
  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assert.match(investorRoot, /InvestorRoomPage/);
  assert.doesNotMatch(investorRoot, /InvestorFundraisingPage/);
  assert.match(room, /MarketingCrosslinksBand/);
  assert.doesNotMatch(room, /InvestorFundraisingPage/);
  assert.doesNotMatch(fundraising, /InvestorRoomPage/);
});

test("/investor/product-proof keeps safe public container rhythm", () => {
  const board = read("src/components/investor/executive-product-proof-board.tsx");
  assert.match(board, /max-w-6xl/);
  assert.match(board, /px-4/);
  assert.match(board, /sm:px-6/);
  assert.match(board, /overflow-x-hidden/);
  assert.match(board, /min-w-0/);
});

test("investor fundraising copy avoids unsafe launch or live-action claims", () => {
  const positiveForbidden =
    /\blaunch ready\b|\bproduction ready\b|\bphase 3b passed\b|\bp0 closed\b|\blive ats\b|\boutreach sent\b|\bcalendar write\b|\bpayment active\b/i;
  function hasPositiveClaim(blob: string, pattern: RegExp): boolean {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const match of blob.matchAll(re)) {
      const idx = match.index ?? 0;
      const before = blob.slice(Math.max(0, idx - 28), idx);
      if (/\b(not|no|bez|nie|brak|without)\s*$/i.test(before)) continue;
      return true;
    }
    return false;
  }
  for (const locale of ["en", "pl"] as const) {
    const blob = JSON.stringify(dictionaries[locale].investorFundraising);
    assert.equal(hasPositiveClaim(blob, positiveForbidden), false, locale);
  }
});
