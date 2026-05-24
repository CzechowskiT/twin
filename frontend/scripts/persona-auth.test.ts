import assert from "node:assert/strict";
import test from "node:test";

import { LOGIN_PATH, REGISTER_PATH, loginZoneFromPath } from "../src/lib/persona-auth";
import { footerExploreHrefsForPersona } from "../src/lib/persona-access";

test("LOGIN_PATH.company is email login, not pilot signup", () => {
  assert.equal(LOGIN_PATH.company, "/login/company");
  assert.equal(REGISTER_PATH.company, "/companies/signup");
});

test("loginZoneFromPath distinguishes company login vs signup", () => {
  assert.equal(loginZoneFromPath("/login/company"), "company");
  assert.equal(loginZoneFromPath("/companies/signup"), "company");
});

test("footerExploreHrefsForPersona lists company login before signup", () => {
  const hrefs = footerExploreHrefsForPersona("company");
  const loginIdx = hrefs.indexOf("/login/company");
  const signupIdx = hrefs.indexOf("/companies/signup");
  assert.ok(loginIdx >= 0);
  assert.ok(signupIdx >= 0);
  assert.ok(loginIdx < signupIdx);
});
