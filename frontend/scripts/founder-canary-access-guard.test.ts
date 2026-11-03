/**
 * Secure Founder Canary Access — static guards (no browser, no secrets).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("1 panel never stores OPS token in sessionStorage", () => {
  const panel = read("src/components/admin/canary-control-panel.tsx");
  assert.doesNotMatch(panel, /twin_ops_admin_token/);
  assert.doesNotMatch(panel, /sessionStorage\.setItem/);
  assert.doesNotMatch(panel, /Ops token/);
  assert.match(panel, /CANARY_ADMIN_MUTATE|authUnlock|founder/);
  assert.match(panel, /credentials:\s*["']same-origin["']/);
});

test("2 BFF control/designation reject browser OPS and use founder proxy", () => {
  const control = read("src/app/api/ops-admin/canary/control/route.ts");
  const des = read("src/app/api/ops-admin/canary/designation/route.ts");
  const rev = read("src/app/api/ops-admin/canary/designation/revoke/route.ts");
  const proxy = read("src/lib/founder-canary-proxy.ts");
  for (const src of [control, des, rev]) {
    assert.match(src, /proxyFounderCanary/);
    assert.doesNotMatch(src, /auth !== `Bearer \$\{serverToken\}`/);
    assert.doesNotMatch(src, /Authorization: auth/);
  }
  assert.match(proxy, /assertMutatingCsrf/);
  assert.doesNotMatch(proxy, /csrfHeader \|\| csrfCookie/);
});

test("3 session route sets HttpOnly cookies and blocks machine secrets", () => {
  const session = read("src/app/api/ops-admin/canary/session/route.ts");
  const bff = read("src/lib/founder-canary-bff.ts");
  assert.match(session, /CANARY_ELEVATED_COOKIE/);
  assert.match(bff, /twin_founder_canary_elevated/);
  assert.match(session, /HttpOnly|secureCookieAttrs/);
  assert.match(session, /looksLikeMachineOpsSecret/);
  assert.match(session, /founder-elevate/);
  assert.doesNotMatch(session, /OPS_ADMIN_TOKEN.*Bearer.*browser/i);
});

test("4 founder-canary-bff helpers exist with allowlist + CSRF bind", () => {
  const bff = read("src/lib/founder-canary-bff.ts");
  assert.match(bff, /founderCanaryAllowlistFromEnv/);
  assert.match(bff, /SameSite=Strict/);
  assert.match(bff, /bindCsrfToElevated/);
  assert.match(bff, /looksLikeMachineOpsSecret/);
  assert.match(bff, /twin_founder_canary_at/);
  assert.match(bff, /founderCanaryConfigAudit/);
  assert.match(bff, /isProductionLikeRuntime/);
  assert.match(bff, /silent_secret_key_fallback_allowed/);
});

test("5 step-up purpose includes CANARY_ADMIN_MUTATE", () => {
  const step = read("src/lib/step-up.ts");
  assert.match(step, /CANARY_ADMIN_MUTATE/);
});

test("6 designation UX and fail-closed copy preserved", () => {
  const panel = read("src/components/admin/canary-control-panel.tsx");
  const msgs = read("src/lib/canary-journey-messages.ts");
  assert.match(panel, /canary-designation-panel/);
  assert.match(panel, /canary-designation-save/);
  assert.match(panel, /canary-designation-revoke/);
  assert.match(msgs, /authElevateLead/);
  assert.match(msgs, /HttpOnly/);
});

test("7 CSRF after refresh comes from session JSON, not client cookie reads", () => {
  const panel = read("src/components/admin/canary-control-panel.tsx");
  const session = read("src/app/api/ops-admin/canary/session/route.ts");
  const bff = read("src/lib/founder-canary-bff.ts");
  assert.doesNotMatch(panel, /document\.cookie/);
  assert.match(panel, /csrf_token/);
  assert.match(panel, /refresh\(recovered\)/);
  assert.match(session, /verifyElevatedUpstream|auth-status/);
  assert.match(session, /csrf_token:\s*csrfForClient|csrf_token: csrfForClient/);
  assert.match(bff, /csrfCookieAttrs/);
  assert.match(bff, /COOKIE_PATH\s*=\s*["']\/api\/ops-admin\/canary["']/);
  assert.match(bff, /Path=\$\{COOKIE_PATH\}/);
  // Cookie Path is BFF-only; page Path=/admin/canary cannot read it via JS.
  assert.match(bff, /never reads it via document\.cookie|page never reads it/i);
});

test("8 GET session clears invalid elevated cookies (not cookie-presence alone)", () => {
  const session = read("src/app/api/ops-admin/canary/session/route.ts");
  assert.match(session, /clearElevatedCookies/);
  assert.match(session, /Elevated session invalid|cleared:\s*true/);
  assert.match(session, /Cookie present is insufficient|must re-validate elevated/i);
});

test("9 e2e browser suite is mock-isolated (no prod canary DB writes)", () => {
  const e2e = read("e2e/founder-canary-access-browser.spec.ts");
  assert.match(e2e, /mockFounderCanaryApis/);
  assert.match(e2e, /Never hits production canary DB|mocked only/i);
  assert.match(e2e, /IPHONE|390.*844|viewport/);
  assert.match(e2e, /x-csrf-token/);
  assert.match(e2e, /CSRF header required/);
  assert.doesNotMatch(e2e, /PLAYWRIGHT_ALLOW_PROD_SMOKE/);
});

console.log("founder-canary-access-guard: ok");
