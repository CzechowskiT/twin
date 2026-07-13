/** Feature flag audit hardening guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/HARDENING_FEATURE_FLAG_AUDIT_2026-07-13.md");

test("1 feature flag audit doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /feature flag audit/i);
});

test("2 seven-day C2 ship status PILOT", () => {
  const c2 = readFileSync(join(repoRoot, "frontend/src/lib/seven-day-c2-recruiter.ts"), "utf8");
  assert.match(c2, /PILOT/);
});

test("3 no STRIPE_LIVE in frontend src", () => {
  const activation = readFileSync(
    join(repoRoot, "frontend/src/lib/all-workspace-modules-activation.ts"),
    "utf8",
  );
  assert.doesNotMatch(activation, /STRIPE_LIVE|ATS_WRITE/);
});

test("4 decision doc NO-GO", () => {
  const doc = readFileSync(join(repoRoot, "docs/AUTONOMOUS_BATCH_DECISION_WAVE_C3_C5_2026-07-13.md"), "utf8");
  assert.match(doc, /NO-GO/);
});
