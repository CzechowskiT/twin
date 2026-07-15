/**
 * Wave C — recruiter JWT gate guard (canonical contract + no query tokens).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 backend recruiter JWT module — iss/aud/role/tenant/alg allowlist", () => {
  const mod = readRepo("backend/app/core/recruiter_jwt.py");
  assert.match(mod, /RECRUITER_JWT_ISSUER/);
  assert.match(mod, /RECRUITER_JWT_AUDIENCE/);
  assert.match(mod, /RECRUITER_JWT_ROLE/);
  assert.match(mod, /tenant/);
  assert.match(mod, /algorithms=list\(RECRUITER_JWT_ALGORITHMS\)/);
});

test("2 auth exchange endpoint exists", () => {
  const auth = readRepo("backend/app/api/auth.py");
  assert.match(auth, /\/recruiter\/session/);
  assert.match(auth, /mint_recruiter_session_jwt/);
});

test("3 recruiter API — no query token param", () => {
  const api = readRepo("backend/app/api/recruiter.py");
  assert.doesNotMatch(api, /token: Annotated\[str \| None, Query\(\)\]/);
  assert.match(api, /resolve_recruiter_company_slug/);
});

test("4 frontend proxy — no query token gate", () => {
  const route = readRepo("frontend/src/lib/recruiter-inbox-api-route.ts");
  assert.doesNotMatch(route, /searchParams\.get\("token"\)/);
  assert.match(route, /authorization/i);
});

test("5 recruiterInboxQuery — company_slug only", () => {
  const inbox = readRepo("frontend/src/lib/recruiter-inbox.ts");
  assert.match(inbox, /recruiterCompanyQuery/);
  assert.doesNotMatch(inbox, /token: token\.trim\(\)/);
});

test("6 frontend JWT session module", () => {
  const jwt = readRepo("frontend/src/lib/recruiter-jwt.ts");
  assert.match(jwt, /exchangeRecruiterPilotToken/);
  assert.match(jwt, /Authorization.*Bearer/);
  assert.match(jwt, /clearRecruiterJwtSession/);
});

test("7 backend tests cover JWT gate", () => {
  const tests = readRepo("backend/tests/test_recruiter_jwt_gate.py");
  assert.match(tests, /test_exchange_recruiter_session_endpoint/);
  assert.match(tests, /tenant_mismatch/);
});

test("8 persona gate prefers JWT session", () => {
  const gate = readRepo("frontend/src/components/persona-workspace-gate.tsx");
  assert.match(gate, /hasRecruiterJwtSession/);
});
