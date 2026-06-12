import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const formSrc = readFileSync(join(root, "src/components/auth/login-zone-form.tsx"), "utf8");
const oauthButtonsSrc = readFileSync(join(root, "src/components/oauth-web-buttons.tsx"), "utf8");

test("oauth loading copy — Polish availability check", () => {
  assert.equal(pl.login.oauthStatusLoading, "Sprawdzamy dostępność logowania…");
  assert.match(formSrc, /login\.oauthStatusLoading/);
  assert.match(formSrc, /aria-live="polite"/);
});

test("disabled oauth rows show explicit reason", () => {
  assert.match(oauthButtonsSrc, /disabledReasonLabel/);
  assert.match(oauthButtonsSrc, /text-xs font-normal text-neutral-400/);
  assert.match(formSrc, /login\.oauthDisabledReason/);
  assert.equal(pl.login.oauthDisabledReason, "Nieskonfigurowane w tym wdrożeniu");
});

test("active oauth buttons when configured", () => {
  assert.match(oauthButtonsSrc, /availability\.available && Boolean\(availability\.href\)/);
  assert.match(oauthButtonsSrc, /ROW_ENABLED/);
});

test("register form passes disabled reason label", () => {
  const reg = readFileSync(join(root, "src/components/auth/register-zone-form.tsx"), "utf8");
  assert.match(reg, /login\.oauthDisabledReason/);
});

test("show-all-login-options expand still present", () => {
  assert.match(formSrc, /login\.showAllLoginOptions/);
});
