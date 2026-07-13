/** Workspace suspension hardening guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/HARDENING_WORKSPACE_SUSPENSION_2026-07-13.md");

test("1 workspace suspension doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /workspace suspension/i);
});

test("2 no LIVE suspension flip", () => {
  assert.match(readFileSync(DOC, "utf8"), /no LIVE suspension/i);
});

test("3 read-only timeline on suspend", () => {
  assert.match(readFileSync(DOC, "utf8"), /read-only|audit/i);
});
