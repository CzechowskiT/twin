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
  for (const src of [control, des, rev]) {
    assert.match(src, /proxyFounderCanary/);
    assert.doesNotMatch(src, /auth !== `Bearer \$\{serverToken\}`/);
    assert.doesNotMatch(src, /Authorization: auth/);
  }
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

console.log("founder-canary-access-guard: ok");
