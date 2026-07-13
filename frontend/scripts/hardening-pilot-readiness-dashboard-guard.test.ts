/** Pilot readiness dashboard hardening guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/HARDENING_PILOT_READINESS_DASHBOARD_2026-07-13.md");

test("1 pilot readiness doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /pilot readiness/i);
});

test("2 no LIVE or GA in pilot doc", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.doesNotMatch(doc, /\bGA\b/);
});

test("3 PILOT stance required", () => {
  assert.match(readFileSync(DOC, "utf8"), /PILOT/);
});
