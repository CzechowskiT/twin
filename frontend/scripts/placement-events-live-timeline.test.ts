/** Placement events live timeline — component + live loader static checks. */
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
import {
  loadPlacementEventsTimeline,
  placementEventsTimelineSourceKey,
  PLACEMENT_EVENTS_TIMELINE_MAX,
} from "../src/lib/placement-events-live";

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

test("1 live lib and timeline component exist", () => {
  assert.match(read("src/lib/placement-events-live.ts"), /loadPlacementEventsTimeline/);
  assert.match(read("src/components/shared/placement-events-timeline.tsx"), /PlacementEventsTimeline/);
  assert.equal(PLACEMENT_EVENTS_API_PATH, "/api/v1/placement-events");
});

test("2 demo events safe and bounded", () => {
  const demo = resolvePlacementEventsDemo();
  assert.ok(demo.length >= 2);
  assert.ok(demo.length <= PLACEMENT_EVENTS_TIMELINE_MAX);
  for (const row of demo) {
    assert.ok(!row.event_type.includes("invoice"));
    assert.ok(!row.event_type.includes("payment"));
  }
});

test("3 live loader uses safe persistence fetch", () => {
  const lib = read("src/lib/placement-events-live.ts");
  assert.match(lib, /fetchSafePersistenceList/);
  assert.match(lib, /resolvePlacementEventsDemo/);
  assert.match(lib, /source: "partial"/);
});

test("4 source badge keys cover live demo partial", () => {
  assert.equal(placementEventsTimelineSourceKey("live"), "safePersistence.liveApi");
  assert.equal(placementEventsTimelineSourceKey("demo"), "safePersistence.demoFallback");
  assert.equal(placementEventsTimelineSourceKey("partial"), "liveOperatingState.partialFallback");
});

test("5 timeline read-only without write actions", () => {
  const component = read("src/components/shared/placement-events-timeline.tsx");
  assert.doesNotMatch(component, /method:\s*["']POST["']/);
  assert.doesNotMatch(component, /postSafePersistence/);
  assert.doesNotMatch(component, /setInterval/);
});

test("6 source badge marker present", () => {
  const component = read("src/components/shared/placement-events-timeline.tsx");
  assert.match(component, /PLACEMENT_EVENTS_TIMELINE_MARKERS\.source/);
  assert.match(component, /PLACEMENT_EVENTS_TIMELINE_MARKERS\.safety/);
});

test("7 safety i18n without forbidden phrases", () => {
  const i18n = read("src/lib/i18n.ts");
  const section = i18n.split("placementEventsTimeline:")[1]?.split("boardPlacementEvidence:")[0] ?? "";
  for (const phrase of FORBIDDEN_COPY) {
    assert.ok(!section.toLowerCase().includes(phrase), `forbidden phrase: ${phrase}`);
  }
});

test("8 placement-events re-exports live loader", () => {
  const barrel = read("src/lib/placement-events.ts");
  assert.match(barrel, /placement-events-live/);
  assert.match(barrel, /PLACEMENT_EVENTS_TIMELINE_MARKERS/);
});

test("9 loadPlacementEventsTimeline is async function", () => {
  assert.equal(typeof loadPlacementEventsTimeline, "function");
});

test("10 npm script registered", () => {
  assert.match(read("package.json"), /test:placement-events-live-timeline/);
});
