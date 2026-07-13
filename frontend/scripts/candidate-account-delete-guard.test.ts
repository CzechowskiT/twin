/**
 * Guard — R-019 candidate self-service account deletion wiring.
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

test("1 backend delete-account route exists", () => {
  const api = readRepo("backend/app/api/candidates.py");
  assert.match(api, /\/me\/delete-account/);
  assert.match(api, /execute_candidate_account_deletion/);
});

test("2 deletion service anonymizes and audits", () => {
  const svc = readRepo("backend/app/services/candidate_account_deletion.py");
  assert.match(svc, /anonymized\.twin/);
  assert.match(svc, /account_deleted/);
  assert.match(svc, /is_active = False/);
});

test("3 frontend live panel and API path", () => {
  const panel = readRepo("frontend/src/components/candidate/candidate-account-delete-live-panel.tsx");
  const api = readRepo("frontend/src/lib/candidate-account-delete-api.ts");
  assert.match(panel, /CandidateAccountDeleteLivePanel/);
  assert.match(api, /\/api\/v1\/candidates\/me\/delete-account/);
});

test("4 audit event type registered", () => {
  const audit = readRepo("backend/app/services/candidate_trust_audit_service.py");
  assert.match(audit, /account_deleted/);
});

test("5 backend tests cover deletion", () => {
  const tests = readRepo("backend/tests/test_candidate_account_deletion.py");
  assert.match(tests, /delete-account/);
  assert.match(tests, /DELETE/);
});
