/**
 * Post-merge verifier dry-run tests.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { runPostMergeVerifier } from "./post-merge-verifier";

test("1 partial branch — 073 absent ok", () => {
  const checks = runPostMergeVerifier({ expect073: false });
  const absent = checks.find((c) => c.name === "073_absent_on_partial_branch");
  assert.ok(absent?.ok, absent?.detail);
});

test("2 wave chain 070-072 passes on #450", () => {
  const checks = runPostMergeVerifier({ expect073: false });
  const wave = checks.find((c) => c.name === "wave_c_chain_070_072");
  assert.ok(wave?.ok, wave?.detail);
});

test("3 no duplicate revisions", () => {
  const checks = runPostMergeVerifier();
  const dup = checks.find((c) => c.name === "no_duplicate_revisions");
  assert.ok(dup?.ok, dup?.detail);
});

test("4 alembic guard passes", () => {
  const checks = runPostMergeVerifier();
  const g = checks.find((c) => c.name === "alembic_guard");
  assert.ok(g?.ok, g?.detail);
});

test("5 expect 073 fails on current branch", () => {
  const checks = runPostMergeVerifier({ expect073: true });
  const full = checks.find((c) => c.name === "full_chain_includes_073");
  assert.equal(full?.ok, false);
});

test("6 npm script registered", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const pkg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8");
  assert.match(pkg, /verify:post-merge/);
});
