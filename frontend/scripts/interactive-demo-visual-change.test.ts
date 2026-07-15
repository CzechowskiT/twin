/**
 * Guard — interactive flow step timing (1–2s visual beats) and config validity.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERACTIVE_FLOW_MAX_STEP_MS,
  INTERACTIVE_FLOW_STEPS,
  validateInteractiveFlowConfig,
} from "../src/lib/demo/interactive-flow-config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 interactive flow config validates with no issues", () => {
  assert.deepEqual(validateInteractiveFlowConfig(), []);
});

test("2 each role has motion beats within 1–2s window", () => {
  for (const [role, steps] of Object.entries(INTERACTIVE_FLOW_STEPS)) {
    const motionSteps = steps.filter((s) => s.durationMs > 0 && s.phase !== "decision_loading");
    assert.ok(motionSteps.length >= 4, `${role}: need >= 4 motion beats`);
    for (const step of motionSteps) {
      assert.ok(
        step.durationMs <= INTERACTIVE_FLOW_MAX_STEP_MS,
        `${role}/${step.id}: ${step.durationMs}ms exceeds max`,
      );
    }
  }
});

test("3 InteractiveRoleFlow wired in sales experience", () => {
  const sales = read("src/components/marketing/demo/sales/sales-demo-experience.tsx");
  const flow = read("src/components/marketing/demo/sales/interactive-role-flow.tsx");
  assert.match(sales, /InteractiveRoleFlow/);
  assert.match(flow, /data-interactive-role-flow/);
});

test("4 flow surfaces expose decision and loading states", () => {
  const surface = read("src/components/marketing/demo/sales/interactive-flow-surface.tsx");
  assert.match(surface, /data-demo-flow-decision/);
  assert.match(surface, /data-demo-flow-loading/);
  assert.match(surface, /data-demo-flow-success/);
  assert.match(surface, /DemoMatchGauge/);
});

test("5 phase changes tracked via demo-analytics interaction events", () => {
  const flow = read("src/components/marketing/demo/sales/interactive-role-flow.tsx");
  assert.match(flow, /trackDemoInteraction/);
  assert.match(flow, /trackDemoOutcome/);
  assert.match(flow, /data-demo-flow-phase/);
});
