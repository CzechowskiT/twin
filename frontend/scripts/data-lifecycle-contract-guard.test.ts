/** Data lifecycle contract — doc + module coverage guard. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = "docs/DATA_LIFECYCLE_CONTRACT_2026-07-13.md";
const MODULES = [
  "Career Compass",
  "Trust Center",
  "Referrals",
  "Recruiter Activation",
  "Talent Pool",
  "Trust Review Queue",
];

test("1 data lifecycle doc exists", () => {
  assert.ok(existsSync(join(repoRoot, DOC)));
});

test("2 all six modules documented", () => {
  const doc = readFileSync(join(repoRoot, DOC), "utf8");
  for (const m of MODULES) assert.match(doc, new RegExp(m));
});

test("3 cross-tenant section present", () => {
  const doc = readFileSync(join(repoRoot, DOC), "utf8");
  assert.match(doc, /Cross-tenant/i);
});

test("4 backend test file exists", () => {
  assert.ok(existsSync(join(repoRoot, "backend/tests/test_data_lifecycle_contract.py")));
});
