/**
 * Post-merge verifier dry-run tests — full 070→077 merged scaffold.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { runPostMergeVerifier } from "./post-merge-verifier";

test("1 full branch — 077 head ok", () => {
  const checks = runPostMergeVerifier({ expect077: true });
  const head = checks.find((c) => c.name === "single_head_077");
  assert.ok(head?.ok, head?.detail);
});

test("2 wave chain 070-072 passes on merged scaffold", () => {
  const checks = runPostMergeVerifier({ expect077: true });
  const wave = checks.find((c) => c.name === "wave_c_chain_070_072");
  assert.ok(wave?.ok, wave?.detail);
});

test("3 no duplicate revisions", () => {
  const checks = runPostMergeVerifier({ expect077: true });
  const dup = checks.find((c) => c.name === "no_duplicate_revisions");
  assert.ok(dup?.ok, dup?.detail);
});

test("4 alembic guard passes", () => {
  const checks = runPostMergeVerifier({ expect077: true });
  const g = checks.find((c) => c.name === "alembic_guard");
  assert.ok(g?.ok, g?.detail);
});

test("5 expect 077 full chain passes on merged scaffold", () => {
  const checks = runPostMergeVerifier({ expect077: true });
  const full = checks.find((c) => c.name === "full_chain_includes_077");
  assert.equal(full?.ok, true, full?.detail);
});

test("6 npm script registered", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const pkg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8");
  assert.match(pkg, /verify:post-merge/);
});
