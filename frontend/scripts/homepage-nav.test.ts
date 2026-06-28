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
