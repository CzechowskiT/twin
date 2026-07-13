/** Documentation index consistency guard. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { DOCUMENTATION_INDEX, findIndexInconsistencies } from "./lib/docs-consistency";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("1 documentation index doc exists", () => {
  assert.ok(existsSync(join(repoRoot, "docs/DOCUMENTATION_INDEX_2026-07-13.md")));
});

test("2 all indexed CURRENT docs exist on disk", () => {
  const issues = findIndexInconsistencies(DOCUMENTATION_INDEX, (p) =>
    existsSync(join(repoRoot, p)),
  );
  assert.equal(issues.length, 0, issues.join("; "));
});

test("3 superseded green plan marked", () => {
  const entry = DOCUMENTATION_INDEX.find((e) => e.path.includes("GREEN_PLAN_2026-07-09"));
  assert.equal(entry?.status, "SUPERSEDED");
});

test("4 master plan is CURRENT", () => {
  const entry = DOCUMENTATION_INDEX.find((e) => e.path.includes("ACTIVATION_MASTER_PLAN"));
  assert.equal(entry?.status, "CURRENT");
});

test("5 integration readiness in index", () => {
  const doc = readFileSync(join(repoRoot, "docs/DOCUMENTATION_INDEX_2026-07-13.md"), "utf8");
  assert.match(doc, /INTEGRATION_READINESS/);
});
