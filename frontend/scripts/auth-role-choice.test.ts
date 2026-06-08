/**
 * Auth entry: role-choice hub before persona-specific login/register forms.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import { headerAccountLinks } from "../src/lib/persona-access";
import { LOGIN_PATH, REGISTER_PATH } from "../src/lib/persona-auth";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

test("/login hub shows role choice, not a persona form", () => {
  const page = read("src/app/login/page.tsx");
  assert.match(page, /LoginZoneHub/);
  assert.doesNotMatch(page, /LoginZoneForm/);
});

test("/register hub shows role choice, not a persona form", () => {
  const page = read("src/app/register/page.tsx");
  assert.match(page, /RegisterZoneHub/);
  assert.doesNotMatch(page, /RegisterZoneForm/);
});

test("persona-specific login routes keep dedicated forms", () => {
  for (const zone of ["candidate", "recruiter", "company", "investor"] as const) {
    const page = read(`src/app/login/${zone}/page.tsx`);
    assert.match(page, /LoginZoneForm/);
    assert.match(page, new RegExp(`zone="${zone}"`));
  }
});

test("persona-specific register routes remain reachable", () => {
  assert.equal(REGISTER_PATH.candidate, "/register/candidate");
  assert.equal(REGISTER_PATH.recruiter, "/register/recruiter");
  assert.equal(REGISTER_PATH.investor, "/register/investor");
  assert.equal(REGISTER_PATH.company, "/companies/signup");
});

test("auth zone hub links to persona login and register paths", () => {
  const hub = read("src/components/auth/auth-zone-hub.tsx");
  assert.match(hub, /AuthZoneHub/);
  const loginHub = read("src/components/auth/login-zone-hub.tsx");
  assert.match(loginHub, /LOGIN_PATH/);
  const registerHub = read("src/components/auth/register-zone-hub.tsx");
  assert.match(registerHub, /REGISTER_PATH/);
  for (const path of Object.values(LOGIN_PATH)) {
    assert.ok(path.startsWith("/login/") || path === "/login");
  }
});

test("persona forms link back to all-zones hub", () => {
  const loginForm = read("src/components/auth/login-zone-form.tsx");
  assert.match(loginForm, /href="\/login"/);
  assert.match(loginForm, /login\.allZones/);
  const registerForm = read("src/components/auth/register-zone-form.tsx");
  assert.match(registerForm, /href="\/register"/);
  assert.match(registerForm, /register\.allZones/);
});

test("marketing header account links use unified auth hubs", () => {
  for (const persona of ["candidate", "recruiter", "company", "investor"] as const) {
    const links = headerAccountLinks(persona, false, { marketingChrome: true });
    assert.equal(links[0]?.href, "/login");
    assert.equal(links[1]?.href, "/register");
  }
});
