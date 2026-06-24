/**
 * Shared operating evidence components — presence and read-only guards.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { OPERATING_EVIDENCE_MARKERS } from "../src/lib/operating-evidence";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const COMPONENTS = [
  "src/components/shared/operating-evidence-panel.tsx",
  "src/components/shared/evidence-status-badge.tsx",
  "src/components/shared/read-only-capability-matrix.tsx",
  "src/components/shared/placement-verification-evidence-panel.tsx",
  "src/components/shared/calendar-readiness-evidence-panel.tsx",
] as const;

test("1 all shared components exist", () => {
  for (const rel of COMPONENTS) {
    assert.match(read(rel), /export function/);
  }
});

test("2 no polling or write actions in shared components", () => {
  const blob = COMPONENTS.map(read).join("\n");
  assert.doesNotMatch(blob, /setInterval/);
  assert.doesNotMatch(blob, /method:\s*["']POST["']/);
  assert.doesNotMatch(blob, /method:\s*["']PATCH["']/);
  assert.doesNotMatch(blob, /method:\s*["']DELETE["']/);
});

test("3 marker constants exported", () => {
  assert.equal(OPERATING_EVIDENCE_MARKERS.panel, "operating-evidence-panel");
  assert.equal(OPERATING_EVIDENCE_MARKERS.sourceBadge, "evidence-status-badge");
  assert.equal(OPERATING_EVIDENCE_MARKERS.capabilityMatrix, "read-only-capability-matrix");
});

test("4 evidence resolvers live in dedicated lib modules", () => {
  assert.match(read("src/lib/placement-verification-evidence.ts"), /resolvePlacementVerificationEvidence/);
  assert.match(read("src/lib/calendar-readiness-evidence.ts"), /resolveCalendarReadinessEvidence/);
});
