/**
 * Slice 21 — founder-led demo cross-link guards (static, no browser).
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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function assertHrefsInSource(src: string, hrefs: readonly string[], label: string): void {
  for (const href of hrefs) {
    assert.match(src, new RegExp(`href="${href.replace("/", "\\/")}"`), `${label} missing ${href}`);
  }
}

test("cross-link registry matches Slice 21 route map", () => {
  assert.deepEqual(founderDemoCrosslinkHrefs("demo"), [
    "/investor",
    "/investor/product-proof",
    "/how-it-works",
    "/faq",
    "/#explore-twin",
  ]);
  assert.deepEqual(founderDemoCrosslinkHrefs("how-it-works"), ["/demo", "/faq", "/#explore-twin"]);
  assert.deepEqual(founderDemoCrosslinkHrefs("faq"), ["/demo", "/how-it-works", "/#explore-twin"]);
  assert.deepEqual(founderDemoCrosslinkHrefs("for-investors"), ["/investor", "/investor/product-proof", "/demo"]);
  assert.deepEqual(founderDemoCrosslinkHrefs("investor"), [
    "/investor/product-proof",
    "/for-investors",
    "/demo",
  ]);
  assert.deepEqual(founderDemoCrosslinkHrefs("investor-product-proof"), ["/investor", "/for-investors", "/demo"]);
  for (const page of Object.keys(FOUNDER_DEMO_CROSSLINKS_BY_PAGE) as (keyof typeof FOUNDER_DEMO_CROSSLINKS_BY_PAGE)[]) {
    const hrefs = founderDemoCrosslinkHrefs(page);
    assert.equal(new Set(hrefs).size, hrefs.length, `${page} has duplicate hrefs`);
  }
});

test("/demo wires MarketingCrosslinksBand for Slice 21 routes", () => {
  const flow = read("src/components/marketing/founder-led-demo-flow.tsx");
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  assert.match(flow, /MarketingCrosslinksBand/);
  assert.match(flow, /page="demo"/);
  for (const href of founderDemoCrosslinkHrefs("demo")) {
    assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`));
  }
});

test("/how-it-works wires MarketingCrosslinksBand for demo, faq, explore twin", () => {
  const page = read("src/app/(marketing)/how-it-works/page.tsx");
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  assert.match(page, /page="how-it-works"/);
  for (const href of founderDemoCrosslinkHrefs("how-it-works")) {
    assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`));
  }
});

test("/faq wires MarketingCrosslinksBand for demo, how-it-works, explore twin", () => {
  const page = read("src/app/(marketing)/faq/page.tsx");
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  assert.match(page, /page="faq"/);
  for (const href of founderDemoCrosslinkHrefs("faq")) {
    assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`));
  }
});

test("/for-investors preserves fundraising CTAs to investor room, product proof, and demo", () => {
  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assertHrefsInSource(fundraising, founderDemoCrosslinkHrefs("for-investors"), "for-investors");
});

test("/investor wires MarketingCrosslinksBand for product proof, for-investors, demo", () => {
  const room = read("src/components/investor/investor-room-page.tsx");
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  assert.match(room, /page="investor"/);
  for (const href of founderDemoCrosslinkHrefs("investor")) {
    assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`));
  }
});

test("/investor/product-proof wires MarketingCrosslinksBand for investor, for-investors, demo", () => {
  const board = read("src/components/investor/executive-product-proof-board.tsx");
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  assert.match(board, /page="investor-product-proof"/);
  for (const href of founderDemoCrosslinkHrefs("investor-product-proof")) {
    assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`));
  }
});

test("marketing crosslinks band keeps mobile-friendly flex-wrap spacing", () => {
  const band = read("src/components/marketing/marketing-crosslinks-band.tsx");
  assert.match(band, /flex flex-wrap/);
  assert.match(band, /gap-x-4 gap-y-2/);
  assert.match(band, /data-founder-demo-crosslinks/);
});

test("mobile spacing guards on header, explore panel, explore twin grid, and footer", () => {
  const header = read("src/components/site-header-bar.tsx");
  assert.match(header, /flex-wrap/);
  assert.match(header, /gap-y-2/);

  const explorePanel = read("src/components/site-header-explore-panel.tsx");
  assert.match(explorePanel, /shrink-0/);
  assert.match(explorePanel, /variant === "mobile"/);
  assert.match(explorePanel, /px-3/);

  const exploreTwin = read("src/components/marketing/landing-explore-twin.tsx");
  assert.match(exploreTwin, /px-4/);
  assert.match(exploreTwin, /sm:px-6/);
  assert.match(exploreTwin, /gap-3/);

  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assert.match(fundraising, /gap-y-2/);

  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /gap-8/);
  assert.match(footer, /sm:gap-10/);
});
