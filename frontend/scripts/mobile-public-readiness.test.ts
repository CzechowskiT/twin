/**
 * Slice 23 — mobile public marketing visual QA guards (static, no browser).
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
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function mobileExplorePanelBranch(src: string): string {
  const start = src.indexOf('if (variant === "mobile")');
  assert.ok(start >= 0, "mobile explore panel branch missing");
  const end = src.indexOf("\n  return (\n    <details", start);
  assert.ok(end >= 0, "mobile explore panel branch end missing");
  return src.slice(start, end);
}

const CONTAINER_TOKENS = ["mx-auto", "max-w-6xl", "px-4", "sm:px-6"];
const MOBILE_GRID_TOKENS = ["grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3", "gap-3"];

test("MarketingCrosslinksBand uses container rhythm and responsive grid", () => {
  const band = read("src/components/marketing/marketing-crosslinks-band.tsx");
  for (const token of CONTAINER_TOKENS) {
    assert.match(band, new RegExp(token), `crosslinks band missing ${token}`);
  }
  for (const token of MOBILE_GRID_TOKENS) {
    assert.match(band, new RegExp(token), `crosslinks band missing ${token}`);
  }
  assert.match(band, /min-w-0/);
  assert.match(band, /overflow-x-hidden/);
  assert.match(band, /twin-touch-target/);
});

test("MarketingCrosslinksBand preserves Slice 21 link map for every page", () => {
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  for (const page of Object.keys(FOUNDER_DEMO_CROSSLINKS_BY_PAGE) as (keyof typeof FOUNDER_DEMO_CROSSLINKS_BY_PAGE)[]) {
    for (const href of founderDemoCrosslinkHrefs(page)) {
      assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`), `${page} missing ${href}`);
    }
  }
});

test("site header keeps mobile-safe flex-wrap and min-w-0 chrome", () => {
  const header = read("src/components/site-header-bar.tsx");
  assert.match(header, /flex min-w-0 flex-wrap/);
  assert.match(header, /gap-y-2/);
  assert.match(header, /min-w-0/);
  assert.match(header, /variant="mobile"/);
});

test("Explore desktop trigger keeps shrink-0 so adjacent nav does not crush", () => {
  const explorePanel = read("src/components/site-header-explore-panel.tsx");
  assert.match(explorePanel, /className="relative shrink-0"/);
  assert.match(explorePanel, /summary[\s\S]*shrink-0/);
});

test("Explore mobile panel groups links with flex-col gap and overflow guard", () => {
  const explorePanel = read("src/components/site-header-explore-panel.tsx");
  const mobileBranch = mobileExplorePanelBranch(explorePanel);
  assert.match(mobileBranch, /data-site-header-explore="mobile"/);
  assert.match(mobileBranch, /overflow-x-hidden/);
  assert.match(mobileBranch, /flex-col/);
  assert.match(mobileBranch, /gap-0\.5|gap-1|gap-2|gap-3/);
  assert.match(mobileBranch, /min-w-0/);
  assert.doesNotMatch(mobileBranch, /whitespace-nowrap/);
  assert.match(explorePanel, /mobile[\s\S]*min-w-0 break-words/);
});

test("header and footer mobile chrome keeps explore touch targets and gap rhythm", () => {
  const explorePanel = read("src/components/site-header-explore-panel.tsx");
  assert.match(explorePanel, /variant === "mobile"/);
  assert.match(explorePanel, /px-3/);
  assert.match(explorePanel, /twin-touch-target/);

  const exploreTwin = read("src/components/marketing/landing-explore-twin.tsx");
  assert.match(exploreTwin, /px-4/);
  assert.match(exploreTwin, /sm:px-6/);
  assert.match(exploreTwin, /gap-3/);
  assert.match(exploreTwin, /grid-cols-1/);

  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /gap-8/);
  assert.match(footer, /sm:gap-10/);
  assert.match(footer, /overflow-x-hidden/);
  assert.match(footer, /grid-cols-1/);
});

test("founder demo marketing pages avoid horizontal overflow on copy rails", () => {
  for (const path of [
    "src/components/marketing/founder-led-demo-flow.tsx",
    "src/components/marketing/investor-fundraising-page.tsx",
    "src/components/investor/investor-room-page.tsx",
    "src/components/investor/executive-product-proof-board.tsx",
    "src/app/(marketing)/faq/page.tsx",
    "src/app/(marketing)/how-it-works/page.tsx",
  ]) {
    const src = read(path);
    const hasGuard = src.includes("min-w-0") || src.includes("MarketingPageSurface");
    assert.ok(hasGuard, `${path} missing min-w-0 overflow guard`);
  }
});

test("for-investors CTA rows use mobile-safe flex-wrap and gap-y rhythm", () => {
  const fundraising = read("src/components/marketing/investor-fundraising-page.tsx");
  assert.match(fundraising, /flex flex-wrap/);
  assert.match(fundraising, /gap-y-2/);
  assert.match(fundraising, /marketing-copy-rail min-w-0/);
});

test("executive product proof wrapper keeps bounded public container rhythm", () => {
  const board = read("src/components/investor/executive-product-proof-board.tsx");
  assert.match(board, /max-w-6xl/);
  assert.match(board, /px-4/);
  assert.match(board, /sm:px-6/);
  assert.match(board, /overflow-x-hidden/);
  assert.match(board, /min-w-0/);
});

test("marketing mobile surfaces avoid unsafe launch or live-action claims", () => {
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
  const blob = [
    en.marketingCrosslinks.heading,
    dictionaries.pl.marketingCrosslinks.heading,
    en.founderLedDemo.pageLead,
    dictionaries.pl.founderLedDemo.pageLead,
  ].join("\n");
  assert.equal(hasPositiveClaim(blob, positiveForbidden), false);
});
