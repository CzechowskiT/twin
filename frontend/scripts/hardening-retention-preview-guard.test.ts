/** Retention preview hardening guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runLifecycleDryRun } from "./lib/data-lifecycle-dry-run-engine";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/HARDENING_RETENTION_PREVIEW_2026-07-13.md");
const CONTRACT = join(repoRoot, "docs/DATA_LIFECYCLE_CONTRACT_2026-07-13.md");

test("1 retention preview doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /retention preview/i);
});

test("2 lifecycle contract references export-first", () => {
  assert.match(readFileSync(CONTRACT, "utf8"), /export/i);
});

test("3 dry-run blocks LIVE", () => {
  const r = runLifecycleDryRun({ LIVE: "1" });
  assert.equal(r.ok, false);
});

test("4 C3 table in lifecycle plan", () => {
  const r = runLifecycleDryRun({});
  assert.ok(r.steps.some((s) => s.table === "recruiter_notification_prefs"));
});
