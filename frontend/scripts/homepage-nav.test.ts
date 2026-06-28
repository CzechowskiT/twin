/**
 * Static guard for marketing homepage nav: flat persona lanes + login visibility.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  headerAccountLinks,
  headerMarketingLaneLinks,
  headerMarketingLoginHref,
  showMarketingPersonaNav,
} from "../src/lib/persona-access";
import { PUBLIC_EXPLORE_TWIN_ENTRIES, PUBLIC_EXPLORE_TWIN_HREFS } from "../src/lib/public-explore-twin-routes";
import { PUBLIC_FOOTER_SITEMAP_HREFS } from "../src/lib/public-footer-sitemap-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

test("marketing lane links expose candidate, recruiter, company, investor, and demo", () => {
  const links = headerMarketingLaneLinks();
  assert.equal(links.length, 5);
  assert.deepEqual(
    links.map((l) => l.href),
    ["/for-candidates", "/for-recruiters", "/for-companies", "/investor", "/demo"],
  );
  assert.deepEqual(links.map((l) => l.labelKey), [
    "nav.personaCandidate",
    "nav.personaRecruiter",
    "nav.personaCompany",
    "nav.personaInvestor",
    "nav.demo",
  ]);
});

test("marketing lane investor link points to canonical investor room", () => {
  const investor = headerMarketingLaneLinks().find((l) => l.labelKey === "nav.personaInvestor");
  assert.ok(investor);
  assert.equal(investor.href, "/investor");
  assert.equal(investor.persona, "investor");
});

test("marketing login href points to role-choice hub", () => {
  assert.equal(headerMarketingLoginHref("candidate"), "/login");
  assert.equal(headerMarketingLoginHref("recruiter"), "/login");
  assert.equal(headerMarketingLoginHref("company"), "/login");
});

test("logged-out marketing chrome shows persona nav and unified login", () => {
  assert.equal(showMarketingPersonaNav(false, true), true);
  assert.equal(showMarketingPersonaNav(true, true), false);
  const accounts = headerAccountLinks("candidate", false, { marketingChrome: true });
  assert.equal(accounts[0]?.href, "/login");
  assert.equal(accounts[0]?.labelKey, "nav.login");
  assert.equal(accounts[1]?.href, "/register");
  assert.equal(accounts[1]?.labelKey, "nav.register");
});

test("logged-in account links unify to panel and logout", () => {
  for (const persona of ["candidate", "recruiter", "company", "investor"] as const) {
    const links = headerAccountLinks(persona, true);
    assert.equal(links.length, 2);
    assert.equal(links[1]?.isLogout, true);
    assert.equal(links[1]?.labelKey, "dashboard.logout");
  }
});

test("site header renders flat persona nav instead of persona switcher dropdown", () => {
  const header = read("src/components/site-header-bar.tsx");
  const marketing = read("src/components/marketing-header.tsx");
  assert.match(marketing, /showMarketingPersonaNav/);
  assert.doesNotMatch(marketing, /PersonaSwitcher/);
  assert.match(header, /headerMarketingLaneLinks/);
  assert.match(header, /showMarketingPersonaNav/);
  assert.doesNotMatch(header, /PersonaSwitcher/);
});

test("marketing header does not hide login on mobile menu", () => {
  const header = read("src/components/site-header-bar.tsx");
  assert.match(header, /accountLinks\.map/);
  assert.match(header, /ariaMobileNav/);
  assert.match(header, /headerAccountLinks\(persona, hasSession/);
});

test("chrome header avoids workspace shell on landing without active session", () => {
  const chrome = read("src/components/chrome-header.tsx");
  assert.match(chrome, /hasActiveSession/);
  assert.match(chrome, /return <MarketingHeader \/>/);
  assert.doesNotMatch(chrome, /Boolean\(getToken\(\)\)/);
});

test("homepage wires explore twin quick-entry panel with seven existing routes", () => {
  const home = read("src/app/(marketing)/page.tsx");
  const panel = read("src/components/marketing/landing-explore-twin.tsx");
  assert.match(home, /LandingExploreTwin/);
  assert.match(panel, /PUBLIC_EXPLORE_TWIN_ENTRIES/);
  assert.match(panel, /id="explore-twin"/);
});

test("explore twin registry exposes seven bounded quick-entry links", () => {
  assert.equal(PUBLIC_EXPLORE_TWIN_ENTRIES.length, 7);
  assert.deepEqual(PUBLIC_EXPLORE_TWIN_HREFS, [
    "/dashboard",
    "/recruiter",
    "/company/dashboard",
    "/investor",
    "/demo",
    "/dashboard/trust",
    "/status",
  ]);
  const ids = new Set(PUBLIC_EXPLORE_TWIN_ENTRIES.map((e) => e.id));
  assert.equal(ids.size, 7);
  for (const entry of PUBLIC_EXPLORE_TWIN_ENTRIES) {
    assert.match(entry.titleKey, /^home\.exploreTwin/);
    assert.match(entry.hintKey, /^home\.exploreTwin/);
  }
});

test("explore twin EN/PL copy is bounded — no launch-ready or live ATS claims", () => {
  const positiveForbidden = /\blaunch ready\b|\blive ats\b|\bauto-apply is live\b/i;
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
    const h = dictionaries[locale].home;
    const blob = [
      h.exploreTwinLead,
      h.exploreTwinCandidateHint,
      h.exploreTwinRecruiterHint,
      h.exploreTwinCompanyHint,
      h.exploreTwinInvestorHint,
    ].join("\n");
    assert.equal(hasPositiveClaim(blob, positiveForbidden), false, locale);
    assert.match(blob.toLowerCase(), /paused|wstrzym|not live|nie jest live|no-go|pilot/);
  }
  assert.equal(en.home.exploreTwinEyebrow, "Explore TWIN");
  assert.equal(dictionaries.pl.home.exploreTwinEyebrow, "Poznaj TWIN");
});

test("site footer renders stable public sitemap — distinct investor routes", () => {
  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /PUBLIC_FOOTER_SITEMAP_ENTRIES/);
  assert.doesNotMatch(footer, /footerExploreHrefsForPersona/);
  assert.doesNotMatch(footer, /useMarketingPersona/);
  assert.doesNotMatch(footer, /\/for-investors.*footerCompany|footerCompany[\s\S]*\/for-investors/);
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
});

test("footer investor labels distinguish marketing page from executive room (EN/PL)", () => {
  assert.equal(en.site.footerForInvestors, "For investors");
  assert.equal(en.site.footerInvestorRoom, "Investor room");
  assert.notEqual(en.site.footerForInvestors, en.site.footerInvestorRoom);
  assert.equal(dictionaries.pl.site.footerForInvestors, "Dla inwestorów");
  assert.equal(dictionaries.pl.site.footerInvestorRoom, "Sala executive");
  assert.notEqual(dictionaries.pl.site.footerForInvestors, dictionaries.pl.site.footerInvestorRoom);
});
