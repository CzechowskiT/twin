/** OpenAPI / API contract drift guard for Wave B/C endpoints. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { WAVE_API_CONTRACTS, diffContractFields } from "./lib/openapi-contract-baseline";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("1 B1 career compass route in candidates API", () => {
  const api = readFileSync(join(repoRoot, "backend/app/api/candidates.py"), "utf8");
  assert.match(api, /me\/career-compass/);
});

test("2 C1 activation route exists", () => {
  const files = ["backend/app/api/recruiter.py", "backend/app/api/recruiter_activation.py"];
  let found = false;
  for (const f of files) {
    try {
      const src = readFileSync(join(repoRoot, f), "utf8");
      if (/recruiter\/activation|\/activation/.test(src)) found = true;
    } catch {
      /* try next */
    }
  }
  assert.ok(found, "recruiter activation route");
});

test("3 C2 talent pool routes exist", () => {
  const api = readFileSync(join(repoRoot, "backend/app/api/recruiter.py"), "utf8");
  assert.match(api, /talent-pool/);
  assert.match(api, /trust-review-queue/);
});

test("4 contract diff detects missing field", () => {
  const drifts = diffContractFields("B1", ["updated_at"]);
  assert.ok(drifts.length > 0);
});

test("5 contract diff passes when all fields present", () => {
  const drifts = diffContractFields("B1", WAVE_API_CONTRACTS.B1.responseFields as unknown as string[]);
  assert.equal(drifts.length, 0);
});

test("6 B3 marked as PR 448", () => {
  assert.equal(WAVE_API_CONTRACTS.B3.pr, 448);
});

test("7 openapi snapshot baseline file exists", () => {
  assert.ok(
    readFileSync(join(repoRoot, "backend/tests/snapshots/wave_api_contract_paths.txt"), "utf8").length > 20,
  );
});
