/** Placement events UI integration — timeline on verification routes. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PLACEMENT_EVENTS_API_PATH,
  PLACEMENT_EVENTS_TIMELINE_MARKERS,
  resolvePlacementEventsDemo,
} from "../src/lib/placement-events";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const FORBIDDEN_COPY = [
  "employer confirmed",
  "invoice sent",
  "payment captured",
  "revenue recognized",
  "email sent",
  "ATS synced",
  "legally verified",
  "launch ready",
];

test("1 timeline component and lib exist", () => {
  assert.match(read("src/components/shared/placement-events-timeline.tsx"), /PlacementEventsTimeline/);
  assert.equal(PLACEMENT_EVENTS_API_PATH, "/api/v1/placement-events");
});

test("2 demo events use safe event types", () => {
  const demo = resolvePlacementEventsDemo();
  assert.ok(demo.length >= 2);
  for (const row of demo) {
    assert.ok(!row.event_type.includes("invoice"));
    assert.ok(!row.event_type.includes("payment"));
  }
});

test("3 board placement route wires timeline", () => {
  const ws = read("src/components/board/board-placement-evidence-monitor-workspace.tsx");
  assert.match(ws, /PlacementEventsTimeline/);
  assert.match(ws, /data-testid=\{PLACEMENT_EVENTS_TIMELINE_MARKERS\.widget\}|placement-events-timeline/);
});

test("4 candidate placement route wires timeline", () => {
  const ws = read("src/components/candidate/candidate-placement-verification-preview-workspace.tsx");
  assert.match(ws, /PlacementEventsTimeline/);
});

test("5 recruiter placement route wires timeline", () => {
  const ws = read("src/components/recruiter/recruiter-placement-verification-checklist-workspace.tsx");
  assert.match(ws, /PlacementEventsTimeline/);
});

test("6 company placement route wires timeline", () => {
  const ws = read("src/components/company/company-placement-verification-checklist-workspace.tsx");
  assert.match(ws, /PlacementEventsTimeline/);
});

test("7 fallback path in loader", () => {
  const lib = read("src/lib/placement-events-live.ts");
  assert.match(lib, /fetchSafePersistenceList/);
  assert.match(lib, /resolvePlacementEventsDemo/);
  assert.match(lib, /source: "partial"/);
});

test("8 safety copy present without forbidden phrases", () => {
  const component = read("src/components/shared/placement-events-timeline.tsx");
  const i18n = read("src/lib/i18n.ts");
  assert.match(component, /placementEventsTimeline\.safetyNote/);
  const section = i18n.split("placementEventsTimeline:")[1]?.split("boardPlacementEvidence:")[0] ?? "";
  for (const phrase of FORBIDDEN_COPY) {
    assert.ok(!section.toLowerCase().includes(phrase), `forbidden phrase in timeline i18n: ${phrase}`);
  }
});

test("9 no write action buttons in timeline component", () => {
  const component = read("src/components/shared/placement-events-timeline.tsx");
  assert.doesNotMatch(component, /method:\s*["']POST["']/);
  assert.doesNotMatch(component, /postSafePersistence/);
});

test("10 source badge marker visible", () => {
  const component = read("src/components/shared/placement-events-timeline.tsx");
  assert.match(component, /PLACEMENT_EVENTS_TIMELINE_MARKERS\.source/);
});

test("11 launch stance unchanged in board workspace", () => {
  assert.match(
    read("src/components/board/board-placement-evidence-monitor-workspace.tsx"),
    /LAUNCH_STANCE/,
  );
});

test("12 npm script registered", () => {
  assert.match(read("package.json"), /test:placement-events-ui-integration/);
});

test("13 profile placement route reuses candidate workspace", () => {
  const page = read("src/app/profile/placement-verification/page.tsx");
  assert.match(page, /CandidatePlacementVerificationPreviewWorkspace/);
});

test("14 dashboard placement route page exists", () => {
  const page = read("src/app/dashboard/placement-verification/page.tsx");
  assert.match(page, /CandidatePlacementVerificationPreviewWorkspace/);
});

test("15 board placement route page exists", () => {
  const page = read("src/app/board/placement-verification/page.tsx");
  assert.match(page, /BoardPlacementEvidenceMonitorWorkspace/);
});

test("16 timeline receives placementId from record", () => {
  const candidate = read("src/components/candidate/candidate-placement-verification-preview-workspace.tsx");
  const board = read("src/components/board/board-placement-evidence-monitor-workspace.tsx");
  assert.match(candidate, /PlacementEventsTimeline placementId=\{record\.placement_id\}/);
  assert.match(board, /PlacementEventsTimeline placementId=\{record\.placement_id\}/);
});
