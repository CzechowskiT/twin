/** Board persistence operations monitor — static guards. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE,
  loadBoardOperatingState,
} from "../src/lib/board-persistence-operations-monitor";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/persistence-operations-monitor/page.tsx")));
});

test("2 route constant", () => {
  assert.equal(BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE, "/board/persistence-operations-monitor");
});

test("3 workspace loads board operating state", () => {
  const ws = readFileSync(join(root, "src/components/board/board-persistence-operations-monitor-workspace.tsx"), "utf8");
  assert.match(ws, /loadBoardOperatingState/);
});

test("4 loadBoardOperatingState returns recruiter and company", async () => {
  const state = await loadBoardOperatingState();
  assert.equal(state.recruiter.channels.length, 6);
  assert.equal(state.company.channels.length, 4);
});

test("5 production persistence status links to monitor", () => {
  const lib = readFileSync(join(root, "src/lib/production-persistence-status.ts"), "utf8");
  assert.match(lib, /persistence-operations-monitor/);
});
