/** Rollback decision doc guard — per PR #448-450. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/ROLLBACK_DECISION_PR448_449_450_2026-07-13.md");

test("1 rollback doc exists", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /Rollback decision/);
});

test("2 all three PRs in matrix", () => {
  const doc = readFileSync(DOC, "utf8");
  for (const pr of ["#449", "#450", "#448"]) assert.match(doc, new RegExp(pr));
});

test("3 no auto downgrade on production", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /Never.*alembic downgrade/i);
});

test("4 launch remains NO-GO", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /NO-GO/);
});

test("5 migration numbers listed", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /071_recruiter_workspace_activation/);
  assert.match(doc, /072_recruiter_talent_pool/);
  assert.match(doc, /073_candidate_referrals/);
});
