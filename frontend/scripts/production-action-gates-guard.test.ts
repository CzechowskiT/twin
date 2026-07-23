/**
 * Guard: production action gates + Founder pilot block constants.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(process.cwd(), "src/lib/production-action-gates.ts");

test("Founder pilot block constants present", () => {
  const src = readFileSync(root, "utf8");
  assert.match(src, /BLOCKED_BY_FOUNDER/);
  assert.match(src, /GATE_F_STATUS = "PASS"/);
  assert.match(src, /LAUNCH_STANCE_CANON = "NO-GO"/);
  assert.match(src, /INSUFFICIENT_DATA/);
  assert.match(src, /REAL_CANDIDATE_ENROLLMENT = "NOT_STARTED"/);
  assert.match(src, /EXTERNAL_PILOT_ENROLLMENT_ENABLED/);
});

test("default enrollment is not hard-coded true", () => {
  const src = readFileSync(root, "utf8");
  assert.doesNotMatch(src, /EXTERNAL_PILOT_ENROLLMENT_ENABLED\s*=\s*true/);
});
