/**
 * Scheduling decision context — route wiring, copy guards, cross-links.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  SCHEDULING_DECISION_CONTEXT_CROSS_LINKS,
  SCHEDULING_DECISION_CONTEXT_MARKERS,
  resolveSchedulingDecisionContext,
} from "../src/lib/scheduling-decision-context";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_BOUNDARY = [
  /no event write/i,
  /no invite sent/i,
  /no calendar sync/i,
  /human review required/i,
  /product gate required/i,
] as const;

const OFFER_WORKSPACES = [
  "src/components/candidate/candidate-offer-readiness-workspace.tsx",
  "src/components/recruiter/recruiter-offer-readiness-preview-workspace.tsx",
  "src/components/board/board-offer-readiness-monitor-workspace.tsx",
] as const;

const PLACEMENT_WORKSPACES = [
  "src/components/candidate/candidate-placement-verification-preview-workspace.tsx",
  "src/components/board/board-placement-evidence-monitor-workspace.tsx",
] as const;

const CALENDAR_WORKSPACES = [
  "src/components/candidate/candidate-calendar-readiness-workspace.tsx",
  "src/components/board/board-calendar-readiness-monitor-workspace.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertPanelWired(workspaces: readonly string[], surface: string): void {
  for (const ws of workspaces) {
    const src = read(ws);
    assert.match(src, /SchedulingDecisionContextPanel/, ws);
    assert.match(src, new RegExp(`surface="${surface}"`), ws);
    assert.match(src, /scheduling-decision-context-panel/, ws);
  }
}

test("1 lib and panel files exist", () => {
  assert.match(read("src/lib/scheduling-decision-context.ts"), /resolveSchedulingDecisionContext/);
  assert.match(read("src/components/shared/scheduling-decision-context-panel.tsx"), /SCHEDULING_DECISION_CONTEXT_MARKERS/);
});

test("2 panel on offer readiness surfaces", () => {
  assertPanelWired(OFFER_WORKSPACES, "offer_readiness");
});

test("3 panel on placement verification surfaces", () => {
  assertPanelWired(PLACEMENT_WORKSPACES, "placement_verification");
});

test("4 panel on calendar readiness surfaces", () => {
  assertPanelWired(CALENDAR_WORKSPACES, "calendar_readiness");
});

test("5 cross-links point to existing routes", () => {
  const hrefs = SCHEDULING_DECISION_CONTEXT_CROSS_LINKS.map((l) => l.href);
  assert.ok(hrefs.includes("/dashboard/offer-readiness"));
  assert.ok(hrefs.includes("/dashboard/placement-verification"));
  assert.ok(hrefs.includes("/dashboard/calendar/readiness"));
  assert.ok(hrefs.includes("/board/calendar-readiness"));
  assert.ok(hrefs.includes("/board/placement-verification"));
});

test("6 source badge marker present", () => {
  const panel = read("src/components/shared/scheduling-decision-context-panel.tsx");
  assert.match(panel, /SCHEDULING_DECISION_CONTEXT_MARKERS\.sourceBadge/);
  assert.match(panel, /EvidenceStatusBadge/);
});

test("7 resolver returns partial demo bundle", () => {
  const bundle = resolveSchedulingDecisionContext("offer_readiness");
  assert.equal(bundle.record.source, "partial");
  assert.ok(bundle.record.boundary_keys.length >= 6);
  assert.ok(bundle.record.calendar_relations.some((r) => r.status === "staging_required"));
});

test("8 forbidden scheduling finality copy absent from i18n EN", () => {
  const blob = JSON.stringify(en.schedulingDecisionContext);
  const positiveForbidden = [
    /meeting created/i,
    /(?<!no )invite sent/i,
    /event created/i,
    /calendar synced/i,
    /automatic scheduling/i,
    /candidate notified/i,
    /recruiter notified/i,
    /company notified/i,
    /offer accepted/i,
    /\bhired\b/i,
    /placement confirmed externally/i,
    /(?<!no )revenue recognized/i,
    /(?<!not )contract signed/i,
    /launch ready/i,
  ] as const;
  for (const pattern of positiveForbidden) {
    assert.doesNotMatch(blob, pattern, `forbidden in EN: ${pattern}`);
  }
});

test("9 required boundary copy present in EN", () => {
  const blob = JSON.stringify(en.schedulingDecisionContext);
  for (const pattern of REQUIRED_BOUNDARY) {
    assert.match(blob, pattern, `required in EN: ${pattern}`);
  }
});

test("10 launch gates unchanged in panel sources", () => {
  const combined =
    read("src/components/shared/scheduling-decision-context-panel.tsx") +
    read("src/lib/scheduling-decision-context.ts");
  assert.doesNotMatch(combined, /LAUNCH.*GO/i);
  assert.doesNotMatch(combined, /phase.?3b.*unblocked/i);
});

test("11 i18n PL namespace mirrors EN keys", () => {
  const enKeys = Object.keys(en.schedulingDecisionContext);
  const plKeys = Object.keys(dictionaries.pl.schedulingDecisionContext);
  assert.deepEqual(plKeys.sort(), enKeys.sort());
});

test("12 npm script registered", () => {
  assert.match(read("package.json"), /test:scheduling-decision-context/);
});
