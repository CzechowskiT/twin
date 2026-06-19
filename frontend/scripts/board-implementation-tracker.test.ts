/**
 * Board implementation tracker — route, markers, milestones, integrations.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BOARD_IMPLEMENTATION_TRACKER_FORBIDDEN_PATTERNS,
  BOARD_IMPLEMENTATION_TRACKER_MARKERS,
  BOARD_IMPLEMENTATION_TRACKER_ROUTE,
  boardImplementationTrackerHref,
} from "../src/lib/board-implementation-tracker";
import { getImplementationTrackerDemo } from "../src/lib/board-implementation-tracker-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const MILESTONE_KEYS = [
  "featurePersistentNotes",
  "featurePersistentTasks",
  "featureCandidateRoleStatus",
  "featureAuditEvent",
  "featureVisibilityPreference",
  "featureRecruiterQueuePersistence",
  "featureCompanyFeedbackPersistence",
  "featureReadOnlyExport",
  "featureRequestIntakeQueue",
  "featureEmailDraftApproval",
  "featureAtsImportReadonly",
] as const;

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/implementation-tracker/page.tsx")));
  assert.equal(boardImplementationTrackerHref(), BOARD_IMPLEMENTATION_TRACKER_ROUTE);
});

test("2 workspace renders 10 section markers on inner divs", () => {
  const ws = read("src/components/board/board-implementation-tracker-workspace.tsx");
  for (const key of [
    "header",
    "persistenceFeatures",
    "queueFeatures",
    "exportFeatures",
    "intakeFeatures",
    "emailFeatures",
    "atsFeatures",
    "dependencyMap",
    "ownerSummary",
    "blockedRegister",
  ] as const) {
    assert.match(ws, new RegExp(`BOARD_IMPLEMENTATION_TRACKER_MARKERS\\.${key}`));
  }
  assert.doesNotMatch(ws, /<Card[^>]*data-testid/);
});

test("3 demo includes all required milestone features", () => {
  const demo = getImplementationTrackerDemo();
  const names = new Set(demo.all_features.map((r) => r.name_key.replace("implementationTracker.", "")));
  for (const key of MILESTONE_KEYS) {
    assert.ok(names.has(key), `missing milestone ${key}`);
  }
});

test("4 feature rows include required columns", () => {
  const row = getImplementationTrackerDemo().all_features[0];
  assert.ok(row.name_key);
  assert.ok(row.state);
  assert.ok(row.next_key);
  assert.ok(row.dependency_key);
  assert.ok(row.boundary_key);
  assert.ok(row.owner);
  assert.ok(row.priority);
  assert.equal(typeof row.blocked, "boolean");
});

test("5 SOR registry includes board_implementation_tracker", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "board_implementation_tracker");
  assert.ok(entry);
  assert.equal(entry?.href, BOARD_IMPLEMENTATION_TRACKER_ROUTE);
});

test("6 founder demo journey includes implementation tracker", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /boardImplementationTrackerHref/);
  assert.match(routes, /id: "board_implementation_tracker"/);
});

test("7 executive product proof links implementation tracker", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /board_implementation_tracker/);
  assert.match(proof, /\/board\/implementation-tracker/);
});

test("8 i18n EN and PL namespaces exist", () => {
  assert.ok(en.implementationTracker.pageTitle);
  assert.ok(dictionaries.pl.implementationTracker.pageTitle);
  assert.match(en.implementationTracker.launchNoGo, /NO-GO/);
});

test("9 package.json exposes test script", () => {
  assert.match(read("package.json"), /test:board-implementation-tracker/);
});

test("10 docs file exists and no forbidden copy", () => {
  assert.ok(existsSync(join(root, "..", "docs/BOARD_IMPLEMENTATION_TRACKER_2026-06-19.md")));
  const ws = read("src/components/board/board-implementation-tracker-workspace.tsx");
  for (const pattern of BOARD_IMPLEMENTATION_TRACKER_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(ws, pattern);
  }
});

test("11 launch status includes P0 OPEN and Phase 3B BLOCKED", () => {
  const ws = read("src/components/board/board-implementation-tracker-workspace.tsx");
  assert.match(ws, /launchNoGo/);
  assert.match(ws, /p0Open/);
  assert.match(ws, /phase3bBlocked/);
});
