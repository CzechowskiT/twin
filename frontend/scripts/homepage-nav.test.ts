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

test("marketing lane links expose candidate, recruiter, company, and demo", () => {
  const links = headerMarketingLaneLinks();
  assert.equal(links.length, 4);
  assert.deepEqual(
    links.map((l) => l.href),
    ["/for-candidates", "/for-recruiters", "/for-companies", "/demo"],
  );
  assert.deepEqual(links.map((l) => l.labelKey), [
    "nav.personaCandidate",
    "nav.personaRecruiter",
    "nav.personaCompany",
    "nav.demo",
  ]);
});

test("marketing login hrefs are one-click per persona", () => {
  assert.equal(headerMarketingLoginHref("candidate"), "/login/candidate");
  assert.equal(headerMarketingLoginHref("recruiter"), "/login/recruiter");
  assert.equal(headerMarketingLoginHref("company"), "/login/company");
});

test("logged-out marketing chrome shows persona nav and persona login", () => {
  assert.equal(showMarketingPersonaNav(false, true), true);
  assert.equal(showMarketingPersonaNav(true, true), false);
  const accounts = headerAccountLinks("candidate", false, { marketingChrome: true });
  assert.equal(accounts[0]?.href, "/login/candidate");
  assert.equal(accounts[0]?.labelKey, "nav.login");
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
