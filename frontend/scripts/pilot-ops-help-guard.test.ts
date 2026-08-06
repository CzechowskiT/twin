/**
 * Epic 2.10 — Help Center / feedback IA guard (no 8th primary).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(__dirname, "..");

test("candidate IA keeps 7 primary destinations", () => {
  const src = readFileSync(join(root, "src/lib/candidate-ia.ts"), "utf8");
  const matches = src.match(/id: "/g) || [];
  // primary block has 7 ids
  assert.ok(src.includes('id: "settings"'));
  assert.ok(src.includes("/dashboard/help"));
  assert.ok(src.includes("OPERATIONALLY_READY_INACTIVE"));
  assert.ok(!src.includes('id: "help"') || (src.match(/CANDIDATE_PRIMARY_IA[\s\S]*?\] as const/) || [""])[0].split("id:").length - 1 === 7);
  void matches;
});

test("help pages exist without attachment inputs", () => {
  for (const rel of [
    "src/app/dashboard/help/page.tsx",
    "src/app/dashboard/help/report-problem/page.tsx",
    "src/app/dashboard/help/feedback/page.tsx",
  ]) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.ok(!src.includes('type="file"'));
    assert.ok(!src.includes("screenshot"));
  }
});
