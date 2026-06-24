/**
 * Prod smoke commit gate — unit guards for docs-only drift semantics.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  changedPathsSinceProdCommit,
  isDocsOnlyDrift,
  resolveAlignmentStatus,
} from "./lib/prod-smoke-commit-gate";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("1 isDocsOnlyDrift true only for docs/ paths", () => {
  assert.equal(isDocsOnlyDrift(["docs/FOO.md"]), true);
  assert.equal(isDocsOnlyDrift(["docs/a.md", "docs/b.md"]), true);
  assert.equal(isDocsOnlyDrift([]), false);
  assert.equal(isDocsOnlyDrift(["frontend/src/foo.ts"]), false);
  assert.equal(isDocsOnlyDrift(["docs/a.md", "frontend/b.ts"]), false);
});

test("2 resolveAlignmentStatus aligned on matching short SHA", () => {
  const head = "abcdef1234567890";
  assert.equal(resolveAlignmentStatus("abcdef1", head, []), "aligned");
});

test("3 resolveAlignmentStatus acceptable_docs_only_drift", () => {
  assert.equal(
    resolveAlignmentStatus("1111111", "2222222", ["docs/ONLY.md"]),
    "acceptable_docs_only_drift",
  );
});

test("4 resolveAlignmentStatus failed_alignment on source drift", () => {
  assert.equal(
    resolveAlignmentStatus("1111111", "2222222", ["frontend/package.json"]),
    "failed_alignment",
  );
});

test("5 changedPathsSinceProdCommit returns array", () => {
  const paths = changedPathsSinceProdCommit("HEAD");
  assert.ok(Array.isArray(paths));
});

test("6 verify wrapper and gate module exist in package.json", () => {
  const pkg = readFileSync(join(scriptRoot, "package.json"), "utf8");
  assert.match(pkg, /verify:prod-candidate-calendar-readiness/);
  assert.match(pkg, /test:candidate-calendar-readiness-browser/);
});
