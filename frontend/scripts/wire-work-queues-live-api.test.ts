import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("1 safe persistence helper exists", () => {
  const src = readFileSync(join(root, "src/lib/safe-persistence-api.ts"), "utf8");
  assert.match(src, /preserveSessionOnUnauthorized/);
});
test("2 work items wired", () => {
  assert.match(readFileSync(join(root, "src/components/recruiter/work-items-workspace.tsx"), "utf8"), /loadWorkItems/);
  assert.match(readFileSync(join(root, "src/components/recruiter/work-items-workspace.tsx"), "utf8"), /work-items-data-source/);
});
test("3 review queue wired", () => {
  assert.match(readFileSync(join(root, "src/components/recruiter/recruiter-trust-review-queue-workspace.tsx"), "utf8"), /loadRecruiterTrustReviewQueue/);
});
test("4 operational queue wired", () => {
  assert.match(readFileSync(join(root, "src/components/recruiter/recruiter-operational-work-queue-workspace.tsx"), "utf8"), /loadWorkItems/);
});
test("5 no forbidden saved copy", () => {
  const ws = readFileSync(join(root, "src/components/recruiter/work-items-workspace.tsx"), "utf8");
  assert.doesNotMatch(ws, /saved successfully/i);
});
