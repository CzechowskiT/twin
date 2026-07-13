import assert from "node:assert/strict";
import test from "node:test";

import { runLifecycleDryRun } from "./lib/data-lifecycle-dry-run-engine";

test("lifecycle dry-run: blocks LIVE env flags", () => {
  const report = runLifecycleDryRun({ LIVE: "1" });
  assert.equal(report.ok, false);
  assert.ok(report.blockers.some((b) => /LIVE/i.test(b)));
});

test("lifecycle dry-run: passes with empty env", () => {
  const report = runLifecycleDryRun({});
  assert.equal(report.ok, true);
  assert.ok(report.steps.length >= 4);
});

test("lifecycle dry-run: includes export before destructive", () => {
  const report = runLifecycleDryRun({});
  const exportIdx = report.steps.findIndex((s) => s.phase === "export");
  const purgeIdx = report.steps.findIndex((s) => s.phase === "purge");
  assert.ok(exportIdx >= 0 && purgeIdx > exportIdx);
});

test("lifecycle dry-run: wave C tables in plan", () => {
  const report = runLifecycleDryRun({});
  const tables = report.steps.map((s) => s.table);
  assert.ok(tables.includes("recruiter_notification_prefs"));
  assert.ok(tables.includes("recruiter_activity_timeline_events"));
});

test("lifecycle dry-run: 7 steps minimum", () => {
  const report = runLifecycleDryRun({});
  assert.ok(report.steps.length >= 7);
});
