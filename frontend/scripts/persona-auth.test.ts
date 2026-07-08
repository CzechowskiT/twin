import assert from "node:assert/strict";
import test from "node:test";

import { LOGIN_PATH, REGISTER_PATH, loginZoneFromPath } from "../src/lib/persona-auth";
import {
  PUBLIC_FOOTER_SITEMAP_ENTRIES,
  PUBLIC_FOOTER_SITEMAP_HREFS,
} from "../src/lib/public-footer-sitemap-routes";

test("LOGIN_PATH.company is email login, not pilot signup", () => {
  assert.equal(LOGIN_PATH.company, "/login/company");
  assert.equal(REGISTER_PATH.company, "/companies/signup");
});

test("loginZoneFromPath distinguishes company login vs signup", () => {
  assert.equal(loginZoneFromPath("/login/company"), "company");
  assert.equal(loginZoneFromPath("/companies/signup"), "company");
});

test("public footer sitemap is persona-independent and lists core public routes", () => {
  assert.equal(PUBLIC_FOOTER_SITEMAP_ENTRIES.length, 9);
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
  const investorIdx = PUBLIC_FOOTER_SITEMAP_HREFS.indexOf("/investor");
  const forInvestorsIdx = PUBLIC_FOOTER_SITEMAP_HREFS.indexOf("/for-investors");
  assert.ok(investorIdx >= 0);
  assert.ok(forInvestorsIdx >= 0);
  assert.notEqual(investorIdx, forInvestorsIdx);
  assert.equal(
    PUBLIC_FOOTER_SITEMAP_ENTRIES.find((e) => e.href === "/investor")?.labelKey,
    "site.footerInvestorRoom",
  );
  assert.equal(
    PUBLIC_FOOTER_SITEMAP_ENTRIES.find((e) => e.href === "/for-investors")?.labelKey,
    "site.footerForInvestors",
  );
});
