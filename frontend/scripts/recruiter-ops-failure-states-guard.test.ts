/** Recruiter ops failure states guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");
const DOC = join(repoRoot, "docs/RECRUITER_OPS_FAILURE_STATES_2026-07-13.md");

test("1 failure states doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /failure states/i);
});

test("2 C1 activation states documented", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /C1.*Activation/i);
  assert.match(doc, /Error — auth/i);
});

test("3 C2 talent pool cross-tenant state", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /cross-tenant/i);
});

test("4 activation panel handles error state", () => {
  const panel = readFileSync(join(root, "src/components/recruiter/recruiter-activation-panel.tsx"), "utf8");
  assert.match(panel, /error|Error|failed/i);
});

test("5 PILOT honesty in doc", () => {
  assert.match(readFileSync(DOC, "utf8"), /PILOT/);
});
