import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gate = readFileSync(join(root, "src/components/persona-workspace-gate.tsx"), "utf8");

test("unauthenticated users see login-required shell, not null", () => {
  assert.match(gate, /workspace\.authRequiredTitle/);
  assert.match(gate, /workspace\.authRequiredCta/);
  assert.doesNotMatch(gate, /if \(!hasToken\) return null/);
  assert.match(gate, /href=\{loginWithNext\}/);
  assert.match(gate, /loginPathWithNext/);
});

test("company surface uses company login path", () => {
  assert.match(gate, /company:/);
  assert.match(readFileSync(join(root, "src/app/company/layout.tsx"), "utf8"), /surface="company"/);
});

test("gate uses hasActiveSession so stale JWT shows auth card not workspace chrome", () => {
  assert.match(gate, /hasActiveSession/);
  assert.doesNotMatch(gate, /getToken\(\)/);
  assert.match(gate, /PersonaWorkspaceGateShell/);
  assert.doesNotMatch(gate, /from "@\/components\/ui"/);
});
