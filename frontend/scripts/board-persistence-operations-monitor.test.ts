/** Board persistence operations monitor — static guards. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS,
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE,
  loadBoardOperatingState,
  resolveBoardPersistenceOperationsMonitor,
} from "../src/lib/board-persistence-operations-monitor";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/persistence-operations-monitor/page.tsx")));
});

test("2 route constant", () => {
  assert.equal(BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE, "/board/persistence-operations-monitor");
});

test("3 workspace loads board operating state and full spec sections", () => {
  const ws = readFileSync(join(root, "src/components/board/board-persistence-operations-monitor-workspace.tsx"), "utf8");
  assert.match(ws, /loadBoardOperatingState/);
  assert.match(ws, /loadPublicHealthSnapshot/);
  assert.match(ws, /BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS\.publicHealth/);
  assert.match(ws, /BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS\.alembic/);
  assert.match(ws, /BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS\.authSmoke/);
  assert.match(ws, /BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS\.endpointMatrix/);
  assert.match(ws, /BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS\.operationalSurfaces/);
  assert.match(ws, /BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS\.blockedCapabilities/);
  assert.match(ws, /BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS\.launch/);
});

test("4 loadBoardOperatingState returns recruiter and company", async () => {
  const state = await loadBoardOperatingState();
  assert.equal(state.recruiter.channels.length, 6);
  assert.equal(state.company.channels.length, 4);
});

test("5 monitor demo record has 9 endpoints and alembic 068", () => {
  const record = resolveBoardPersistenceOperationsMonitor();
  assert.equal(record.endpoints.length, 9);
  assert.equal(record.expectedAlembicHead, "068_placement_events_foundation");
  assert.match(record.alembicEvidence, /068_placement_events_foundation/);
  assert.equal(record.authSmoke.pass, 11);
  assert.equal(record.authSmoke.fail, 0);
  assert.equal(record.authSmoke.skip, 1);
  assert.ok(record.operationalSurfaces.length >= 8);
  assert.ok(record.blockedCapabilities.length >= 6);
});

test("6 production persistence status links to monitor", () => {
  const lib = readFileSync(join(root, "src/lib/production-persistence-status.ts"), "utf8");
  assert.match(lib, /persistence-operations-monitor/);
});

test("7 launch stance markers on monitor workspace", () => {
  const ws = readFileSync(join(root, "src/components/board/board-persistence-operations-monitor-workspace.tsx"), "utf8");
  assert.match(ws, /launchPublic/);
  assert.match(ws, /launchPhase3B/);
});
