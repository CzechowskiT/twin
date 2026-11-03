import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server";

import {
  CANARY_CSRF_COOKIE,
  canaryCookieOptions,
  validateCanaryMutation,
} from "../src/lib/canary-admin-bff.ts";
const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const readFrontend = (path: string) => readFileSync(join(frontendRoot, path), "utf8");
const readRepo = (path: string) => readFileSync(join(repoRoot, path), "utf8");

test("canary UI never stores or asks for shared admin bearer", () => {
  const panel = readFrontend("src/components/admin/canary-control-panel.tsx");
  assert.doesNotMatch(panel, /OPS_ADMIN_TOKEN|BETA_ADMIN_TOKEN|twin_ops_admin_token/);
  assert.doesNotMatch(panel, /sessionStorage|localStorage/);
  assert.match(panel, /canary-founder-session/);
  assert.match(panel, /FOUNDER_CANARY_ADMIN/);
});

test("canary BFF uses scoped HttpOnly Strict cookies and CSRF", () => {
  const helper = readFrontend("src/lib/canary-admin-bff.ts");
  const session = readFrontend("src/app/api/ops-admin/canary/session/route.ts");
  assert.match(helper, /httpOnly/);
  assert.match(helper, /sameSite:\s*"strict"/);
  assert.match(helper, /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/);
  assert.match(helper, /X-CSRF-Token|x-csrf-token/);
  assert.match(helper, /isSameOrigin/);
  assert.match(session, /canary_session_token_once/);
  assert.match(session, /delete payload\.canary_session_token_once/);
  assert.doesNotMatch(`${helper}\n${session}`, /OPS_ADMIN_TOKEN|BETA_ADMIN_TOKEN/);
});

test("every canary proxy delegates to cookie session authorization", () => {
  for (const path of [
    "src/app/api/ops-admin/canary/control/route.ts",
    "src/app/api/ops-admin/canary/designation/route.ts",
    "src/app/api/ops-admin/canary/designation/revoke/route.ts",
  ]) {
    const route = readFrontend(path);
    assert.match(route, /proxyCanaryRequest/);
    assert.doesNotMatch(route, /OPS_ADMIN_TOKEN|BETA_ADMIN_TOKEN|authorization/i);
  }
});

test("backend canary routes use scoped Founder dependencies, never shared token", () => {
  const api = readRepo("backend/app/api/private_canary.py");
  const auth = readRepo("backend/app/services/founder_canary_auth.py");
  assert.doesNotMatch(api, /_require_ops|ops_admin_token|beta_admin_token/);
  assert.match(api, /require_founder_canary_read/);
  assert.match(api, /require_founder_canary_write/);
  assert.match(auth, /managed_session_required/);
  assert.match(auth, /PURPOSE_FOUNDER_CANARY_ADMIN/);
  assert.match(auth, /CANARY_TOKEN_TYPE/);
});

function mutationRequest(origin: string | null, header: string, cookie: string): NextRequest {
  const headers: Record<string, string> = {
    "X-CSRF-Token": header,
    Cookie: `${CANARY_CSRF_COOKIE}=${cookie}`,
  };
  if (origin) headers.Origin = origin;
  return new NextRequest("https://twin.test/api/ops-admin/canary/control", {
    method: "POST",
    headers,
  });
}

test("canary mutation accepts only exact same-origin double-submit CSRF", async () => {
  assert.equal(validateCanaryMutation(mutationRequest("https://twin.test", "csrf-1", "csrf-1")), null);

  const crossOrigin = validateCanaryMutation(
    mutationRequest("https://attacker.test", "csrf-1", "csrf-1"),
  );
  assert.equal(crossOrigin?.status, 403);
  assert.equal((await crossOrigin?.json()).detail, "invalid_origin");

  const mismatch = validateCanaryMutation(
    mutationRequest("https://twin.test", "csrf-1", "csrf-2"),
  );
  assert.equal(mismatch?.status, 403);
  assert.equal((await mismatch?.json()).detail, "invalid_csrf");
});

test("canary session cookie is HttpOnly, Strict, path-scoped, and high priority", () => {
  const options = canaryCookieOptions(900);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "strict");
  assert.equal(options.path, "/api/ops-admin/canary");
  assert.equal(options.priority, "high");
  assert.equal(options.maxAge, 900);
});
