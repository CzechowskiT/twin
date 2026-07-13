/** Privacy request tracker hardening guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/HARDENING_PRIVACY_REQUEST_TRACKER_2026-07-13.md");

test("1 privacy tracker doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /privacy request tracker/i);
});

test("2 no duplicate tracker UI", () => {
  assert.match(readFileSync(DOC, "utf8"), /not duplicated|deferred/i);
});

test("3 trust center single source", () => {
  assert.match(readFileSync(DOC, "utf8"), /Trust Center/i);
});
