/**
 * Slice 22 — mobile public marketing readiness guards (static, no browser).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import { founderDemoCrosslinkHrefs } from "../src/lib/founder-demo-crosslinks-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
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
  assert.match(band, /overflow-x-hidden/);
  assert.match(band, /twin-touch-target/);
});

test("header and footer mobile chrome keeps wrap, shrink-0 explore, and gap rhythm", () => {
  const header = read("src/components/site-header-bar.tsx");
  assert.match(header, /flex-wrap/);
  assert.match(header, /gap-y-2/);
  assert.match(header, /min-w-0/);
  assert.match(header, /variant="mobile"/);

  const explorePanel = read("src/components/site-header-explore-panel.tsx");
  assert.match(explorePanel, /shrink-0/);
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

test("Slice 21 cross-link registry remains intact on demo page", () => {
  const routes = read("src/lib/founder-demo-crosslinks-routes.ts");
  for (const href of founderDemoCrosslinkHrefs("demo")) {
    assert.match(routes, new RegExp(`"${href.replace("/", "\\/")}"`));
  }
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
