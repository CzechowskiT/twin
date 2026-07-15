/**
 * Guard — interactive flow cockpit visual refinement: cadence, captions, occupancy, structure.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERACTIVE_FLOW_ABSOLUTE_MAX_MS,
  INTERACTIVE_FLOW_BEAT_MAX_MS,
  INTERACTIVE_FLOW_BEAT_MIN_MS,
  INTERACTIVE_FLOW_MAX_STEP_MS,
  INTERACTIVE_FLOW_STEPS,
  INTERACTIVE_FLOW_TARGET_BEAT_MS,
  validateInteractiveFlowConfig,
} from "../src/lib/demo/interactive-flow-config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 interactive flow config validates with no issues", () => {
  assert.deepEqual(validateInteractiveFlowConfig(), []);
});

test("2 motion beats target 1500ms within 1300–1700ms window", () => {
  for (const [role, steps] of Object.entries(INTERACTIVE_FLOW_STEPS)) {
    const motionSteps = steps.filter((s) => s.durationMs > 0);
    assert.ok(motionSteps.length >= 5, `${role}: need >= 5 timed beats`);
    for (const step of motionSteps) {
      assert.ok(
        step.durationMs >= INTERACTIVE_FLOW_BEAT_MIN_MS && step.durationMs <= INTERACTIVE_FLOW_BEAT_MAX_MS,
        `${role}/${step.id}: ${step.durationMs}ms outside ${INTERACTIVE_FLOW_BEAT_MIN_MS}–${INTERACTIVE_FLOW_BEAT_MAX_MS}`,
      );
      assert.ok(
        step.durationMs <= INTERACTIVE_FLOW_ABSOLUTE_MAX_MS,
        `${role}/${step.id}: exceeds absolute max ${INTERACTIVE_FLOW_ABSOLUTE_MAX_MS}`,
      );
    }
    const timed = motionSteps.filter((s) => s.phase !== "decision" && s.phase !== "outcome");
    const avg =
      timed.reduce((sum, s) => sum + s.durationMs, 0) / Math.max(1, timed.length);
    assert.ok(
      avg >= INTERACTIVE_FLOW_BEAT_MIN_MS && avg <= INTERACTIVE_FLOW_BEAT_MAX_MS,
      `${role}: average beat ${avg}ms outside window`,
    );
  }
  assert.equal(INTERACTIVE_FLOW_TARGET_BEAT_MS, 1_500);
  assert.equal(INTERACTIVE_FLOW_MAX_STEP_MS, INTERACTIVE_FLOW_ABSOLUTE_MAX_MS);
});

test("3 each motion beat declares at least two meaningful UI changes", () => {
  for (const [role, steps] of Object.entries(INTERACTIVE_FLOW_STEPS)) {
    for (const step of steps) {
      if (step.durationMs <= 0) continue;
      assert.ok(
        step.uiChanges.length >= 2,
        `${role}/${step.id}: only ${step.uiChanges.length} uiChanges`,
      );
    }
  }
});

test("4 single canonical narrative caption — no duplicate scene headings", () => {
  const flow = read("src/components/marketing/demo/sales/interactive-role-flow.tsx");
  assert.match(flow, /data-demo-canonical-caption/);
  assert.doesNotMatch(flow, /roleTitle_/);
  assert.doesNotMatch(flow, /demoSales\.heroTitle/);
  const matches = flow.match(/data-demo-flow-caption/g) ?? [];
  assert.equal(matches.length, 1, "expected exactly one data-demo-flow-caption");
});

test("5 video player defaults VTT hidden to avoid CaptionBar duplicate", () => {
  const player = read("src/components/marketing/demo/sales/product-film-player.tsx");
  assert.match(player, /useState\(false\)/);
  assert.match(player, /data-demo-video-captions/);
});

test("6 cockpit shell structure for all roles", () => {
  const surface = read("src/components/marketing/demo/sales/interactive-flow-surface.tsx");
  for (const attr of [
    "data-demo-cockpit-shell",
    "data-demo-cockpit-left",
    "data-demo-cockpit-center",
    "data-demo-cockpit-right",
    "data-demo-cockpit-timeline",
    "data-demo-cockpit-grid",
  ]) {
    assert.match(surface, new RegExp(attr));
  }
  assert.match(surface, /CandidateSurface/);
  assert.match(surface, /RecruiterSurface/);
  assert.match(surface, /CompanySurface/);
  assert.match(surface, /DemoMatchGauge/);
  assert.match(surface, /data-demo-flow-decision/);
});

test("7 viewport occupancy CSS targets ≥75% shell / ≥65% center", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /min-height: clamp\(420px, 78vh/);
  assert.match(css, /width: min\(92vw/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.65fr\)/);
  assert.match(css, /--demo-cockpit-bg/);
});

test("8 InteractiveRoleFlow wired in sales experience", () => {
  const sales = read("src/components/marketing/demo/sales/sales-demo-experience.tsx");
  const flow = read("src/components/marketing/demo/sales/interactive-role-flow.tsx");
  assert.match(sales, /InteractiveRoleFlow/);
  assert.match(flow, /data-interactive-role-flow/);
});

test("9 phase changes tracked via demo-analytics interaction events", () => {
  const flow = read("src/components/marketing/demo/sales/interactive-role-flow.tsx");
  assert.match(flow, /trackDemoInteraction/);
  assert.match(flow, /trackDemoOutcome/);
  assert.match(flow, /data-demo-flow-phase/);
});

test("10 demoCockpit i18n keys mirrored EN/PL", () => {
  const i18n = read("src/lib/i18n.ts");
  assert.match(i18n, /demoCockpit:/);
  assert.match(i18n, /candidateInbox:/);
  assert.match(i18n, /timeline_scan:/);
  assert.match(i18n, /inviteInterview:/);
  assert.match(i18n, /careerCompass:/);
});

test("11 dark mockup density markers — neon CTA, metrics, career compass", () => {
  const surface = read("src/components/marketing/demo/sales/interactive-flow-surface.tsx");
  assert.match(surface, /demo-cockpit-cta--neon/);
  assert.match(surface, /demo-cockpit-metric/);
  assert.match(surface, /demoCockpit\.inviteInterview/);
  assert.match(surface, /demoCockpit\.careerCompass/);
  assert.match(surface, /demoCockpit\.whyFit/);
  assert.match(surface, /data-demo-cockpit-availability/);
  const css = read("src/app/globals.css");
  assert.match(css, /--demo-cockpit-neon/);
  assert.match(css, /\.demo-cockpit-cta--neon/);
  assert.match(css, /\.demo-cockpit-metric__fill/);
  const remotionRecruiter = read("remotion/src/scenes/RecruiterInboxScene.tsx");
  assert.match(remotionRecruiter, /Dense dark-glass recruiter cockpit/);
  assert.match(remotionRecruiter, /FILM\.neon/);
  assert.match(remotionRecruiter, /Invite to interview/);
});
